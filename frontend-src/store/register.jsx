//TODO: split up this file please
import { mapValues } from "lodash"
import { createAction, handleActions } from "redux-actions"
import { createSelector } from "reselect"
import { takeLatest, put, select, all } from "redux-saga/effects"
import { push as pushLocation } from "router/actions.jsx"
import { fromPayload, createMaybeSelector, apiPost, apiFetch } from "store/util.jsx"
import { refreshLeaderboard } from "store/leaderboard.jsx"
import { refreshLock } from 'store/board_lock.jsx'

const sym = value => `@@auth/${value}`

// External actions
export const doLogin = createAction(sym("DO_LOGIN"),
	({options, credentials}) => ({options, credentials})
)
export const doLogout = createAction(sym("DO_LOGOUT"))
export const refreshUser = createAction(sym("REFRESH_USER"))
export const updateUser = createAction(sym("UPDATE_USER"),
	({skill, mu, sigma}) => ({skill, mu, sigma})
)

// Internal actions
const defaultEmpty = (data = {}) => data
const setStateUnauth = createAction(sym("STATE_UNAUTH"), defaultEmpty)
const setStateWorking = createAction(sym("STATE_WORKING"), defaultEmpty)
const setStateAuth = createAction(sym("STATE_AUTH"), defaultEmpty)

// Reducers
const NOT_AUTHENTICATED = "notAuthenticated"
const ATTEMPTING_AUTH = "attemptingAuth"
const AUTHENTICATED = "authenticated"

const authStates = {
	notAuthenticated: NOT_AUTHENTICATED,
	attemptingAuth: ATTEMPTING_AUTH,
	authenticated: AUTHENTICATED,
}

export const setStatusAndData = status => fromPayload(data => ({status, data}))

const innerAuthReducer = handleActions({
	[setStateUnauth]: setStatusAndData(NOT_AUTHENTICATED),
	[setStateWorking]: setStatusAndData(ATTEMPTING_AUTH),
	[setStateAuth]: setStatusAndData(AUTHENTICATED),
	[updateUser]: (auth, {payload: {skill, mu, sigma}}) =>
			auth.status !== AUTHENTICATED ? auth :
			{status: auth.status, data: {...auth.data, skill, mu, sigma}},
}, {status: NOT_AUTHENTICATED, data: {}})

export const authReducer = (state, action) => {
	return innerAuthReducer(state, action)
}

// Selectors
export const selectAuth = state => state.auth
export const selectAuthStatus = createSelector(selectAuth, auth => auth.status)
export const selectAuthData = createSelector(selectAuth, auth => auth.data)

selectAuthStatus.is = mapValues(authStates, desiredState =>
	createSelector(
		selectAuthStatus,
		authStatus => authStatus === desiredState
	))

export const selectIsAuthenticated = selectAuthStatus.is.authenticated

selectAuthData.if = mapValues(selectAuthStatus.is, isStatusSelector =>
	createSelector(
		isStatusSelector, selectAuthData,
		(isStatus, data) => isStatus ? data : null
	))

export const selectUsername = createMaybeSelector(
	selectAuthData.if.authenticated, ({username}) => username
)

export const selectPrettyName = createMaybeSelector(
	selectAuthData.if.authenticated, ({prettyName}) => prettyName
)

export const selectLeaderboard = createMaybeSelector(
	selectAuthData.if.authenticated, ({leaderboard}) => leaderboard)

export const selectSkill = createMaybeSelector(
	selectAuthData.if.authenticated, ({skill}) => skill)

export const selectStats = createMaybeSelector(
	selectAuthData.if.authenticated, ({wins, losses, games}) => ({wins, losses, games}))

const selectNameParts = createMaybeSelector(
	selectPrettyName, prettyName => prettyName.split(/\s+/)
)

export const selectFirstName = createMaybeSelector(
	selectNameParts, parts => parts[0]
)

export const selectUnauthError = createMaybeSelector(
	selectAuthData.if.notAuthenticated, ({error = null}) => error
)

// Sagas
const unauthSaga = function*(data = {}) {
	yield put(setStateUnauth(data))
	yield put(pushLocation("/login"))
}

// Do a login and return / raise the results. Does not do anything with other
// Sagas/dispatches/etc
const loginWork = function*({username, prettyName, leaderboard}) {
	// May raise
	const response = yield apiPost({
		path: `boards/${leaderboard}/register`,
		data: {username, print_name: prettyName}
	})

	if(!response.ok) {
		return response
	}
	const userData = yield response.json()
	return userData
}

const loginSaga = function*({username, prettyName, leaderboard}) {
	yield put(setStateWorking({}))
	yield put(refreshLeaderboard({leaderboard, wipe: true}))
	yield put(refreshLock(leaderboard))
	let response
	try {
		response = yield* loginWork({username, prettyName, leaderboard})
	} catch(err) {
		console.error(err)
		yield* unauthSaga({error: "Some kind of network failure. Are you connected to the internet?"})
		return
	}

	// Assume it's an error if we got the plain response back
	if(response instanceof Response) {
		switch(response.status) {
		case 404:
			yield* unauthSaga({error: `No such leaderboard '${leaderboard}'`})
			break
		default:
			console.error(response)
			yield* unauthSaga({error: "Something went terribly wrong! Check the console"})
			break
		}

	} else {
		// We have json!
		const userData = response
		yield put(setStateAuth({
			...userData,
			prettyName: userData.print_name,
			leaderboard: leaderboard
		}))
		yield put(pushLocation("/main"))
	}
}

const refreshSaga = function*() {
	const isAuth = yield select(selectIsAuthenticated)
	if(isAuth) {
		const username = yield select(selectUsername)
		const leaderboard = yield select(selectLeaderboard)

		const response = yield apiFetch({
			path: `boards/${leaderboard}/players/${username}`
		})

		if(!response.ok) {
			console.error(response)
			return
		}

		const data = yield response.json()
		yield put(setStateAuth({
			...data,
			prettyName: data.print_name,
			leaderboard: leaderboard,
		}))
	}
}

const logoutSaga = function*() {
	yield* unauthSaga()
}

export const masterAuthSaga = function*() {
	// TODO: figure out a way to do this in redux-persist
	const isAuthenticated = yield select(selectIsAuthenticated)
	if(!isAuthenticated) {
		yield* unauthSaga()
	} else {
		//TODO: re-execute login to get latest prettyName
	}
	yield takeLatest(doLogin, action => loginSaga(action.payload.credentials))
	yield takeLatest(doLogout, action => logoutSaga())
	yield takeLatest(refreshUser, action => refreshSaga())
}
