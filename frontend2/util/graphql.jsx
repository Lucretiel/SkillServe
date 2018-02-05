import { map, pickBy, mapValues, isFunction, isPlainObject, merge } from 'lodash'

const whitespace = /\s+/mg

const objAppy = object => {
	const semiFlattened = mapValues(object, child => isPlainObject(child) ? objAppy(child) : child)
	return value => mapValues(semiFlattened, child => isFunction(child) ? child(value) : child)
}

const baseOptions =

const graphqlCall = options => {
	const mergeQuery = objAppy(merge({headers: {"Accept": "application/json"}}, options))
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
