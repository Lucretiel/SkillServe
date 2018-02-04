import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'

export default class App extends React.PureComponent {
	render() {
		return <Router>
			<div className="stretch-container">
				<div>APP</div>
				<div className="container">
					<div className="row">
						<div className="col">
							LOGOUT BUTTON
						</div>
					</div>
				</div>
			</div>
		</Router>
	}
}
