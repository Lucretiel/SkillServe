import React from 'react'
import PropTypes from 'prop-types'

import getCookie from 'util/cookie.jsx'

export default class CSRFToken extends React.PureComponent {
	static propTypes = {
		token: PropTypes.string,
		key: PropTypes.string,
		always: PropTypes.bool,
	}

	render() {
		const {
			key='csrftoken',
			always=false,
			token=getCookie(key)
		} = this.props

		return token ?
			<input type="hidden" name="csrfmiddlewaretoken" value={token} /> :
			always ?
				<input type="hidden" name="csrfmiddlewaretoken" /> :
				null
	}
}
