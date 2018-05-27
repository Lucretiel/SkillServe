import { Seq, Record, Map, List, Range } from 'immutable'
import { createAction, handleActions } from 'redux-actions'
import { createSelector } from 'reselect'

import teamSelectController from 'util/teamSelectController.jsx'
import rankMapper from 'util/ranker.jsx'
/**
 * TYPES
 */

export const Player = Record({
	id: null, name: null, skill: null, displaySkill: null, rank: null, teamId: null
})

export const BoardInfo = Record({
	minPlayers: 1, maxPlayers: 2, maxTeams: 2, canTie: false
})

export const GameState = Record({
	playerRanks: Map(),
})

export const BoardState = Record({
	info: new BoardInfo(), players: List(), currentGame: new GameState()
})

/**
 * ACTIONS
 */

const makePlayer = ({id, name, skill}) => new Player(
	{id, name, skill, displaySkill: skill.toFixed(0)}
)

const playerRankMapper = rankMapper(player => player.displaySkill)
const rankPlayers = playerRankMapper((player, rank) => player.set('rank', rank))

// Given a list of players, sort and re-rank the players. Returns a Seq.
const reRankPlayers = players => Seq(players)
	.sortBy(player => -player.skill)
	.update(rankPlayers)

export const setBoardInfo = createAction("SET_BOARD_INFO", BoardInfo)
export const addPlayer = createAction("ADD_PLAYER", makePlayer)
export const setPlayers = createAction("SET_PLAYERS", players =>
	Seq(players)
		.map(makePlayer)
		.update(reRankPlayers)
		.toList()
)
export const clearBoard = createAction("CLEAR_BOARD")

export const rotatePlayer = createAction("ROTATE_PLAYER", playerId => playerId)
export const clearGame = createAction("CLEAR_GAME")

const emptyBoardState = new BoardState()

/**
 * REDUCER
 */

// Given a set of player ranks, reduce all the player ranks to be 0,1,2...
const collapseRanks = playerRanks => {
	const teamConversions = Map(playerRanks.valueSeq().toSet().sort().zip(Range()))
	return playerRanks.map(teamId => teamConversions.get(teamId))
}

export const reducer = handleActions({
	[clearBoard]: state => emptyBoardState,
	[setPlayers]: (state, {payload: players}) => state
		.set('players', players)
		.updateIn(['currentGame', 'playerRanks'], ranks =>
			ranks.every((_, id) => players.find(p => p.id === id) !== undefined) ?
				ranks : Map()
		),
	[addPlayer]: (state, {payload: player}) =>
		state.update('players', players => players.push(player).update(reRankPlayers).toList()),
	[setBoardInfo]: (state, {payload}) =>
		state.update('info', info =>
			info.withMutations(mutInfo => mutInfo
				.set('minPlayers', payload.minPlayers)
				.set('maxPlayers', payload.maxPlayers)
				.set('maxTeams', payload.maxTeams)
				.set('canTie', payload.canTie)
			)
		),

	[clearGame]: state => state.delete('currentGame'),
	[rotatePlayer]: (state, {payload: playerId}) => {
		// This is memoized by makeTeamSelectController
		const rotatePlayer = teamSelectController(state.info)

		return state.updateIn(['currentGame', 'playerRanks'], playerRanks =>
			rotatePlayer(playerRanks, playerId)
			.update(collapseRanks)
		)
	},
}, emptyBoardState)
