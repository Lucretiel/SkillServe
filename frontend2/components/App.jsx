import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import Leaderboard from 'components/leaderboard/App.jsx'
import Profile from 'components/profile/App.jsx'
import LogoutButton from 'components/LogoutButton.jsx'

export default class App extends React.PureComponent {
	render() {
		return <Router>
			<div>
				<Route exact path="/leaderboard/:boardName" render={props =>
					<Leaderboard boardName={props.match.params.boardName} />
				}/>
				<Route exact path="/leaderboard/:boardName/profile/:user_id" render={props =>
					<Profile
						boardName={props.match.params.boardName}
						user_id={props.match.params.user_id}
					/>
				}/>
			</div>
		</Router>
	}
}
