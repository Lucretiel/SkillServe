import { map, mapValues, isFunction, isPlainObject, merge, memoize } from 'lodash'

const objAppy = object => {
	const semiFlattened = mapValues(object, child => isPlainObject(child) ? objAppy(child) : child)
	return value => mapValues(semiFlattened, child => isFunction(child) ? child(value) : child)
}

const whitespace = /\s+/mg
const minifyQuery = memoize(query => query.trim().replace(whitespace, ' '))

const graphqlCall = options => {
	const mergeUrl = objAppy(merge({headers: {"Accept": "application/json"}}, options))

	return memoize(url => {
		const mergeQuery = objAppy(mergeUrl(url))

		return memoize(query => {
			const mergeVariables = objAppy(mergeQuery(minifyQuery(query)))

			return variables => {
				const {url, ...fetchOptions} = mergeVariables(variables)
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
	map(object, (value, key) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
	.join('&')


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
