import trueskill

from django.db import models
from django.db.models import Case
from django.db.models import F
from django.db.models import When

# Create your models here.


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


class PlayerManager(models.Manager):
    '''
    Add some extra stuff to players, like skill and is_provisional
    '''
    _skill_expression = F('mu') - (F('sigma') * (F('board__mu') / F('board__sigma')))
    _is_provisional_expression = Case(
        When(sigma__gt=7.5, then=True),
        default=False,
        output_field=models.BooleanField(),
    )

    def get_queryset(self):
        return super().get_queryset().annotate(
            skill=self._skill_expression,
            is_provisional=self._is_provisional_expression
        )


class Player(models.Model):
    username = models.SlugField(db_index=True)
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="players")

    print_name = models.CharField(max_length=255)

    mu = models.FloatField()
    sigma = models.FloatField()

    objects = PlayerManager()

    class Meta:
        unique_together = index_together = [
            ('username', 'board'),
        ]
        base_manager_name = default_manager_name = "objects"

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
