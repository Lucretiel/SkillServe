import { map, pickBy, mapValues, isFunction, merge } from 'lodash'

const whitespace = /\s+/mg

const objAppy = object => input => mapValues(object, value => isFunction(value) ? value(input) : value)

const baseOptions = {
	headers: {
		"Accept": "application/json",
	}
}

const graphqlCall = options => {
	const mergeQuery = objAppy(merge({}, baseOptions, options))
	return query => {
		const mergeVariables = objAppy(mergeQuery(query.trim().replace(whitespace, ' ')))
		return variables => {
			const {url, ...fetchOptions} = mergeVariables(variables)
			return fetch(url, fetchOptions).then(result => result.json())
		}
	}
}


const formatQuery = object => map(object, (value, key) => [
	encodeURIComponent(key),
	encodeURIComponent(value)
].join('=')).join('&')


export const query = graphqlCall({
	method: 'GET',
	url: query => variables => '/graphql?' + formatQuery({
		query: query,
		variables: JSON.stringify(variables),
	}),
})


export const mutate = graphqlCall({
	method: 'POST',
	headers: {
		"Content-Type": "application/json",
	},
	url: '/graphql',
	body: query => variables => JSON.stringify({query, variables}),
})
