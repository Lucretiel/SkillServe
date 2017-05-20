from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from skillboards.models import Board
from skillboards.models import Player
from skillboards.serializers import BoardSerializer
from skillboards.serializers import GameSerializer
from skillboards.serializers import PlayerRegisterSerializer
from skillboards.serializers import PlayerSerializer


@api_view()
def poke(request):
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view()
def board_detail(request, board_name):
    board = get_object_or_404(Board, name=board_name)
    serializer = BoardSerializer(board)
    return Response(serializer.data)


@api_view()
def player_list(request, board_name):
    if not Board.objects.filter(name=board_name).exists():
        return Response(status=status.HTTP_404_NOT_FOUND)

    serializer = PlayerSerializer(
        Player.objects.filter(board=board_name),
        many=True
    )

    return Response(serializer.data)


@api_view()
def player_detail(request, board_name, username):
    player = get_object_or_404(
        Player.objects.filter(username=username, board__name=board_name)
    )

    serializer = PlayerSerializer(player)
    return Response(serializer.data)


@api_view(["POST"])
@transaction.atomic
def register(request, board_name):
    register_serializer = PlayerRegisterSerializer(data=request.data)
    if not register_serializer.is_valid():
        return Response(register_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    username = register_serializer.data['username']
    print_name = register_serializer.data['print_name']

    board = get_object_or_404(Board.objects.only('mu', 'sigma'), name=board_name)

    try:
        player = board.players.get(username=username)

    except Player.DoesNotExist:
        # Player doesn't exist; create a new one
        if not print_name:
            return Response({
                'print_name': "Player doesn't exist; must provide print_name"
            }, status=status.HTTP_400_BAD_REQUEST)

        player = Player.create(
            username=username,
            print_name=print_name,
            board=board
        )
        player.full_clean()
        player.save()

        # Re-fetch to get annotation fields
        player = Player.objects.get(username=username)

        code = status.HTTP_201_CREATED

    else:
        # Player already exists; update the print_name if given
        if print_name and player.print_name != print_name:
            player.print_name = print_name
            player.full_clean()
            player.save()

        code = status.HTTP_200_OK

    player_serializer = PlayerSerializer(player)
    return Response(player_serializer.data, status=code)


@api_view(["POST"])
@transaction.atomic
def game(request, board_name):
    game_serializer = GameSerializer(data=request.data)
    if not game_serializer.is_valid():
        return Response(game_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    teams = game_serializer.data['teams']

    # Normally I would do a comprehension, but we have to check for duplicates
    player_teams = {}

    for team_index, team in enumerate(teams):
        for player in team['players']:
            player_name = player['username']
            old_index = player_teams.setdefault(player_name, team_index)
            if old_index != team_index:
                return Response({
                    "error": "a player is on multiple teams",
                    "player": player_name,
                    "teams": [old_index, team_index]
                }, status=status.HTTP_400_BAD_REQUEST)

    board = get_object_or_404(Board, name=board_name)

    player_instances = {
        player.username: player for player in
        board.players.filter(username__in=player_teams.keys())
    }

    old_ratings = {name: player.skill for name, player in player_instances.items()}

    missing_players = player_teams.keys() - player_instances.keys()
    if missing_players:
        return Response({
            "error": "1 or more players don't exist",
            "players": list(missing_players)
        }, status=status.HTTP_400_BAD_REQUEST)

    trueskill_env = board.trueskill_environ()

    teams_to_evaluate = [
        {player['username']: player_instances[player['username']].rating
         for player in team['players']}
        for team in teams
    ]

    ranks_to_evaluate = [
        team['rank'] for team in teams
    ]

    weights_to_evaluate = {
        (team_index, player['username']): player['weight']
        for team_index, team in enumerate(teams)
        for player in team['players']
    }

    results = trueskill_env.rate(
        teams_to_evaluate,
        ranks_to_evaluate,
        weights_to_evaluate
    )

    new_ratings = {}

    # TODO: is there a better way to do this than a loop in Python?
    for player_name, instance in player_instances.items():
        rating = results[player_teams[player_name]][player_name]
        instance.rating = rating
        instance.save()
        new_ratings[player_name] = trueskill_env.expose(rating)

    return Response({
        "new_ratings": new_ratings,
        "old_ratings": old_ratings,
    })
