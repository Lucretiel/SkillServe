from collections import namedtuple, defaultdict


# Players should be a dict of player_key => player info
class Team(namedtuple('Team', 'rank players')):
    __slots__ = ()
    pass


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
def calculate_updated_rankings(teams, env):
    '''
    Calculate updated rankings for a single game. Teams should be an iterable
    of Team instances. For each team, the rank is where they ranked in the
    outcome of the game (lower means better), and players is a mapping of
    {player_key: player_info}. Each player_info should be a RatedPlayer, which
    stores the prior rating and the weight of that player to the game. For
    instance, if a player only participated in half a game, the weight should
    be 0.5.
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


def progressive_calculate_all_games(games, env):
    '''
    Each game should just be an iterable of calculations.Teams instances.
    The players on each team should be a mapping of {player_key: weight}.
    The updated rankings of the relevant players are yielded after each game
    '''

    player_ratings = defaultdict(env.create_rating)
    for game in games:
        calc_teams = (Team(
            rank=team.rank,
            players={
                player_key: RatedPlayer(
                    rating=player_ratings[player_key],
                    weight=player_weight
                ) for player_key, player_weight in team.players.items()
            }
        ) for team in game)

        results = calculate_updated_rankings(calc_teams, env)
        yield results
        player_ratings.update(results)


def calculate_all_games(games, env):
    '''
    Each game should just be an iterable of calculations.Teams instances.
    The players on each team should be a mapping of {player_key: weight}.
    The return value is a dict of {player_key: final_rating} for all players
    '''
    return {
        key: rating
        for update in progressive_calculate_all_games(games, env)
        for key, rating in update.items()
    }


def skill(rating, env=None):
    return env.expose(rating) if env is not None else rating.mu - 3 * (rating.sigma)
