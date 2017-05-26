import { createAction, handleAction } from "redux-actions"
import { takeEvery, put, take, select, fork } from "redux-saga/effects"
import { apiFetch } from "store/util.jsx"

// Actions
export const refreshLock = createAction('REFRESH_LOCK',
	leaderboard => leaderboard
)

const receiveLock = createAction('RECEIVE_LOCK',
	lock => lock
)

// Reducers
export const lockReducer = handleAction(
	receiveLock,
	(state, {payload}) => payload,
	null
)

// Sagas
export const refreshLockSaga = function*() {
	yield takeEvery(refreshLock, function*({payload: leaderboard}) {
		const response = yield apiFetch({
			path: `boards/${leaderboard}`
		})

		if(!response.ok) {
			console.error(response)
			return
		}

		const board_data = yield response.json()
		yield put(receiveLock(board_data.unlock_time))
	})
}

// Selectors
export const selectUnlockTime = state => state.board_lock
export const selectIsLocked = state => state.board_lock !== null
