from collections import namedtuple, defaultdict


# Players should be a dict of player_key => RatedPlayer
class Team(namedtuple('Team', 'rank players')):
    __slots__ = ()

    def __new__(cls, *, rank, players):
        return super().__new__(
            cls,
            rank=rank,
            players=players)


class RatedPlayer(namedtuple('Player', 'rating weight')):
    __slots__ = ()

    def __new__(cls, *, rating, weight=1):
        return super().__new__(
            cls,
            rating=rating,
            weight=weight,
        )


# This function assumes that the data has been validated; no duplicate players, etc
# It returns Player instances with updated ranks
def calculate_updated_ratings(*, teams, env):
    '''
    Calculate updated rankings for a single game. Teams should be an iterable
    of Team instances. For each team, the rank is where they ranked in the
    outcome of the game (lower means better), and players is a mapping of
    {player_key: player_info}. Each player_info should be a RatedPlayer, which
    stores the prior rating and the weight of that player to the game. For
    instance, if a player only participated in half a game, the weight should
    be 0.5.

    Returns a mapping of {player_key: new_rating}
    '''
    teams = list(teams)

    teams_to_evaluate = [
        {player_key: player.rating for player_key, player in team.players.items()}
        for team in teams
    ]

    ranks_to_evaluate = [team.rank for team in teams]

    weights_to_evaluate = {
        (team_index, player_key): player.weight
        for team_index, team in enumerate(teams)
        for player_key, player in team.players.items()
    }

    results = env.rate(
        teams_to_evaluate,
        ranks_to_evaluate,
        weights_to_evaluate
    )

    return {
        player_key: new_rating
        for team in results
        for player_key, new_rating in team.items()
    }
