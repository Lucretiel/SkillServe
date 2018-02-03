import re

import graphene

from skillboards import models
from skillboards.graphql import query


class PlayerExistsError(Exception):
	pass


class InvalidUsernameError(Exception):
	pass


slug_pattern = re.compile(r'^[a-zA-Z0-9_-]+$')


class CreatePlayer(graphene.Mutation):
	class Arguments:
		name = graphene.String(required=True)
		board_name = graphene.String(required=True)

	Output = query.Player

	def mutate(root, info, board_name, name):
		board = models.Board.objects.only('mu', 'sigma').get(board_name)
		player_query = models.Player.objects.filter(board=board, name=name)
		if player_query.count() > 0:
			msg = f"Player with name '{name}' in board '{board_name}' already exists"
			raise PlayerExistsError(msg)

		player = models.Player.create(
			name=name,
			board=board
		)
		player.full_clean()
		player.save()

		return player


# TODO: redo this when we add authentication w/ passwords

class RenamePlayer(graphene.Mutation):
	class Arguments:
		id = graphene.Int(required=True)
		name = graphene.String(required=True)

	Output = query.Player

	def mutate(root, info, id, name):
		player = models.Player.objects.get(id=id)
		player.name = name
		player.full_clean()
		player.save()
		return player


class PlayerInput(graphene.InputObjectType):
	id = graphene.Int(required=True)
	weight = graphene.Float(default_value=1)


class TeamInput(graphene.InputObjectType):
	players = graphene.List(graphene.NonNull(PlayerInput), required=True)
	rank = graphene.Int(required=True)


class PublishGame(graphene.Mutation):
	class Arguments:
		time = graphene.types.datetime.DateTime()
		teams = graphene.List(graphene.NonNull(TeamInput), required=True)
		board_name = graphene.String(required=True)

	Output = query.Game

	def mutate(root, info, teams, board_name, time=None):
		board = models.Board.objects.get(name=board_name)
		teams = ((
			team.rank,
			((
				board.players.get(id=player.id),
				player.weight,
			) for player in team.players),
		) for team in teams)

		return models.Game.create_game(board=board, teams=teams, time=time)


class Mutation(graphene.ObjectType):
	create_player = CreatePlayer.Field()
	rename_player = RenamePlayer.Field()
	publish_game = PublishGame.Field()
