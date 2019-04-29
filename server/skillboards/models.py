from collections import defaultdict

from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator
from django.core.validators import MinValueValidator
from django.db import models
from django.db import transaction
from django.db.models import F
from django.db.models import Min
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models.functions import Coalesce
from django.db.models.signals import pre_delete
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

import trueskill

from skillboards import calculations as calc

# TODO: definitely move this to a different file
def rank_by(things, *, key):
	'''
	Create a normalzied ranking for an ordered list of things.

	This generator is very similar to `enumerate`. However, each thing that
	has the same `key` will have the same index.
	'''
	prev_key = object()  # sentinel value
	prev_rank = None

	for (rank, thing) in enumerate(things):
		current_key = key(thing)
		if current_key != prev_key:
			prev_key = current_key
			prev_rank = rank

		yield (prev_rank, thing)


class Player(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE)

	def __str__(self):
		return str(self.user)

	def get_rating_on_board(self, board):
		return PlayerBoardMembership.objects.filter(player=self, board=board).get().rating


class Board(models.Model):
	# Basic info
	display_name = models.TextField()
	players = models.ManyToManyField(Player, related_name='boards', through='PlayerBoardMembership')

	def __str__(self):
		return self.display_name

	# Game info
	min_teams = models.PositiveIntegerField(
		validators=[MinValueValidator(2, message=_("Games must have at least 2 teams"))],
		default=2
	)

	max_teams = models.PositiveIntegerField(
		null=True,
		validators=[MinValueValidator(2, message=_("Games must have at least 2 teams"))],
	)

	min_players_per_team = models.PositiveIntegerField(
		validators=[MinValueValidator(1, message=_("Games must have at least 1 player per team"))],
		default=1,
	)

	max_players_per_team = models.PositiveIntegerField(
		null=True,
		validators=[MinValueValidator(1, message=_("Games must have at least 1 player per team"))],
	)

	# Trueskill statistics
	mu = models.FloatField(default=trueskill.MU)
	sigma = models.FloatField(default=trueskill.SIGMA)

	beta = models.FloatField(default=trueskill.BETA)
	tau = models.FloatField(default=trueskill.TAU)
	draw_probability = models.FloatField(default=trueskill.DRAW_PROBABILITY,
		validators=[
			MaxValueValidator(1, message=_("Draw probability must be at most 1.0")),
			MinValueValidator(0, message=_("Draw probability must be at least 0.0")),
		]
	)

	class Meta:
		constraints = [
			models.CheckConstraint(
				name='draw_probability_unit_interval',
				check=models.Q(
					draw_probability__gte=0,
					draw_probability__lte=1,
				)
			),
			models.CheckConstraint(
				name='team_player_counts',
				check=models.Q(
					min_teams__gte=2,
					max_teams__gte=2,
					min_players_per_team__gte=1,
					max_players_per_team__gte=1,
				),
			),
		]

	def default_rating(self):
		return trueskill.Rating(mu=self.mu, sigma=self.sigma)

	def trueskill_environ(self):
		return trueskill.TrueSkill(
			mu=self.mu,
			sigma=self.sigma,
			beta=self.beta,
			tau=self.tau,
			draw_probability=self.draw_probability,
			backend='scipy'
		)

	def create_game(self, *, teams, timestamp=None):
		'''
		Create a new game on this board. teams should be an iterable of (rank, players)
		pairs, and players should be an iterable of (weight, player) pairs. Each player
		should be a Player instance.
		'''

		# Unroll the teams and players
		teams = [(rank, list(players)) for rank, players in teams]

		# Sort by rank for later normalizing
		teams.sort(key=lambda team: team[0])

		# Validate number of teams
		if len(teams) < self.min_teams:
			raise ValidationError(
				_("Games on this board must have at least %(min)s teams"),
				params={'min': self.min_teams},
				code='min_teams'
			)

		if self.max_teams is not None and len(teams) > self.max_teams:
			raise ValidationError(
				_("Games on this board must have at most %(max)s teams"),
				params={'max': self.max_teams},
				code='max_teams'
			)

		# Validate player counts
		for rank, players in teams:
			if len(players) < self.min_players_per_team:
				raise ValidationError(
					_("Teams on this board must have at least %(min)s players"),
					params={'min': self.min_players_per_team},
					code='min_players'
				)

			if self.max_players_per_team is not None and len(players) > self.max_players_per_team:
				raise ValidationError(
					_("Teams on this board must have at most %(max)s players"),
					params={'max': self.max_players_per_team},
					code='max_players'
				)

		# Validate no draws
		if self.draw_probability == 0:
			all_ranks = {rank for (rank, players) in teams}
			if len(all_ranks) < len(teams):
				raise ValidationError(
					_("No ties are allowed on this board"),
					code='no_ties'
				)

		# Create the game, teams, and teamplayers. Ranks are only ever relative, so
		# we sort and normalize to a 0 index

		timestamp = timestamp if timestamp is not None else timezone.now()
		with transaction.atomic():
			game = Game(board=self, timestamp=timestamp, dirty=True)
			game.full_clean()
			game.save()

			for normalized_rank, (rank, players) in rank_by(teams, key=lambda team: team[0]):
				team = GameTeam(game=game, rank=normalized_rank)
				team.full_clean()
				team.save()

				for weight, player in players:
					gtp = GameTeamPlayer(player=player, team=team, weight=weight)
					gtp.full_clean()
					gtp.save()

		game.recalculate()
		return game


class PlayerBoardMembership(models.Model):
	player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='board_memberships')
	board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='player_memberships')

	def __str__(self):
		return f"{self.player} membership in {self.board}"

	def get_gtps(self):
		'''
		Return a queryset of all of the GameTeamPlayers for this membership
		'''
		return GameTeamPlayer.objects.filter(player=self.player, team__game__board=self.board)

	# TODO: create custom queryset to annotate these values
	@property
	def dirty(self):
		return self.get_gtps().filter(team__game__dirty=True).exists()

	@property
	def rating(self):
		try:
			return self.get_gtps().only('mu', 'sigma').latest("team__game__timestamp").rating
		except GameTeamPlayer.DoesNotExist:
			return self.board.default_rating()

	class Meta:
		constraints = [
			models.UniqueConstraint(
				name='unique_player_per_board',
				fields=['player', 'board'],
			),
		]


class Game(models.Model):
	board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='games')
	timestamp = models.DateTimeField(db_index=True)
	dirty = models.BooleanField(default=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(name='unique_game_per_timestamp', fields=['timestamp', 'board'])
		]

	@transaction.atomic
	def recalculate(self):
		'''
		Recalculate the stats for its players.

		This function performs the following steps:
		- if the game is not dirty, do nothing
		- if the game's dependencies are dirty, do nothing
		- recalculate the game's player's ratings
		- tag all dependent games as dirty if the rating changed

		TODO: throw an exception if we decided not to do any calculating for one of
		those reasons

		TODO: This function operates on a single game to allow for more flexible
		database pressure (it can (ostensibly) be handled by background workers
		in parallel). However, it may be more efficient to also be able to recursively
		update descendant dirtied games at the same time, since we already know their
		dependency sets and don't have to repeat queries.
		'''

		if not self.dirty:
			return

		timestamp = self.timestamp

		# Build up the team => player => ranking map that will be used for calc
		teams = defaultdict(dict)

		prior_gtp_queryset = (GameTeamPlayer.objects
			.filter(
				player=OuterRef('player'),
				team__game__timestamp__lt=timestamp
			)
			.order_by('-team__game__timestamp')
			[:1]
		)

		subsequent_gtp_queryset = (GameTeamPlayer.objects
			.filter(
				player=OuterRef('player'),
				team__game__timestamp__gt=timestamp,
			)
			.order_by('team__game__timestamp')
			.select_related('team__game')
			[:1]
		)

		# Fetch all of this game's GTPs, as well as the relevant subseqent games
		# (to flag them as dirty) and previous games (as calcuation dependencies)
		game_team_players = (GameTeamPlayer.objects
			.filter(team__game=self)
			.select_related('team')
			.annotate(
				previous_dirty=Subquery(prior_gtp_queryset.select_related('team__game').values('team__game__dirty')),
				previous_mu=Subquery(prior_gtp_queryset.values('mu')),
				previous_sigma=Subquery(prior_gtp_queryset.values('sigma')),
				subsequent_game_key=Subquery(subsequent_gtp_queryset.values('team__game')),
			)
		)

		for gtp in game_team_players:
			if gtp.previous_dirty is None:
				# Use the default rating for this player, since they don't currently
				# have a rating
				teams[gtp.team][gtp] = calc.RatedPlayer(
					weight=gtp.weight,
					rating=self.board.default_rating()
				)
			else:
				if gtp.previous_dirty:
					return

				teams[gtp.team][gtp] = calc.RatedPlayer(
					weight=gtp.weight,
					rating=trueskill.Rating(
						mu=gtp.previous_mu,
						sigma=gtp.previous_sigma
					)
				)


		calc_teams = (calc.Team(
			rank=team.rank,
			players=players
		) for team, players in teams.items())

		updated_ratings = calc.calculate_updated_ratings(
			teams=calc_teams,
			env=self.board.trueskill_environ()
		)

		updated_gtps = []
		updated_games = []

		for gtp, updated_rating in updated_ratings.items():
			if gtp.rating is None or gtp.rating != updated_rating:
				gtp.rating = updated_rating
				updated_gtps.append(gtp)

				subsequent_game_key = gtp.subsequent_game_key
				if subsequent_game_key is not None:
					subsequent_game = Game(pk=subsequent_game_key, dirty=True)
					updated_games.append(subsequent_game)

		self.dirty = False
		updated_games.append(self)

		GameTeamPlayer.objects.bulk_update(updated_gtps, ['mu', 'sigma'])
		Game.objects.bulk_update(updated_games, ['dirty'])


class GameTeam(models.Model):
	game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='teams')
	rank = models.PositiveSmallIntegerField()


class GameTeamPlayer(models.Model):
	# TODO: always prefetch_related the team and game
	team = models.ForeignKey(GameTeam, on_delete=models.CASCADE, related_name='players')
	player = models.ForeignKey(Player, on_delete=models.PROTECT, related_name='game_links')

	weight = models.FloatField(default=1)

	# These values refer to the post-game ratings. In this way, a player's rating
	# is always that of their most recent GameTeamPlayer.
	mu = models.FloatField(null=True, default=None, blank=True)
	sigma = models.FloatField(null=True, default=None, blank=True)

	@property
	def game(self):
		return self.team.game

	@property
	def dirty(self):
		return self.team.game.dirty

	@property
	def rating(self):
		mu = self.mu
		sigma = self.sigma

		if mu is None or sigma is None:
			return None

		return trueskill.Rating(mu=self.mu, sigma=sigma)

	@rating.setter
	def rating(self, rating):
		self.mu = rating.mu
		self.sigma = rating.sigma


	def clean(self):
		# TODO: does this do as many sequential queries as it seems to? Fix if so
		if not (PlayerBoardMembership.objects
			.filter(player=self.player, board=self.team.game.board)
			.exists()
		):
			raise ValidationError(
				_("Player %(player)s is not a member of %(board)s"),
				params = {
					'player': self.player,
					'board': self.board,
				},
				code='player_not_on_board'
			)

		if self.mu is None or self.sigma is None:
			if not self.team.game.dirty:
				raise ValidationError(
					_("Cannot have a null mu or sigma on a non-dirty game"),
					code='bad_null_rating'
				)

	class Meta:
		constraints = [
			models.CheckConstraint(
				name='weight_unit_interval',
				check=Q(weight__gte=0, weight__lte=1),
			),
			models.UniqueConstraint(
				name='unique_player_per_team',
				fields=['player', 'team'],
			),
		]
