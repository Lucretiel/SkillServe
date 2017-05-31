import {createAction} from "redux-actions"
import {put, takeEvery} from "redux-saga/effects"
import {map} from 'lodash'

import {apiPost} from 'store/util.jsx'
import {refreshLeaderboard} from 'store/leaderboard.jsx'


// Actions
export const submitFullGame = createAction("SUBMIT_FULL_GAME",
	({winners, losers, leaderboard}) => ({winners, losers, leaderboard}))

// Reducers

// Sagas
const submitGameSaga = function*({winners, losers, leaderboard}) {
	const data = {
		teams: map([winners, losers], (list, rank) => ({
			rank: rank,
			players: map(list, username => ({username}))
		}))
	}

	const response = yield apiPost({
		path: `boards/${leaderboard}/full_game`,
		data: data
	})

	if(!response.ok) {
		switch(response.status) {
		default:
			console.error(response)
			return
		}
	}

	yield put(refreshLeaderboard({leaderboard}))
}

export const masterGameSaga = function*() {
	yield takeEvery(submitFullGame,
		({winners, losers, leaderboard}) => submitGameSaga({winners, losers, leaderboard}))
}

// Selectors
