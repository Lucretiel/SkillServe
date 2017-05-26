import { createAction, handleActions } from "redux-actions"
import { sym } from "router/util.jsx"

export const PUSH = sym("PUSH")
export const REPLACE = sym("REPLACE")
export const GO = sym("GO")
export const LOCATION_CHANGED = sym("LOCATION_CHANGED")

export const push = createAction(PUSH, (path, state) => ({path, state}))
export const replace = createAction(REPLACE, (path, state) => ({path, state}))
export const go = createAction(GO, steps => steps)
export const goForward = (steps=1) => go(steps)
export const goBack = (steps=1) => go(-steps)


export const locationChanged = createAction(LOCATION_CHANGED,
	({location, previous}) => ({location, previous})
)
