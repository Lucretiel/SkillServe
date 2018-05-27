from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from skillboards.models import Board
from skillboards.models import Game
from skillboards.models import GameTeamPlayer
from skillboards.models import Player
from skillboards.serializers import BoardSerializer
from skillboards.serializers import GameSerializer
from skillboards.serializers import PlayerRegisterSerializer
from skillboards.serializers import PlayerSerializer


@api_view()
def poke(request):
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view()
def board_list(request):
    boards = Board.objects.all()
    serializer = BoardSerializer(boards, many=True)
    return Response(serializer.data)


@api_view()
def board_detail(request, board_name):
    board = get_object_or_404(Board, name=board_name)
    serializer = BoardSerializer(board)
    return Response(serializer.data)


@api_view()
def player_list(request, board_name):
    board = get_object_or_404(Board, name=board_name)
    request_user = request.GET.get('as', None)
    players = Player.objects.filter(board=board_name).with_player_info().enabled()

    if request_user is not None:
        players = list(players)
        trueskill_env = board.trueskill_environ()

        for player in players:
            if player.username == request_user:
                self_rating = player.rating
                break

        for player in players:
            player.quality = trueskill_env.quality_1vs1(player.rating, self_rating)

    serializer = PlayerSerializer(players, many=True)

    return Response(serializer.data)


@api_view()
def player_detail(request, board_name, username):
    player = get_object_or_404(
        Player.objects
        .filter(username=username, board=board_name)
        .with_player_info()
    )

    serializer = PlayerSerializer(player)
    return Response(serializer.data)


@api_view()
def player_recent_game(request, board_name, username):
    player = get_object_or_404(
        Player.objects
        .filter(username=username, board=board_name))

    try:
        game = (
            GameTeamPlayer.objects
            .filter(player=player)
            .latest('team__game__time')
            .team.game
        )
    except GameTeamPlayer.DoesNotExist:
        return Response(status=status.HTTP_204_NO_CONTENT)
    else:
        serializer = GameSerializer(game)
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
        player = board.players.with_player_info().get(username=username)

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
        player = board.players.with_player_info().get(username=username)

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


# TODO: add board locks
@api_view(["POST"])
@transaction.atomic
def game(request, board_name):
    serializer = GameSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    request_data = serializer.data

    board = get_object_or_404(Board, name=board_name)

    teams = (
        (
            team['rank'],
            ((
                board.players.get(username=player['username']),
                player['weight'],
            ) for player in team['players'])
        ) for team in request_data['teams'])

    Game.create_game(board=board, teams=teams, time=request_data['time'])

    return Response(status=status.HTTP_204_NO_CONTENT)
