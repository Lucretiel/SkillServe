from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from skillboards import calculations as calc
from skillboards.models import Board
from skillboards.models import GameTeamPlayer
from skillboards.models import PartialGame
from skillboards.models import PartialGamePlayer
from skillboards.models import Player
from skillboards.models import create_game_from_teams
from skillboards.serializers import BoardSerializer
from skillboards.serializers import GameSerializer
from skillboards.serializers import PartialGameRequestSerializer
from skillboards.serializers import PartialGameSerializer
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
    board = get_object_or_404(Board, name=board_name)
    request_user = request.GET.get('as', None)
    players = Player.objects.filter(board=board_name).with_player_info()

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


class PartialGameView(APIView):
    @staticmethod
    def serialized_game(game):
        serializer = PartialGameSerializer(game)
        return Response(data=serializer.data)

    def get(self, request, board_name):
        board = get_object_or_404(Board, name=board_name)
        try:
            game = PartialGame.objects.get(board=board)
        except PartialGame.DoesNotExist:
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            return self.serialized_game(game)

    @transaction.atomic
    def post(self, request, board_name):
        partial_game_serializer = PartialGameRequestSerializer(data=request.data)
        if not partial_game_serializer.is_valid():
            return Response(partial_game_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        request_data = partial_game_serializer.data
        partial_game_id = request_data['partial_game_id']
        game_type = PartialGame.SOLO if request_data['game_type'] == 'solo' else PartialGame.TEAM
        winner = request_data['winner']
        username = request_data['username']

        # Check that the board exists
        try:
            board = Board.objects.select_related('partialgame').get(name=board_name)
        except Board.DoesNotExist:
            return Response({
                "error": "No such board",
                "board": board_name
            }, status=status.HTTP_404_NOT_FOUND)

        # Check that the board is not locked
        unlock_time = board.unlock_time()
        if unlock_time is not None:
            return Response({
                "error": "The board is currently locked",
                "board": board_name,
                "unlock_time": unlock_time
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check that the username exists
        try:
            player = board.players.get(username=username)
        except Player.DoesNotExist:
            return Response({
                "error": "No such username",
                "username": username
            }, status=status.HTTP_400_BAD_REQUEST)

        if partial_game_id is None:
            # Check that game isn't in progress
            try:
                game = board.partialgame
            except ObjectDoesNotExist:
                pass
            else:
                return Response({
                    "error": "PartialGame already in progress",
                    "id": game.id,
                }, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                game = PartialGame(board=board, game_type=game_type)
                game.full_clean()
                game.save()

                gamePlayer = PartialGamePlayer(game=game, player=player, winner=winner)
                gamePlayer.full_clean()
                gamePlayer.save()

            return self.serialized_game(game)
        else:
            try:
                game = board.partialgame
            except ObjectDoesNotExist:
                return Response({
                    "error": "no partial game in progress",
                }, status=status.HTTP_400_BAD_REQUEST)

            if game.id != partial_game_id:
                # TODO: cheat
                return Response({
                    "error": "partial game in progress doesn't match given game id",
                    "id": game.id
                }, status=status.HTTP_400_BAD_REQUEST)

            if game.game_type != game_type:
                return Response({
                    "error": "partial game in progress is a different type than given"
                }, status=status.HTTP_400_BAD_REQUEST)

            if game.player_info.filter(player=player).exists():
                return Response({
                    "error": "This player is already associated with this game"
                }, status=status.HTTP_400_BAD_REQUEST)

            max_category = 1 if game_type is PartialGame.SOLO else 2
            count = game.player_info.filter(winner=winner).count()

            if count == max_category:
                return Response({
                    "error": "This partial has maxed out that type of player",
                    "winner": winner,
                    "count": count
                }, status=status.HTTP_400_BAD_REQUEST)
            elif count > max_category:
                return Response({
                    "error": "There are too many players of this type. This is a server error.",
                    "winner": winner,
                    "count": count,
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            with transaction.atomic():
                gamePlayer = PartialGamePlayer(game=game, player=player, winner=winner)
                gamePlayer.full_clean()
                gamePlayer.save()

            # Attempt to process
            try:
                game_teams = game.get_teams()
            except PartialGame.NonFullGame:
                # TODO: response
                return self.serialized_game(game)

            trueskill_env = board.trueskill_environ()
            results = calc.calculate_updated_rankings(game_teams, trueskill_env)

            with transaction.atomic():
                for result_data in results.values():
                    player_instance = result_data.instance
                    player_instance.rating = result_data.rating
                    player_instance.games = F('games') + 1
                    if result_data.winner:
                        player_instance.wins = F('wins') + 1
                    else:
                        player_instance.losses = F('losses') + 1
                    player_instance.save()

                create_game_from_teams(game_teams, board)

                game.delete()
            # TODO: response
            return Response({})
