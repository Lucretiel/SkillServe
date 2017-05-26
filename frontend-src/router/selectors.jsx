import { createSelector } from "reselect"

export const selectRouter = state => state.router
export const selectLocation = createSelector(selectRouter, router => router.location)
export const selectPrevious = createSelector(selectRouter, router => router.previous)
export const selectPathname = createSelector(selectLocation, loc => loc.pathname)
