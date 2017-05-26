import { takeLatest, put, select } from "redux-saga/effects"
import { locationChanged, push } from "router/actions.jsx"
import { selectIsAuthenticated } from "store/register.jsx"
import UrlPattern from "url-pattern"

const rootPattern = new UrlPattern("/")
const anyMainPattern = new UrlPattern("/main*")
const mainPattern = new UrlPattern("/main")

const redirectLogic = function*(targetLocation) {
	// TODO: extract these rules
	if(rootPattern.match(targetLocation)) {
		yield put(push("/main/game"))
		return
	}

	if(anyMainPattern.match(targetLocation)) {
		const isAuthenticated = yield select(selectIsAuthenticated)
		if(!isAuthenticated) {
			yield put(push("/login"))
			return
		}
	}

	if(mainPattern.match(targetLocation)) {
		yield put(push("/main/game"))
		return
	}
}

export default function* redirectSaga() {
	yield takeLatest(locationChanged, action => redirectLogic(action.payload.location.pathname))
}
