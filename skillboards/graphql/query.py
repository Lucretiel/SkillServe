import functools
import graphene
import graphene.types.datetime as graphene_dt

from skillboards import models, calculations as calc


# TODO: optimize queries based on the request. For now, we just do a best guess
# and a lot of prefetch_related, best on which field you asked for.


def unroll(container=list):
	def unroll_decorator(func):
		@functools.wraps(func)
		def unroll_wrapper(*args, **kwargs):
			return container(func(*args, **kwargs))
		return unroll_wrapper
	return unroll_decorator


class Board(graphene.ObjectType):
	name = graphene.String()
	players = graphene.List(lambda: Player)
	games = graphene.List(lambda: Game)
	player = graphene.Field(lambda: Player, id=graphene.Int())

	def resolve_players(root, info):
		return root.players.all()

	def resolve_games(root, info):
		return root.games.prefetch_related('teams__players__player')

	def resolve_player(root, info, id):
		# TODO(Lucretiel): Test the prefetch here
		return (
			root.players
			.prefetch_related('gameteamplayer_set__team__game__teams__players__player')
			.get(id=id)
		)


class Rating(graphene.ObjectType):
	mu = graphene.Float()
	sigma = graphene.Float()
	skill = graphene.Float()

	def resolve_skill(self, info):
		return calc.skill(self)


class Player(graphene.ObjectType):
	id = graphene.Int()
	name = graphene.String()

	rating = graphene.Field(Rating)

	board = graphene.Field(Board)
	games = graphene.List(lambda: Game, recent_count=graphene.Int())

	def resolve_games(root, info, recent_count=None):
		query = (
			models.Game.objects
			.filter(teams__players__player=root)
			.order_by('-time')
			.prefetch_related('teams__players__player')
		)

		if recent_count is not None:
			if recent_count < 0:
				raise Exception("recent count must be positive")

			query = query[0:recent_count]

		return query


class Game(graphene.ObjectType):
	board = graphene.Field(Board)
	time = graphene_dt.DateTime()

	teams = graphene.List(lambda: GameTeam)

	def resolve_teams(root, info):
		return (
			root.teams
			.prefetch_related('players__player')
		)


class GameTeam(graphene.ObjectType):
	game = graphene.Field(Game)
	rank = graphene.Int()

	players = graphene.List(lambda: GameTeamPlayer)

	@unroll(list)
	def resolve_players(root, info):
		# Quick note: yes, this is a hack. This function returns
		# models.Player instances that have just had the team and weight
		# attached as attributes.
		gtp_instances = root.players.select_related('player')

		for gtp in gtp_instances:
			player = gtp.player
			player.team = gtp.team
			player.weight = gtp.weight
			yield player


class GameTeamPlayer(Player):
	team = graphene.Field(GameTeam)
	weight = graphene.Float()


class Query(graphene.ObjectType):
	board = graphene.Field(Board, name=graphene.String(required=True))
	player = graphene.Field(Player, id=graphene.Int(required=True))

	def resolve_board(self, info, name):
		return models.Board.objects.get(name=name)

	def resolve_player(self, info, id):
		return models.Player.objects.get(id=id)
