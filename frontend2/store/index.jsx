import { createStore } from 'redux'
import { combineReducers } from 'redux-immutable'

import { reducer as alertReducer } from "./alerts.jsx"
import { reducer as boardReducer } from "./board.jsx"

const reducer = combineReducers({
	alerts: alertReducer,
	board: boardReducer,
})

const store = createStore(reducer)

export default store
