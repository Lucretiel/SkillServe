"use strict"

import React from 'react'
import {connect} from 'react-redux'
import PropTypes from 'prop-types'

import SignInForm from 'components/SignInForm.jsx'
import Body from 'components/Body.jsx'
import { selectIsAuthenticated } from 'store/register.jsx'
import Fragment from 'router/components/fragment.jsx'

@connect(state => ({isAuthenticated: selectIsAuthenticated(state)}))
class App extends React.PureComponent {
	static propTypes = {
		isAuthenticated: PropTypes.bool.isRequired
	}

	render() {
		const {isAuthenticated} = this.props
		return (
			<div>
				<div className="container">
					<div className="row">
						<div className="col">
							<h1 className="text-sm-left text-center">
								Crokinole Ladder <br className="hidden-md-up"/>
								<small className="text-muted">Beach Week 2017</small>
							</h1>
						</div>
					</div>
					<Fragment forRoute="/login">
						<div className="col">
							<SignInForm />
						</div>
					</Fragment>
					{isAuthenticated ?
						<Fragment forRoute="/main*">
							<Body />
						</Fragment> : null
					}
				</div>
				<footer className="footer mt-2 text-center">
					<small>
						<a href="https://paper.dropbox.com/doc/Beach-Week-Crokinole-Rules-JhpiBUr8YFZ2aVtZcEwH0" target="_blank">
							Official Beach Week Crokinole Rules
						</a>
					</small>
				</footer>
			</div>
		)
	}
}

export default App
