import { createAction, handleActions, handleAction } from "redux-actions"
import { map, orderBy, filter, keyBy, find } from "lodash"
import { createSelector } from "reselect"
import { combineReducers } from "redux"
import { fromPayload, setPayload, setState, apiFetch } from "store/util.jsx"
import { selectLeaderboard as selectAuthLeaderboard, updateUser, selectUsername} from "store/register.jsx"
import { takeEvery, put, take, select, fork } from "redux-saga/effects"
import { formatSkill } from "util.jsx"

const processedPlayers = playerData => map(playerData,
	({username, print_name, skill, is_provisional, quality}) => ({
		username: username,
		skill: skill,
		prettyName: print_name,
		isProvisional: is_provisional,
		displaySkill: formatSkill({skill, isProvisional: is_provisional}),
	}))

const sortedPlayers = players => orderBy(players,
	["skill", "isProvisional", "prettyName"],
	["desc",  "asc",           "asc"],
)

const rankedPlayers = sortedPlayers => {
	let prevRank = 0
	let tieRank = 0
	let prevSkill = null

	return map(sortedPlayers,
		({isProvisional, displaySkill, ...rest}) => ({
			isProvisional, displaySkill, ...rest,
			rank:
				isProvisional ? null :
				displaySkill === prevSkill ? (++prevRank, tieRank) :
				(prevSkill = displaySkill, tieRank = prevRank = prevRank + 1, prevRank)
		})
	)
}

// Actions
export const refreshLeaderboard = createAction("REFRESH_LEADERBOARD",
	({leaderboard, wipe=false}) => ({leaderboard, wipe}))

const setUpdatedLeaderboard = createAction("RECEIVE_LEADERBOARD",
	playerData => rankedPlayers(sortedPlayers(processedPlayers(playerData)))
)

const doneRefreshing = createAction("REFRESH_LEADERBOARD_DONE")

// Reducers
const leaderboardListReducer = handleAction(setUpdatedLeaderboard, {
	next: (state, {payload: players}) => players,
	throw: state => state
}, [])

const leaderboardStatusReducer = handleActions({
	[refreshLeaderboard]: setState(true),
	[doneRefreshing]: setState(false),
}, false)

export const leaderboardReducer = combineReducers({
	players: leaderboardListReducer,
	updating: leaderboardStatusReducer,
})

// Sagas
const doRefreshLeaderboard = function*({leaderboard, wipe}) {
	if(wipe) {
		yield put(setUpdatedLeaderboard([]))
	}

	try {
		const response = yield apiFetch({
			path: `boards/${leaderboard}/players/`
		})

		if(!response.ok) {
			switch(response.status) {
			default:
				console.error("Something went wrong with the leaderboard")
				console.error(response)
				return
			}
		}

		const responseData = yield response.json()
		const username = yield select(selectUsername)
		const userData = find(responseData, {username})
		yield put(setUpdatedLeaderboard(responseData))
		yield put(updateUser(userData))

	} catch(err) {
		yield put(setUpdatedLeaderboard(err))
		console.error(err)
	} finally {
		// TODO: Does this get executed if this task is cancelled?
		yield put(doneRefreshing())
	}
}

export const masterLeaderboardSaga = function*() {
	yield takeEvery(refreshLeaderboard, action => doRefreshLeaderboard(action.payload))

	const leaderboard = yield select(selectAuthLeaderboard)

	if(leaderboard) {
		yield* doRefreshLeaderboard(leaderboard)
	}
}

// Selectors
export const isLeaderboardUpdating = state => state.leaderboard.updating
export const selectPlayers = state => state.leaderboard.players
export const selectPlayersByName = createSelector(
	selectPlayers,
	players => keyBy(players, 'username'))
