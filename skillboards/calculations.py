from collections import namedtuple


# Players should be a dict of player_name => player info
class Team(namedtuple('Team', 'rank players')):
    __slots__ = ()
    pass


class Player(namedtuple('Player', 'rating weight instance')):
    __slots__ = ()

    def __new__(cls, *, rating, instance, weight=1):
        return super().__new__(cls, rating=rating, weight=weight, instance=instance)


class PlayerResult(namedtuple('PlayerResult', 'rating instance winner')):
    __slots__ = ()


# This function assumes that the data has been validated; no duplicate players, etc
# It also assumes no duplicate players
# It returns Player instances with updated ranks
def calculate_updated_rankings(teams, env):
    teams_to_evaluate = [
        {player_name: player.rating for player_name, player in team.players.items()}
        for team in teams
    ]

    ranks_to_evaluate = [team.rank for team in teams]

    weights_to_evaluate = {
        (team_index, player_name): player.weight
        for team_index, team in enumerate(teams)
        for player_name, player in team.players.items()
    }

    instances = {
        player_name: player.instance
        for team in teams
        for player_name, player in team.players.items()
    }

    best_rank = min(ranks_to_evaluate)
    winners = {
        player_name
        for team in teams
        if team.rank == best_rank
        for player_name in team.players.keys()
    }

    results = env.rate(
        teams_to_evaluate,
        ranks_to_evaluate,
        weights_to_evaluate
    )

    return {
        player_name: PlayerResult(
            rating=new_rating,
            instance=instances[player_name],
            winner=player_name in winners
        )
        for team in results
        for player_name, new_rating in team.items()
    }
