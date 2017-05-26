import { locationChanged, PUSH, REPLACE, GO } from "router/actions.jsx"

export default function createMiddleware(history) {
	const middleware = ({getState, dispatch}) => {
		history.listen(location => dispatch(locationChanged({location})))

		middleware.init = () => dispatch(locationChanged({location: history.location}))

		return next => action => {
			const res = next(action)

			switch(action.type) {
			case PUSH:
				history.push(action.payload.path, action.payload.state)
				break
			case REPLACE:
				history.replace(action.payload.path, action.payload.state)
				break
			case GO:
				history.go(action.payload)
				break
			}

			return res
		}
	}
	middleware.init	= () => {
		throw new Error("Router middleware must be installed before initializing")
	}
	return middleware
}
