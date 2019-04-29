from datetime import timedelta

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

import trueskill

from skillboards.models import Board
from skillboards.models import Game
from skillboards.models import Player
from skillboards.models import PlayerBoardMembership

# Create your tests here.
class BoardTests(TestCase):
	def test_basic_board(self):
		board = Board.objects.create(display_name="Test Board")

	def test_high_draw_violation(self):
		with self.assertRaisesMessage(IntegrityError, "draw_probability"):
			Board.objects.create(
				display_name="Test Board: Mega Draw",
				draw_probability=1.5
			)

	def test_low_draw_violation(self):
		with self.assertRaisesMessage(IntegrityError, "draw_probability"):
			Board.objects.create(
				display_name="Test Board: Negative Draw",
				draw_probability=-1
			)

	def test_no_draws_acceptable(self):
		Board.objects.create(
			display_name="Test Board: No draw",
			draw_probability=0
		)

# We don't have a lot of easy ability to test that our math is correct, so mostly
# these tests are about

# TestCase with basic board setup: board1 and board2, along with player1,
# player2, player3, board1_player, and board2_player.
#
# Board 2 has a 0 draw probability; otherwise all the defaults are used.
class BasicBoards(TestCase):
	@classmethod
	def setUpTestData(cls):
		super().setUpTestData()

		for player_name in ['player1', 'player2', 'player3', 'player4', 'board1_player', 'board2_player']:
			user = User.objects.create_user(username=player_name)
			player = Player.objects.create(user=user)
			setattr(cls, player_name, player)

		cls.board1 = Board.objects.create(display_name="Board 1")
		cls.board2 = Board.objects.create(display_name="Board 2", draw_probability=0)

		cls.board1.players.add(cls.player1, cls.player2, cls.player3, cls.player4, cls.board1_player)
		cls.board2.players.add(cls.player1, cls.player2, cls.player3, cls.player4, cls.board2_player)

		cls.p1_v_p2 = simple_game(cls.player1, cls.player2)
		cls.p3_v_p4 = simple_game(cls.player3, cls.player4)

	def setUp(self):
		self.times = timeseq()

def simple_game(winner, loser):
	return [
		(0, [(1, winner)]),
		(1, [(1, loser)]),
	]

def timeseq(*, start=None, interval=timedelta(days=1)):
	'''
	Generate timestamps in a sequence
	'''
	if start is None:
		start = timezone.now()

	while True:
		yield start
		start += interval


class GameTests(BasicBoards):
	def test_game_sequence(self):
		# Simple games: player1 beats player2, then player2 beats player1

		game1 = self.p1_v_p2
		self.board1.create_game(teams=game1, timestamp=next(self.times))

		game2 = simple_game(self.player2, self.player1)
		self.board1.create_game(teams=game2, timestamp=next(self.times))

		self.assertFalse(Game.objects.filter(dirty=True).exists())
		# TODO: check post-game rating

	def test_simultaneous_game_rejected(self):
		game = self.p1_v_p2
		now = next(self.times)

		self.board1.create_game(teams=game, timestamp=now)

		with self.assertRaisesMessage(ValidationError, "Game with this Timestamp and Board already exists"):
			self.board1.create_game(teams=game, timestamp=now)

	def test_game_dirtying(self):
		game = self.p1_v_p2

		insert_time = next(self.times)
		now_game = self.board1.create_game(teams=game, timestamp=next(self.times))

		self.board1.create_game(teams=game, timestamp=insert_time)

		now_game.refresh_from_db()
		self.assertTrue(now_game.dirty)

	def test_unrelated_game_not_dirtied(self):
		'''
		Test that earlier games are not dirtied, nor are later games with unrelated players
		'''

		game1 = self.board1.create_game(
			teams=self.p1_v_p2,
			timestamp=next(self.times)
		)
		game2 = self.board1.create_game(
			teams=self.p3_v_p4,
			timestamp=next(self.times)
		)

		insert_time = next(self.times)

		game3 = self.board1.create_game(
			teams=self.p3_v_p4,
			timestamp=next(self.times)
		)

		self.board1.create_game(
			teams=self.p1_v_p2,
			timestamp=insert_time
		)

		for game in (game1, game2, game3):
			game.refresh_from_db()
			self.assertFalse(game.dirty)

	def test_dirty_chain(self):
		'''
		Test that recalculating games dirties subsequent games
		'''

		insert_time = next(self.times)

		game2 = self.board1.create_game(
			teams=self.p1_v_p2,
			timestamp=next(self.times)
		)

		game3 = self.board1.create_game(
			teams=self.p1_v_p2,
			timestamp=next(self.times)
		)

		game4 = self.board1.create_game(
			teams=self.p1_v_p2,
			timestamp=next(self.times)
		)

		game1 = self.board1.create_game(
			teams=self.p1_v_p2,
			timestamp=insert_time,
		)

		game_set_checks = [
			(game2, [game3, game4]),
			(game3, [game4]),
			(game4, []),
		]

		for dirty_game, clean_games in game_set_checks:
			dirty_game.refresh_from_db()
			self.assertTrue(dirty_game.dirty)
			for clean_game in clean_games:
				clean_game.refresh_from_db()
				self.assertFalse(clean_game.dirty)

			dirty_game.recalculate()




