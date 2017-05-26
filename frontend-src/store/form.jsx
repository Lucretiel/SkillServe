import { createAction, handleActions } from "redux-actions"

export const form = {
	setLeaderboard: createAction("SET_LEADERBOARD"),
	setUsername: createAction("SET_USERNAME"),
	setPrettyName: createAction("SET_PRETTYNAME"),
}

const convertNameToUsername = name => {
	const parts = name.toLowerCase().split(/\s+/)
	return parts[0] + parts.slice(1).map(part => part[0]).join("")
}

export const formReducer = handleActions({
	[form.setLeaderboard]: (state, {payload: leaderboard}) => ({...state, leaderboard}),
	[form.setUsername]: (state, {payload: username}) => ({
		...state,
		username,
		autoUsername: username === "" ? true : false}),
	[form.setPrettyName]: (state, {payload: prettyName}) => ({
		...state,
		prettyName,
		username: state.autoUsername ?
				convertNameToUsername(prettyName) :
				state.username
	}),
}, {username: "", leaderboard: "", prettyName: "", autoUsername: true})
