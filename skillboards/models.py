import trueskill

from django.core.exceptions import ValidationError
from django.db import models
from django.db import transaction
from django.db.models import Case
from django.db.models import F
from django.db.models import Q
from django.db.models import When
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone

from skillboards import calculations as calc
from skillboards.calculations import calculate_updated_rankings


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

    def unlock_time(self, now=None):
        if now is None:
            now = timezone.now()

        try:
            return self.locks.filter(start__lte=now, end__gt=now).get().end
        except BoardLock.DoesNotExist:
            return None


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

    def enabled(self):
        return self.filter(disabled=False)


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

    disabled = models.BooleanField(default=False)

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
    time = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return (
            ' vs '.join(str(team) for team in self.teams.all()) +
            f' ({self.time}) ({self.board.name})'
        )

    def get_teams(self):
        self.full_clean()

        return [
            calc.Team(
                rank=team.rank,
                players={
                    player.username: calc.Player(rating=player.rating, instance=player)
                    for player in team.get_players()
                })
            for team in self.teams.all()
        ]

    @classmethod
    @transaction.atomic
    def create_game(cls, *, board, teams, time=None):
        game_instance = cls(board=board)
        game_instance.full_clean()
        game_instance.save()

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


def _update_ranking(board, env, game):
    teams = game.get_teams()
    results = calculate_updated_rankings(teams, env)

    for result_data in results.values():
        player_instance = result_data.instance
        player_instance.rating = result_data.rating
        player_instance.games = F('games') + 1
        if result_data.winner:
            player_instance.wins = F('wins') + 1
        else:
            player_instance.losses = F('losses') + 1
        player_instance.save()


@transaction.atomic
def update_all_rankings(board):
    # Reset all rankings
    Player.objects.filter(board=board).update(
        mu=board.mu,
        sigma=board.sigma,
        wins=0,
        games=0,
        losses=0
    )

    env = board.trueskill_environ()
    for game in Game.objects.order_by('time'):
        _update_ranking(board, env, game)


@transaction.atomic
def update_latest_ranking(board, game):
    env = board.trueskill_environ()
    _update_ranking(board, env, game)


@receiver(post_delete, sender=Game)
def update_rankings_on_delete(instance, **kwargs):
    update_all_rankings(instance.board)


class GameTeam(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='teams')
    rank = models.PositiveSmallIntegerField()

    def __str__(self):
        return ', '.join(p.player.username for p in self.players.all()) + f' (rank {self.rank})'

    def get_players(self):
        for gplayer in self.players.select_related('player'):
            yield gplayer.player


def validate_weight(value):
    if not 0 <= value <= 1:
        raise ValidationError(
            "Weight must be between 0 and 1, got %(value)s",
            params={"value": value}
        )


class GameTeamPlayer(models.Model):
    team = models.ForeignKey(GameTeam, on_delete=models.CASCADE, related_name='players')
    player = models.ForeignKey(Player, on_delete=models.PROTECT)
    weight = models.FloatField(validators=[validate_weight], default=1)

    class Meta:
        unique_together = index_together = ('team', 'player')
