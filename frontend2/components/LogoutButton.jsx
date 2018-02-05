import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import CSRFToken from 'components/CSRFToken.jsx'

export default class LogoutButton extends React.PureComponent {
	static propTypes = {
		logoutUrl: PropTypes.string
	}

	constructor(props) {
		super(props)
		this.state = {
			elevated: false
		}
	}

	handleBlur = event => this.setState({elevated: false})

	handleClick = event => {
		if(!this.state.elevated) {
			event.preventDefault()
			this.setState({elevated: true})
		}
	}

	render() {
		const { logoutUrl='/logout/' } = this.props
		const { elevated } = this.state

		const buttonClass = classNames({
			"logout-button": !elevated,
			"logout-button-elevated": elevated,
			"btn": true,
			"btn-danger": true,
		})

		return <form action={logoutUrl} method="post">
			<CSRFToken />
			<button
				type="submit"
				name="logout-button"
				className={buttonClass}
				onClick={this.handleClick}
				onBlur={this.handleBlur}
			>
				{!elevated ? "Logout" : "Are you sure?"}
			</button>
		</form>
	}
}
