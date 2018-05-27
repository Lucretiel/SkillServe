import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import classNames from 'classnames'
import {doLogin, selectAuthStatus, selectUnauthError} from 'store/register.jsx'
import {form} from 'store/form.jsx'
import {apiFetch} from 'store/util.jsx'

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

	constructor(props) {
		super(props)

		this.state = {
			players: []
		}
	}

	submit = event => {
		const {leaderboard, username, prettyName} = this.props
		this.props.submit({leaderboard, username, prettyName})
		event.preventDefault()
	}

	componentDidMount() {
		apiFetch({path: 'boards/BWC/players/'})
		.then(response => {
			if(!response.ok) {
				throw new Error("Couldn't get user list")
			}
			return response.json()
		})
		.then(data => {
			this.setState({players: data.map(player => ({
				username: player.username,
				print_name: player.print_name,
			}))})
		})
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

		return <div>
			<form>
				<FormGroup inputId="leaderboard-input" placeholder="Type in BWC"
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
			<table className="table table-striped table-sm table-hover" id="user-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Username</th>
					</tr>
				</thead>
				<tbody>
					{this.state.players.map(player => <tr>
						<td>{player.print_name}</td>
						<td>{player.username}</td>
					</tr>)}
				</tbody>
			</table>
		</div>
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
