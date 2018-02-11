import { Record, List, OrderedMap, Map } from 'immutable'
import { createAction, handleActions } from 'redux-actions'
import { createSelector } from 'reselect'

import { fromPayload } from './util.jsx'

/**
 * Types and defaults
 */

export const Player = Record({
	id: null, name: null, skill: null, rank: null
})

const BoardInfo = Record({
	minPlayers: 1, maxPlayers: 2, maxTeams: 2, canTie: false
})

const GameState = Record({
	playerTeams: Map(), teamRanks: Map(),
})

const BoardState = Record({
	info: new BoardInfo(), players: List(), currentGame: new GameState()
})

const emptyBoardState = new BoardState()

/**
 * Actions
 */

export const setBoardInfo = createAction("SET_BOARD_INFO", BoardInfo)
export const addPlayer = createAction("ADD_PLAYER", Player)
export const setPlayers = createAction("SET_PLAYER", players => Seq(players).map(Player).toList())
export const clearBoard = createAction("CLEAR_BOARD")

export const addAlert = createAction("ADD_ALERT", ({message, key}) => ({message, key}))
export const removeAlert = createAction("REMOVE_ALERT", key => key)

export const rotatePlayer = createAction("ROTATE_PLAYER", playerId => playerId)
export const rotateRank = createAction("ROTATE_RANK", teamId => teamId)


/**
 * Reducers
 */

const boardReducer = handleActions({
	[clearBoard]: state => emptyBoardState,
	[setPlayers]: (state, {payload: players}) => boardState.set('players', players),
	[addPlayer]: (state, {payload: player}) => boardState.update('players', players => players.push(player)),
	[setBoardInfo]: (state, {payload: info}) => boardState.set('info', info),

	[rotatePlayer]: (state, {payload: playerId}) =>
		state.updateIn(['currentGame', 'players'], players => {
			const newTeam = getTeamSelectController(state)(players, playerId)
			return newTeam == null ? players.delete(playerId) : players.set(playerId, newTeam)
		}),
	[rotateRank]: (state, {payload: teamId}) => {

	}
}, new BoardState())

const alertReducer = handleActions({
	[addAlert]: (state, {payload: {message, key}}) => state.set(key, message)
	[removeAlert]: (state, {payload: key}) => state.delete(key)
}, new OrderedMap())



/**
 * Selectors
 */

const getPlayers = createSelector(getBoardState, state => state.players)
const getInfo = createSelector(getBoardState, state => state.info)
const getMaxPlayers = createSelector(getInfo, info.maxPlayers)
const getMaxTeams = createSelector(getInfo, info => info ? info.maxTeams : null)
const getCanTie = createSelector(getInfo, info => info ? info.canTie : null)
const getMinPlayers = createSelector(getInfo, info => )

export const selectorsForBoard = boardName => {


}
