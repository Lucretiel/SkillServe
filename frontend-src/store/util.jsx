import { createSelector } from "reselect"
import { some as any, last, initial, merge, map } from "lodash"

// Reducer which sets the state to a constant value
export const setState = value => () => value

// Reducer which sets the state to a transform of the payload, ignoring prior state
export const fromPayload = func => (state, {payload}) => func(payload)

// Reducer which sets the state the they payload
export const setPayload = fromPayload(payload => payload)

export const maybe = func => (...args) => any(args, arg => arg == null) ? null : func(...args)

// Selector factory that only runs if the dependencies are not null
export const createMaybeSelector = (...args) => createSelector(...initial(args), maybe(last(args)))

const parseQuery = query => query === null ? "" :
	'?' + map(query, (value, key) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')

export const apiFetch = ({path, args, query=null}) =>
	fetch(`https://crokinole-ladder.herokuapp.com/api/${path}${parseQuery(query)}`,
		merge({
			headers: {
				Accept: "application/json",
			},
		}, args)
	)

export const apiPost = ({path, data, args, query=null}) =>
	apiFetch({
		path: path,
		query: query,
		args: merge({
			headers: {
				'Content-Type': "application/json",
			},
			method: "POST",
			body: JSON.stringify(data),
		}, args)
	})
