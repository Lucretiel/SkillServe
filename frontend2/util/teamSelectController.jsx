import {
	Range, Map, Seq
} from 'immutable'

import memoize from 'lodash/memoize'

const onlyif = (condition, update) => condition ? update : c => c

const nullSeq = Seq([null])

// players is a mapping of player => team
const baseTeamSelectController = ({maxTeams, maxPlayers, minPlayers=1, baseTeam=1}) => {
	const emptyTeams = Map(
		Range(baseTeam, maxTeams + baseTeam).map(teamId => [teamId, 0])
	)

	return (players, playerToCycle) => {
		const currentTeam = players.get(playerToCycle, null)

		const teamSizes = emptyTeams.merge(
			players.delete(playerToCycle).countBy(team => team)
		)

		return teamSizes
			.toKeyedSeq()
			.sortBy((v, teamId) => teamId)
			.sortBy(teamSize => teamSize < minPlayers ? -1 : teamSize)
			.keySeq()
			// At this point we have an ordered sequence of Team IDs.

			.update(onlyif(current !== null, teamIds => teamIds
				.skipUntil(teamId => teamId === currentTeam)
				.skip(1)
			))
			.skipWhile(teamId => teamSizes.get(teamId) >= maxPlayers)
			.concat(nullSeq)
			.first()
	}
}

const teamSelectController = memoize(
	baseTeamSelectController,
	({maxTeams, maxPlayers, minPlayers=1, baseTeam=1}) =>
		`${maxTeams}_${maxPlayers}_${minPlayers}_${baseTeam}`
)

export default teamSelectController
