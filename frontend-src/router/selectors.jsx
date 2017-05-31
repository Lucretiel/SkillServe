import { createSelector } from "reselect"
import { trimStart } from "lodash"

export const selectRouter = state => state.router
export const selectLocation = createSelector(selectRouter, router => router.location)
export const selectPrevious = createSelector(selectRouter, router => router.previous)
export const selectPathname = createSelector(selectLocation, loc => loc.pathname)
export const selectFragment = createSelector(selectLocation, loc => loc.hash.replace(/^#/, ''))
