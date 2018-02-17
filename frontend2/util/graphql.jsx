import isFunction from "lodash/isFunction"
import map from "lodash/map"
import mapValues from "lodash/mapValues"
import memoize from "lodash/memoize"
import merge from "lodash/merge"
import some from "lodash/some"

const objApply = object => input => mapValues(object, child => isFunction(child) ? child(input) : child)

const whitespace = /\s+/mg
const minifyQuery = memoize(query => query.trim().replace(whitespace, ' '))

const graphqlCall = options => {
	const mergeUrl = objApply(merge({headers: {"Accept": "application/json"}}, options))

	return memoize(url => {
		const mergeQuery = objApply(mergeUrl(url))

		return memoize(query => {
			const mergeVariables = objApply(mergeQuery(minifyQuery(query)))

			return variables => {
				const fetchOptions = mergeVariables(variables)
				const url = fetchOptions.url

				return fetch(url, fetchOptions)
					.then(result => result.json())
					.then(result => result.errors && result.errors.length ?
						Promise.reject(result) :
						result
					)
			}
		})
	})
}

const formatQuery = object =>
	map(object, (value, key) =>
		[key, value].map(encodeURIComponent).join('=')
	).join('&')


export const query = graphqlCall({
	method: 'GET',
	url: url => query => variables => `${url}?${formatQuery({
		query: query,
		variables: JSON.stringify(variables),
	})}`,
})

export const mutate = graphqlCall({
	method: 'POST',
	headers: {
		"Content-Type": "application/json",
	},
	url: url => url,
	body: url => query => variables => JSON.stringify({query, variables}),
})

export const withUrl = url => ({
	query: query(url),
	mutate: mutate(url),
})
