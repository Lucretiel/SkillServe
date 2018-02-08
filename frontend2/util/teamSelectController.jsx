import {
	Repeat, Map
} from 'immutable'

import {
	memoize
} from 'lodash'

const setOrDelete = (key, value) => value == undefined ?
	collection => collection.delete(key) :
	collection => collection.set(key, value)

const onlyif = (condition, update) => condition ? update : c => c

// players is a mapping of player => team
const baseTeamSelectController = ({maxTeams, maxPlayers}) => {
	const emptyTeams = Repeat(0, maxTeams).toOrderedMap()

	return (players, playerToCycle) => {
		const currentTeam = players.get(playerToCycle, null)

		return players.update(setOrDelete(playerToCycle,
			// Count players on each team
			emptyTeams.merge(players
				// Remove the current player; we want to know the ideal sequence if
				// they're not present
				.delete(playerToCycle)
				.countBy(team => team))
			// Sort by player count
			.sortBy(teamSize => teamSize)
			.update(teamSizes => teamSizes
				// Get just the team IDS, sorted by their ideal ordering
				.keySeq()
				// If we have a team, skip up to the team, then past it
				.update(onlyif(currentTeam !== null, teams => teams
					.skipUntil(teamId => teamId === currentTeam)
					.skip(1)))
				// Skip full teams
				.skipWhile(teamId => teamSizes.get(teamId) >= maxPlayers)
				// Get the team! Or undefined
				.first()
			)
		))
	}
}

const teamSelectController = memoize(
	baseTeamSelectController,
	({maxTeams, maxPlayers}) => `${maxTeams}_${maxPlayers}`
)

export default teamSelectController
