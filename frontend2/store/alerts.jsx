import { Record, OrderedMap, Range } from 'immutable'
import { createAction, handleActions } from 'redux-actions'
import { createSelector } from 'reselect'

// TYPES
const Alert = Record({'key': null, 'message': ""})

// ACTIONS
export const addAlert = createAction("ADD_ALERT", ({message, key}) => ({message, key}))
export const removeAlert = createAction("REMOVE_ALERT", key => key)

// REDUCER
export const alertReducer = handleActions({
	[addAlert]: (state, {payload: {message, key}}) => state.set(key, message)
	[removeAlert]: (state, {payload: key}) => state.delete(key)
}, new OrderedMap())


// SELECTORS
const alertSelector = state => state.alerts
export const getAlerts = createSelector(alertSelector,
	alerts => alerts.entrySeq().map(([key, msg]) => Alert({key, message}).toList())
)

const ids = Range()

export const getUnusedId = createSelector(alertSelector,
	alerts => ids.skipWhile(id => alerts.has(id)).first()
)
