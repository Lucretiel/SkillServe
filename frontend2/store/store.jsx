import { createStore } from 'redux'
import { Record, Seq } from 'immutable'
import mapValues from 'lodash/mapValues'

import { reducer as alertReducer } from "./alerts.jsx"
import { reducer as boardReducer } from "./board.jsx"

const immutableCombineReducers = reducerMap => {
	const reducers = Seq(reducerMap).filter(f => typeof f === 'function').toMap()
	const StateType = Record(mapValues(reducerMap, v => undefined))
	const emptyState = new StateType()

	return (state=emptyState, action) =>
		state.withMutations(mutState =>
			reducers.reduce(
				(mState, reducer, key) => mState.update(key, childState => reducer(childState, action)),
				mutState
			)
		)
}

const reducer = immutableCombineReducers({
	alerts: alertReducer,
	board: boardReducer,
})

const store = createStore(
	reducer,
	undefined,
	window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

export default store
