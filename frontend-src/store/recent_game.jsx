import { createAction, handleAction } from "redux-actions"
import { takeEvery, put, take, select, fork } from "redux-saga/effects"
import { apiFetch } from "store/util.jsx"

// Actions
export const refreshRecent = createAction('REFRESH_RECENT',
	({leaderboard, username}) => ({leaderboard, username})
)

const receiveRecent = createAction('RECEIVE_RECENT',
	recent => recent
)

// Reducers
export const recentGameReducer = handleAction(
	receiveRecent,
	(state, {payload}) =>
		payload === null ? null :
		state === null ? payload :
		payload.time === state.time ? state : payload,
	null
)

// Sagas
export const recentGameMasterSaga = function*() {
	yield takeEvery(refreshRecent, function*({payload: {leaderboard, username}}) {
		const response = yield apiFetch({
			path: `boards/${leaderboard}/players/${username}/recent_game`
		})

		if(!response.ok) {
			console.error(response)
			return
		}

		switch(response.status) {
			case 204:
				yield put(receiveRecent(null))
				break
			default:
				const game = yield response.json()
				yield put(receiveRecent(game))
				break
		}
	})
}

// Selectors
export const selectRecentGame = state => state.recent_game
