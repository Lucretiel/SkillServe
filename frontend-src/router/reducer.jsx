import { handleAction } from "redux-actions"
import { sym } from "router/util.jsx"
import { push, replace, go, locationChanged } from "router/actions.jsx"

export const reducer = handleAction(
	locationChanged,
	({location: oldLocation}, {payload: {location: newLocation}}) => (
		{location: newLocation, previous: oldLocation}
	),
	{location: null, previous: null})
