import { createAction, handleAction } from "redux-actions"
import { isEmpty, filter, map } from "lodash"
import { createSelector } from "reselect"
import { setPayload, createMaybeSelector, apiPost, apiFetch } from "store/util.jsx"
import { selectLeaderboard as selectAuthLeaderboard} from "store/register.jsx"
import { put, select, fork, join, takeEvery } from "redux-saga/effects"
import { delay } from "redux-saga"

import { refreshLeaderboard } from "store/leaderboard.jsx"

const ROOT_URL = "https://crokinole-ladder.herokuapp.com"

// Actions
export const submitPartialGame = createAction("SUBMIT_PARTIAL_GAME")
const receivePartialGame = createAction("RECEIVE_PARTIAL_GAME")

// Reducers
export const partialGameReducer = handleAction(
	receivePartialGame,
	(state, {payload}) =>
		payload === null ? null :
		state === null ? payload :
		payload.fingerprint === state.fingerprint ? state :
		payload,
	null,
)

const emitPartialGame = function*(newGame) {
	const currentGame = yield select(selectPartialGameData)
	if(currentGame === null && newGame === null) return
	if(currentGame === null || newGame === null || currentGame.fingerprint !== newGame.fingerprint) {
		yield put(receivePartialGame(newGame))
	}
}

const submitGameSaga = function*({leaderboard, username, winner, game_type, partial_game_id}) {
	const response = yield apiPost({
		path: `boards/${leaderboard}/partial_game`,
		data: {username, winner, game_type, partial_game_id}
	})

	// TODO: error handling for specific cases
	if(!response.ok) {
		console.error("Something went wrong!")
	} else {
		yield put(refreshLeaderboard(leaderboard))
		const data = yield response.json()

		switch(response.status) {
		default:
			yield* emitPartialGame(newGame)
		}
	}
}

// Sagas
const refreshGameSaga = function*(leaderboard) {
	const url = `${ROOT_URL}/api/`
	const response = yield apiFetch({
		path: `boards/${leaderboard}/partial_game`,
	})

	if(!response.ok) {
		switch(response.status) {
		case 404:
			yield* emitPartialGame(null)
			return
		default:
			console.error(response)
			return
		}
	} else {
		switch(response.status) {
		case 204:
			yield* emitPartialGame(null)
			return
		default:
			const data = yield response.json()
			yield* emitPartialGame(data)
		}
	}
}

const refreshLoopSaga = function*(tickRate) {
	for(;;) {
		const timer = yield fork(delay, tickRate)
		const leaderboard = yield select(selectAuthLeaderboard)
		if(leaderboard !== null) {
			yield* refreshGameSaga(leaderboard)
		}
		yield join(timer)
	}
}

export const masterPartialGameSaga = function*() {
	yield fork(refreshLoopSaga, 1000)
	yield takeEvery(submitPartialGame, action => submitGameSaga(action.payload))
}

// Selectors
export const selectPartialGameData = ({partial_game}) => partial_game
export const selectPartialGameId = createMaybeSelector(
	selectPartialGameData, partial_game => partial_game.id)
export const selectPartialGamePlayers = createMaybeSelector(
	selectPartialGameData, partial_game => partial_game.players)
export const selectPartialGameType = createMaybeSelector(
	selectPartialGameData, partial_game => partial_game.game_type)

export const selectPartialWinners = createMaybeSelector(
	selectPartialGamePlayers, players => map(filter(players, 'winner'), 'player'))
export const selectPartialLosers = createMaybeSelector(
	selectPartialGamePlayers, players => map(filter(players, {winner: false}), 'player'))

const selectGroupFull = groupSelector => createSelector(
	selectPartialGameType, groupSelector,
	(type, group) =>
		type == null ?
			false :
		type === "solo" ?
			group.length >= 1 :
		type === "team" ?
			group.length >= 2 :
		Error(`Invalid game type ${type}`)
)

export const selectWinnersFull = selectGroupFull(selectPartialWinners)
export const selectLosersFull = selectGroupFull(selectPartialLosers)
