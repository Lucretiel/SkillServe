import { Seq, Record, Map, List } from 'immutable'
import { createAction, handleActions } from 'redux-actions'
import { createSelector } from 'reselect'

import makeTeamSelectController from 'util/teamSelectController.jsx'
import rankMapper from 'util/ranker.jsx'
/**
 * TYPES
 */

export const Player = Record({
	id: null, name: null, skill: null, displaySkill: null, rank: null
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
const rankPlayers = playerRankMapper((player, rank) => player.set('rank', rank)

// Given a list of players, sort and re-rank the players. Returns a Seq.
const reRankPlayers = players => Seq(players)
	.sortBy(player => player.displaySkill)
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

export const reducer = handleActions({
	[clearBoard]: state => emptyBoardState,
	[setPlayers]: (state, {payload: players}) =>
		state.set('players', players),
	[addPlayer]: (state, {payload: player}) =>
		state.update('players', players => players.push(player).update(reRankPlayers).toList()),
	[setBoardInfo]: (state, {payload: info}) =>
		state.withMutations(mutState => mutState.set('info', info).delete('currentGame')),

	[clearGame]: state => state.delete('currentGame')
	[rotatePlayer]: (state, {payload: playerId}) => {
		const {minPlayers, maxPlayers, maxTeams, getCanTie} = state.info

		// This is memoized by makeTeamSelectController
		const teamSelectController = makeTeamSelectController({
			minPlayers, maxPlayers, maxTeams, getCanTie
		})

		return state.updateIn(['currentGame', 'playerRanks'], playerRanks =>
			teamSelectController(playerRanks, playerId)
		)
	}
}, emptyBoardState)

/**
 * SELECTORS
 */

const getBoardState = state => state.board
export const getPlayers = createSelector(getBoardState, state => state.players)
export const getInfo = createSelector(getBoardState, state => state.info)
export const getMinPlayers = createSelector(getInfo, info => info.minPlayers)
export const getMaxPlayers = createSelector(getInfo, info => info.maxPlayers)
export const getMaxTeams = createSelector(getInfo, info => info.maxTeams)
export const getCanTie = createSelector(getInfo, info => info.canTie)
