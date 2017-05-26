import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import classNames from 'classnames'
import {doLogin, selectAuthStatus, selectUnauthError} from 'store/register.jsx'
import {form} from 'store/form.jsx'

class FormGroup extends React.PureComponent {
	static propTypes = {
		inputId: PropTypes.string.isRequired,
		placeholder: PropTypes.string.isRequired,
		header: PropTypes.string.isRequired,
		value: PropTypes.string.isRequired,
		onChange: PropTypes.func.isRequired,
	}

	render() {
		const {
			inputId, placeholder, header, value, onChange
		} = this.props

		return (
			<div className="form-group row">
				<label htmlFor={inputId} className="col-md-2 text-right col-form-label hidden-sm-down">
					{header}
				</label>
				<label htmlFor={inputId} className="col-md-2 col-form-label hidden-md-up">
					{header}
				</label>
				<div className="col-md-10">
					<input type="text" className="form-control" id={inputId}
					       placeholder={placeholder} value={value}
						     onChange={event => onChange(event.target.value)}/>
				</div>
			</div>
		)
	}
}

class ErrorBubble extends React.PureComponent {
	static propTypes = {
		error: PropTypes.string
	}

	render() {
		const {error} = this.props

		return error == null ? null :
			<div className='alert alert-danger'>{error}</div>
	}
}

class SignInForm extends React.PureComponent {
	static propTypes = {
		submit: PropTypes.func.isRequired,
		submitting: PropTypes.bool.isRequired,
		error: PropTypes.string,

		username: PropTypes.string.isRequired,
		leaderboard: PropTypes.string.isRequired,
		prettyName: PropTypes.string.isRequired,

		updateLeaderboard: PropTypes.func.isRequired,
		updateUsername: PropTypes.func.isRequired,
		updateLeaderboard: PropTypes.func.isRequired,
	}

	submit = event => {
		const {leaderboard, username, prettyName} = this.props
		this.props.submit({leaderboard, username, prettyName})
		event.preventDefault()
	}

	render() {
		const {
			leaderboard, username, prettyName, error, submitting,
			updateLeaderboard, updateUsername, updatePrettyName
		} = this.props

		const buttonClass = classNames(
			"btn", "btn-primary", "btn-block",
			{disabled: submitting}
		)

		return (
			<form>
				<FormGroup inputId="leaderboard-input" placeholder="Ask Nathan"
				           header="Leaderboard" value={leaderboard}
				           onChange={updateLeaderboard}
				/>
				<FormGroup inputId="pretty-name-input" placeholder="Arthur Galpin"
				           header="Name" value={prettyName}
				           onChange={updatePrettyName}
				/>
				<FormGroup inputId="username-input" placeholder="arthurg"
				           header="Username" value={username}
				           onChange={updateUsername}
				/>
				<ErrorBubble error={error} />
				<button className={buttonClass} type="submit" onClick={submitting ? undefined : this.submit}>
					{submitting ? "Signing in..." : "Sign In"}
				</button>
			</form>
		)
	}
}

export default connect(
	state => ({
		submitting: selectAuthStatus.is.attemptingAuth(state),
		error: selectUnauthError(state),

		leaderboard: state.form.leaderboard,
		username: state.form.username,
		prettyName: state.form.prettyName
	}),
	{
		submit: credentials => doLogin({credentials}),
		updateLeaderboard: form.setLeaderboard,
		updateUsername: form.setUsername,
		updatePrettyName: form.setPrettyName,
	}
)(SignInForm)
