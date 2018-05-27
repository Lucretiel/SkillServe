import { Record, OrderedMap, Range } from 'immutable'
import { createAction, handleActions } from 'redux-actions'
import { createSelector } from 'reselect'

// ACTIONS
export const addAlert = createAction("ADD_ALERT", message => message)
export const removeAlert = createAction("REMOVE_ALERT", key => key)

const getUnusedId = alerts => Range().skipWhile(id => alerts.has(id)).first()

// REDUCER
export const reducer = handleActions({
	[addAlert]: (state, {payload: message}) => state.set(getUnusedId(state), message),
	[removeAlert]: (state, {payload: key}) => state.delete(key),
}, new OrderedMap())
