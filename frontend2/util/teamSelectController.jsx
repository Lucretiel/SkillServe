import {
	Repeat, Map, Seq
} from 'immutable'

import lodash_memoize from 'lodash/memoize'
const memoize = (keyFunc, func) => lodash_memoize(func, keyFunc)

const onlyif = (condition, update) => condition ? update : c => c

const nullSeq = Seq([null])

// players is a mapping of player => team
const teamSelectController = memoize(
	({maxTeams, maxPlayers, minPlayers, canTie}) => `${maxTeams}_${maxPlayers}_${minPlayers}_${canTie}`,
	({maxTeams, maxPlayers, minPlayers, canTie}) => {
		if(canTie && maxPlayers > 1) {
			throw new Error("We dont' currently support team games where ties can happen")
		}

		const emptyTeams = Repeat(0, maxTeams).toMap()

		return (players, playerToCycle) => {
			const currentTeam = players.get(playerToCycle, null)
			const teamsWithoutThisPlayer = players.delete(playerToCycle)

			const teamSizes = emptyTeams.merge(
				teamsWithoutThisPlayer.countBy(team => team)
			)

			const maxTeam = teamsWithoutThisPlayer.max()
			const maxAcceptableTeam = maxTeam === undefined ? 0 : maxTeam + 1

			const newTeam = teamSizes
				// First, put the teams in their ideal iteration cycle
				.toKeyedSeq()
				.sortBy((v, teamId) => teamId)
				.sortBy(teamSize => teamSize < minPlayers ? -1 : teamSize)
				.keySeq()

				// Skip up to, then past, the current team in the cycle
				.update(onlyif(currentTeam !== null, teamIds =>
					teamIds.skipUntil(teamId => teamId === currentTeam).skip(1)
				))

				// Only consider N+1 teams
				.filter(teamId => teamId <= maxAcceptableTeam)

				// Skip full teams
				.update(onlyif(!canTie, teamIds =>
					teamIds.filter(teamId => teamSizes.get(teamId) < maxPlayers)
				))

				// Add null to the end; player leaves the team if none are available
				.concat(nullSeq)

				// Get the final team!
				.first()

			return newTeam === null ?
				players.delete(playerToCycle) :
				players.set(playerToCycle, newTeam)
		}
	}
)

export default teamSelectController
