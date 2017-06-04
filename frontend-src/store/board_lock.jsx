import { createAction, handleAction } from "redux-actions"
import { takeLatest, put, take, select, fork } from "redux-saga/effects"
import { apiFetch } from "store/util.jsx"
import { delay } from "redux-saga"

// Actions
export const refreshLock = createAction('REFRESH_LOCK',
	leaderboard => leaderboard
)

const receiveLock = createAction('RECEIVE_LOCK',
	({leaderboard, unlock_time}) => ({leaderboard, unlock_time})
)

// Reducers
export const lockReducer = handleAction(
	receiveLock,
	(state, {payload: {unlock_time}}) => unlock_time,
	null
)

// Sagas
export const refreshLockSaga = function*() {
	yield takeLatest(refreshLock, function*({payload: leaderboard}) {
		const response = yield apiFetch({
			path: `boards/${leaderboard}`
		})

		if(!response.ok) {
			console.error(response)
			return
		}

		const board_data = yield response.json()
		const unlock_time = board_data.unlock_time
		yield put(receiveLock({leaderboard, unlock_time}))

		if(unlock_time === null) {
			return
		}

		const now = new Date()
		const unlock = new Date(unlock_time)
		yield delay(unlock.getTime() - now.getTime())
		yield put(receiveLock({leaderboard, unlock_time: null}))
		yield put(refreshLock(leaderboard))
	})
}

// Selectors
export const selectUnlockTime = state => state.board_lock
export const selectIsLocked = state => state.board_lock !== null
