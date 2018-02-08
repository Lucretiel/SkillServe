import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import { List } from 'immutable'

import Leaderboard from './Leaderboard.jsx'
import Profile from './Profile.jsx'
import LogoutButton from './LogoutButton.jsx'
import Alerts from './Alerts.jsx'

export default class App extends React.PureComponent {
	constructor(props) {
		super(props)

		this.state = {
			alerts: List([])
		}
	}

	addAlert = alert => this.setState(prevState => ({
		alerts: prevState.alerts.push(alert)
	}))

	dismissAlert = index => this.setState(prevState => ({
		alerts: prevState.alerts.delete(index)
	}))

	render() {
		return <Router>
			<div>
				<Route exact path="/leaderboard/:boardName" render={props =>
					<Leaderboard
						boardName={props.match.params.boardName}
						alert={this.addAlert}
					/>
				}/>
				<Route exact path="/leaderboard/:boardName/profile/:user_id" render={props =>
					<Profile
						boardName={props.match.params.boardName}
						user_id={props.match.params.user_id}
						alert={this.addAlert}
					/>
				}/>
				<Alerts alerts={this.state.alerts} dismiss={this.dismissAlert} />
			</div>
		</Router>
	}
}
