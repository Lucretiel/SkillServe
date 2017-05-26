import { push, replace, go, goBack, goForward } from "router/actions.jsx"
import createMiddleware from "router/middleware.jsx"
import { reducer } from "router/reducer.jsx"
import Fragment from "router/components/fragment.jsx"
import Link from "router/components/link.jsx"

export {
	push, replace, go, goBack, goForward,
	createMiddleware, reducer,
	Fragment, Link,
}
