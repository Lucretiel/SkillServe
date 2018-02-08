import trueskill

from django.core.exceptions import ValidationError
from django.db import models
from django.db import transaction
from django.db.models import Q
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

from skillboards import calculations as calc


class Board(models.Model):
	name = models.SlugField(db_index=True, primary_key=True, blank=False, null=False)

	mu = models.FloatField(default=trueskill.MU)
	sigma = models.FloatField(default=trueskill.SIGMA)
	beta = models.FloatField(default=trueskill.BETA)
	tau = models.FloatField(default=trueskill.TAU)
	draw_probability = models.FloatField(default=trueskill.DRAW_PROBABILITY)

	max_teams = models.PositiveIntegerField(
		validators=[MinValueValidator(2)],
		default=2
	)

	max_players = models.PositiveIntegerField(
		validators=[MinValueValidator(1)],
		default=2
	)

	def __str__(self):
		return self.name

	def trueskill_environ(self):
		return trueskill.TrueSkill(
			mu=self.mu,
			sigma=self.sigma,
			beta=self.beta,
			tau=self.tau,
			draw_probability=self.draw_probability,
			backend='scipy'
		)

	def unlock_time(self, now=None):
		if now is None:
			now = timezone.now()

		try:
			return self.locks.filter(start__lte=now, end__gt=now).get().end
		except BoardLock.DoesNotExist:
			return None

	def delete(self, *args, **kwargs):
		self.games.all().delete()
		super().delete(*args, **kwargs)


class BoardLock(models.Model):
	board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='locks')

	start = models.DateTimeField(db_index=True)
	end = models.DateTimeField(db_index=True)

	def clean(self):
		super().clean()

		start = self.start
		end = self.end

		if start >= end:
			raise ValidationError({'end': "End must come after start"})

		neighbors = BoardLock.objects.filter(board=self.board).exclude(pk=self.pk)

		if neighbors.filter(
			Q(start__lte=start, end__gte=start) |
			Q(start__lte=end, end__gte=end) |
			Q(start__gte=start, end__lte=end)
		).exists():
			raise ValidationError('Locks must not overlap other locks')


class Player(models.Model):
	board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="players")
	name = models.CharField(max_length=255)

	mu = models.FloatField()
	sigma = models.FloatField()

	class Meta:
		index_together = unique_together = ('board', 'name')

	@classmethod
	def create(cls, *, name, board):
		return cls(
			name=name,
			board=board,
			mu=board.mu,
			sigma=board.sigma
		)

	def __str__(self):
		return "{name} (@{board})".format(
			name=self.name,
			board=self.board.name
		)

	def fill_default_rating(self):
		if self.mu is None:
			self.mu = self.board.mu

		if self.sigma is None:
			self.sigma = self.board.sigma

	def save(self, *args, **kwargs):
		self.fill_default_rating()
		super().save(*args, **kwargs)

	@property
	def rating(self):
		return trueskill.Rating(mu=self.mu, sigma=self.sigma)

	@rating.setter
	def rating(self, rating):
		self.mu, self.sigma = rating.mu, rating.sigma

	@property
	def skill(self):
		return self.mu - (self.sigma * 3)



class Game(models.Model):
	board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='games')
	time = models.DateTimeField(auto_now_add=True, db_index=True)

	def __str__(self):
		return (
			' vs '.join(str(team) for team in self.teams.all()) +
			f' ({self.time}) ({self.board.name})'
		)

	def fetch_teams(self):
		return self.teams.prefetch_related('players__player')

	@classmethod
	@transaction.atomic
	def create_game(cls, *, board, teams, time=None):
		# TODO: prevent game creation if there's a board lock
		game_instance = cls(board=board)
		game_instance.full_clean()
		game_instance.save()

		# TODO: bulk create
		for rank, players in teams:
			team_instance = GameTeam(game=game_instance, rank=rank)
			team_instance.full_clean()
			team_instance.save()

			for player, weight in players:
				player_instance = GameTeamPlayer(team=team_instance, player=player, weight=weight)
				player_instance.full_clean()
				player_instance.save()

		if time is None:
			update_latest_ranking(board=board, game=game_instance)
		else:
			game_instance.time = time
			game_instance.save()
			update_all_rankings(board)

		return game_instance


@receiver(post_delete, sender=Game)
def update_rankings_on_delete(instance, **kwargs):
	update_all_rankings(instance.board)


class GameTeam(models.Model):
	game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='teams')
	rank = models.PositiveSmallIntegerField()

	def __str__(self):
		return ', '.join(p.player.name for p in self.players.all()) + f' (rank {self.rank})'

	# TODO: do this as an annotation instead of a property
	@property
	def winner(self):
		return self.rank == self.game.teams.order_by('-rank').first().rank


def validate_weight(value):
	if not 0 <= value <= 1:
		raise ValidationError(
			"Weight must be between 0 and 1, got %(value)s",
			params={"value": value}
		)


class GameTeamPlayer(models.Model):
	team = models.ForeignKey(GameTeam, on_delete=models.CASCADE, related_name='players')
	player = models.ForeignKey(Player, on_delete=models.PROTECT)
	weight = models.FloatField(
		validators=[MinValueValidator(0), MaxValueValidator(1)],
		default=1
	)

	# TODO: do this as an annotation instead of a property. In the meantime,
	# be sure to select_related when querying GameTeamPlayer
	@property
	def rating(self):
		return self.player.rating

	class Meta:
		unique_together = index_together = ('team', 'player')


@transaction.atomic
def update_all_rankings(board):
	db_games = board.games.order_by('time').prefetch_related('teams__players')

	calc_games = ((
		calc.Team(
			rank=team.rank,
			players={gtp.player_id: gtp.weight for gtp in team.players.all()}
		) for team in game.teams.all()
	) for game in db_games)

	env = board.trueskill_environ()
	updated_ratings = calc.calculate_all_games(calc_games, env)
	new_rating = env.create_rating()

	for player in board.players.all().only():
		player.rating = updated_ratings.get(player.id, new_rating)
		player.save()


@transaction.atomic
def update_latest_ranking(board, game):
	# For now, we assume that the provided game is the latest game, without
	# checking first
	db_teams = game.teams.all().prefetch_related('players__player')

	calc_teams = (calc.Team(
		rank=team.rank,
		players={
			gtp.player: calc.RatedPlayer(
				weight=gtp.weight,
				rating=gtp.rating
			) for gtp in team.players.all()
		}
	) for team in db_teams)

	updated_ratings = calc.calculate_updated_rankings(calc_teams, board.trueskill_environ())

	for player_instance, rating in updated_ratings.items():
		player_instance.rating = rating
		player_instance.save()
