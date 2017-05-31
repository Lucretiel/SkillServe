import ReactDOM from "react-dom"
import React from "react"

import createHistory from "history/createBrowserHistory"
import { compose, createStore, combineReducers } from "redux"

import { createLogger } from "redux-logger"
import { Provider } from "react-redux"
import {persistStore, autoRehydrate} from "redux-persist"
import createSagaMiddleware from "redux-saga"
import { fork } from 'redux-saga/effects'
import { composeWithDevTools } from "redux-devtools-extension/developmentOnly"

import App from "components/App.jsx"
import { formReducer } from "store/form.jsx"
import { authReducer, masterAuthSaga } from "store/register.jsx"
import redirectSaga from "store/redirect.jsx"
import { masterLeaderboardSaga, leaderboardReducer } from "store/leaderboard.jsx"
import { masterGameSaga } from "store/submit_game.jsx"
import { recentGameMasterSaga, recentGameReducer} from "store/recent_game.jsx"
import { refreshLockSaga, lockReducer } from "store/board_lock.jsx"

import { reducer as routerReducer, createMiddleware as createRouterMiddleware } from "router"

const customApplyMiddleware = (...middlewares) => createStore => (reducer, preloadedState, enhancer) => {
	const store = createStore(reducer, preloadedState, enhancer)
	const actionQueue = []
	let dispatch = action => actionQueue.push(action)

	const middlewareApi = {
		getState: store.getState,
		dispatch: action => dispatch(action)
	}
	dispatch = compose(...middlewares.filter(m => m !== null).map(m => m(middlewareApi)))(store.dispatch)
	actionQueue.forEach(action => dispatch(action))
	return {
		...store,
		dispatch
	}
}

const sagaMiddleware = createSagaMiddleware()
const routerMiddleware = createRouterMiddleware(createHistory())

const store = createStore(
	combineReducers({
		router: routerReducer,
		auth: authReducer,
		form: formReducer,
		leaderboard: leaderboardReducer,
		recent_game: recentGameReducer,
		board_lock: lockReducer,
	}),
	composeWithDevTools(
		customApplyMiddleware(
			routerMiddleware,
			sagaMiddleware,
			process.env.NODE_ENV !== 'production' ? createLogger() : null),
		autoRehydrate({log: process.env.NODE_ENV !== 'production'})
	)
)

persistStore(store, {
	whitelist: ["form", "auth"]
}, () => {
	sagaMiddleware.run(function*() {
		yield fork(redirectSaga)
		yield fork(masterLeaderboardSaga)
		yield fork(masterAuthSaga)
		yield fork(masterGameSaga)
		yield fork(recentGameMasterSaga)
		yield fork(refreshLockSaga)
	})
	routerMiddleware.init()

	ReactDOM.render(
		<Provider store={store}>
			<App />
		</Provider>, document.getElementById("root"))
})
