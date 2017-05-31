import React from 'react'
import {connect} from 'react-redux'

import classNames from 'classnames'
import PropTypes from 'prop-types'
import {map} from 'lodash'

import Link from 'router/components/link.jsx'
import Fragment from 'router/components/fragment.jsx'
import { push, replace } from 'router/actions.jsx'
import { selectPathname } from 'router/selectors.jsx'
import {Motion} from 'react-motion'

import { selectPrettyName, doLogout, selectSkill } from 'store/register.jsx'
import Leaderboard from 'components/Leaderboard.jsx'
import Profile from 'components/Profile.jsx'
import {skillSpring} from 'components/util.jsx'
import {formatSkill} from 'util.jsx'

class RouterNav extends React.PureComponent {
	static propTypes = {
		currentPath: PropTypes.string.isRequired,
		pages: PropTypes.arrayOf(
			PropTypes.shape({
				path: PropTypes.string.isRequired,
				label: PropTypes.string.isRequired,
			}).isRequired
		).isRequired,
		prettyName: PropTypes.string.isRequired,
		skill: PropTypes.number.isRequired,
	}

	render() {
		const {currentPath, pages, prettyName, skill} = this.props
		const navItemClass = path => classNames("nav-item", {active: path === currentPath})

		return (
			<nav className="navbar navbar-toggleable navbar-light bg-faded">
				<button className="navbar-toggler navbar-toggler-right" type="button"
				        data-toggle="collapse" data-target="#navbar-collapse-content">
					<span className="navbar-toggler-icon"></span>
				</button>
				<Motion defaultStyle={{animSkill: 0}} style={{animSkill: skillSpring(skill)}}>
					{({animSkill}) =>
						<a className="navbar-brand">
							{prettyName} ({formatSkill({skill: animSkill})})
						</a>
					}
				</Motion>
				<div className="navbar-collapse collapse" id="navbar-collapse-content">
					<ul className="navbar-nav mr-auto">
					{map(pages, ({path, label}) =>
						<li className={navItemClass(path)} key={label}>
							<Link to={path} className="nav-link">
								{label}
							</Link>
						</li>
					)}
					</ul>
				</div>
			</nav>
		)
	}
}

const mu = <i><b>μ</b></i>
const sigma = <i><b>σ</b></i>

@connect(
	state => ({
		currentPath: state.router.location.pathname,
		prettyName: selectPrettyName(state),
		skill: selectSkill(state)}),
	dispatch => ({signOut: () => dispatch(doLogout())})
)
class Body extends React.PureComponent {
	render() {
		const pages = [
			{path: '/main/leaderboard', label: 'Leaderboard'},
			{path: '/main/profile', label: 'Profile'},
			{path: '/main/about', label: 'About'},
		]
		const {currentPath, prettyName, skill} = this.props

		return (
			<div>
				<div className="row">
					<div className="col">
						<RouterNav pages={pages} currentPath={currentPath} prettyName={prettyName} skill={skill}/>
					</div>
				</div>
				<Fragment forRoute='/main/leaderboard'>
					<Leaderboard/>
				</Fragment>
				<Fragment forRoute='/main/profile'>
					<Profile signOut={this.props.signOut} skill={skill}/>
				</Fragment>
				<Fragment forRoute='/main/about'>
					<div>
						<div className="row">
							<div className="col text-justify">
								<p>This crokinole ladder is based on Microsoft's Trueskill
								matchmaking system, which was originally developed for Xbox Live.
								The gist of it is this: each player's rating is measured in skill
								({mu}) and uncertainty ({sigma}). The difference between two
								players' {mu} indicates how likely it is that the higher-rated
								player will win; for instance, a difference of 80 indicates a ~75%
								chance that the higher-rated player will win.</p>
								<p>Because the ratings are only estimates, the value displayed on the
								leaderboard is not your actual {mu} value, but a computed value
								that takes into account both your {mu} and {sigma}. Specifically, it
								is <i>{mu} - 3{sigma}</i>, which is the lower 99.8th percentile. In other
								words, the displayed skill means "the system 99.8% certain that your
								skill is at least this value."</p>
								<p>Note that this means it is possible for you to lose a game but
								still see your skill go up; this can happen because your {mu} went
								down, but your {sigma} went down even more, so your 99.8th
								percentile went up. On average, everyone's skills will increase
								over the course of the week, as the {sigma} values drop across the
								board.</p>
								<p>You can read more about Trueskill <a target="_blank"
								href="http://www.moserware.com/2010/03/computing-your-skill.html">
								here</a> and <a href="http://trueskill.org/" target="_blank">here</a>.</p>
								<p>The underlying trueskill engine is configured using all the defaults
								recommended by Microsoft, except that the draw probability is 0%,
								because there are no draws in Crokinole.</p>
								<p>Everything you see here was custom made by Nathan for beach week.
								Lavish him with praise and feedback but mostly praise.</p>
							</div>
						</div>
						<div className="row">
							<div className="col">
								<img
									src="https://media.tenor.co/images/4a950a1e221d93e654047ecee711af5a/tenor.gif"
									alt="It me" title="It me"
								/>
							</div>
						</div>
					</div>
				</Fragment>
			</div>
		)
	}
}

export default Body
