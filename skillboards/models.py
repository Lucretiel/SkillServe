import trueskill

from django.db import models
from django.db import transaction
from django.db.models import Case
from django.db.models import F
from django.db.models import When

from skillboards import calculations as calc


class Board(models.Model):
    name = models.SlugField(db_index=True, primary_key=True, blank=False, null=False)

    mu = models.FloatField(default=trueskill.MU)
    sigma = models.FloatField(default=trueskill.SIGMA)
    beta = models.FloatField(default=trueskill.BETA)
    tau = models.FloatField(default=trueskill.TAU)
    draw_probability = models.FloatField(default=trueskill.DRAW_PROBABILITY)

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

    @property
    def partial_game_id(self):
        '''This should only be used for serialization'''
        try:
            return PartialGame.objects.get(board=self).id
        except PartialGame.DoesNotExist:
            return None


class PlayerQuerySet(models.QuerySet):
    _skill_expression = F('mu') - (F('sigma') * (F('board__mu') / F('board__sigma')))
    _upper_skill_expression = F('mu') + (F('sigma') * (F('board__mu') / F('board__sigma')))
    _is_provisional_expression = Case(
        When(sigma__gt=7.5, then=True),
        default=False,
        output_field=models.BooleanField(),
    )

    def with_skill(self):
        return self.annotate(skill=self._skill_expression)

    def with_upper_skill(self):
        return self.annotate(upper_skill=self._upper_skill_expression)

    def with_provisional(self):
        return self.annotate(is_provisional=self._is_provisional_expression)

    def with_player_info(self):
        return self.with_skill().with_provisional().with_upper_skill()


class Player(models.Model):
    username = models.SlugField(db_index=True)
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="players")

    print_name = models.CharField(max_length=255)

    mu = models.FloatField()
    sigma = models.FloatField()

    games = models.PositiveIntegerField(default=0)
    wins = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)

    objects = PlayerQuerySet.as_manager()

    class Meta:
        default_manager_name = base_manager_name = "objects"
        unique_together = index_together = ('username', 'board')

    @classmethod
    def create(cls, *, username, print_name, board):
        return cls(
            username=username,
            print_name=print_name,
            board=board,
            mu=board.mu,
            sigma=board.sigma
        )

    def __str__(self):
        return "{name}@{board}".format(
            name=self.username,
            board=self.board.name
        )

    def fill_default_rank(self):
        if self.mu is None:
            self.mu = self.board.mu

        if self.sigma is None:
            self.sigma = self.board.sigma

    def save(self, *args, **kwargs):
        self.fill_default_rank()
        super().save(*args, **kwargs)

    @property
    def rating(self):
        return trueskill.Rating(mu=self.mu, sigma=self.sigma)

    @rating.setter
    def rating(self, rating):
        self.mu, self.sigma = rating.mu, rating.sigma


class Game(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE)
    time = models.DateTimeField(auto_now_add=True)


class GameTeam(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='teams')
    rank = models.PositiveSmallIntegerField()


class GameTeamPlayer(models.Model):
    team = models.ForeignKey(GameTeam, on_delete=models.CASCADE, related_name='players')
    player = models.ForeignKey(Player, on_delete=models.PROTECT)
    # TODO: store weight

    class Meta:
        unique_together = index_together = ('team', 'player')


# Crokinole Specific
class PartialGame(models.Model):
    SOLO = 1
    TEAM = 2
    GAME_TYPE_CHOICES = (
        (SOLO, "solo"),
        (TEAM, "team"),
    )

    board = models.OneToOneField(Board, on_delete=models.CASCADE)
    game_type = models.SmallIntegerField(choices=GAME_TYPE_CHOICES)
    time = models.DateTimeField(auto_now_add=True)

    class NonFullGame(Exception):
        pass

    def get_teams(self):
        self.full_clean()
        max_category = 1 if self.game_type is PartialGame.SOLO else 2
        # Count winners and losers
        for winner in True, False:
            count = self.player_info.filter(winner=winner).count()
            type = "winning" if winner else "losing"
            if count < max_category:
                raise PartialGame.NonFullGame(f"Not enough {type} players have entered yet!")
            elif count > max_category:
                raise Exception(f"Too many {type} players have entered!")

        def get_players(winner):
            for gplayer in self.player_info.select_related('player').filter(winner=winner):
                yield gplayer.player

        return [
            calc.Team(
                rank=0 if winner else 1,
                players={
                    player.username: calc.Player(rating=player.rating, instance=player)
                    for player in get_players(winner=winner)
                }
            )
            for winner in (True, False)
        ]

    def fingerprint(self):
        return hash((
            self.board.name,
            self.get_game_type_display(),
            frozenset(
                (player.player.username, player.winner) for player in self.player_info.all()
            )
        ))


class PartialGamePlayer(models.Model):
    game = models.ForeignKey(PartialGame, on_delete=models.CASCADE, related_name="player_info")
    player = models.ForeignKey(Player, on_delete=models.PROTECT)
    winner = models.BooleanField()

    class Meta:
        unique_together = index_together = ("game", "player")


@transaction.atomic
def create_game_from_teams(teams, board):
    game = Game(board=board)
    game.full_clean()
    game.save()

    for team in teams:
        team_instance = GameTeam(game=game, rank=team.rank)
        team_instance.full_clean()
        team_instance.save()
        for player in team.players.values():
            player_instance = GameTeamPlayer(
                team=team_instance,
                player=player.instance)
            player_instance.full_clean()
            player_instance.save()
