import React from "react"
import {connect} from 'react-redux'
import PropTypes from "prop-types"
import classNames from "classnames"
import format from 'date-fns/format'
import {keyBy, debounce} from "lodash"

import {skillSpring} from 'components/util.jsx'
import {formatSkill} from 'util.jsx'

import {refreshRecent, selectRecentGame} from 'store/recent_game.jsx'
import {selectLeaderboard, selectUsername, refreshUser, selectStats} from 'store/register.jsx'
import {selectPlayersByName} from "store/leaderboard.jsx"

class StatBlock extends React.PureComponent {
	static propTypes = {
		title: PropTypes.string.isRequired,
		body: PropTypes.string.isRequired,
	}

	render() {
		return <div className="card bg-faded">
			<div className="card-block" style={{padding: "0.5rem", paddingLeft: "1rem"}}>
				<span className="card-text"><small>{this.props.title}</small><br /><b>{this.props.body}</b></span>
			</div>
		</div>
	}
}

class SkillBar extends React.PureComponent {
	static propTypes = {
		skill: PropTypes.number.isRequired
	}

	state = {
		valueHidden: false
	}

	hideValue = () => this.setState({valueHidden: true})
	unhideValue = () => this.setState({valueHidden: false})
	debounceUnhideValue = debounce(this.unhideValue, 100)

	componentWillReceiveProps(newProps) {
		const newSkill = newProps.skill
		const oldSkill = this.props.skill

		if(newSkill != oldSkill) {
			this.hideValue()
			this.debounceUnhideValue()
		}
	}

	render() {
		const skill = this.props.skill

		const progressClass = classNames("progress-bar", "mr-2", {
			'bg-danger': skill < 6,
			'bg-warning': 6 <= skill && skill < 14,
			'bg-success': 14 <= skill && skill < 24,
			'bg-info': 24 <= skill && skill < 36,
		})

		const progressWidth = 100 * (
			skill < 0 ? 0 :
			skill < 6 ? skill / 6 :
			skill < 14 ? (skill - 6) / 8 :
			skill < 24 ? (skill - 14) / 10 :
			skill < 36 ? (skill - 24) / 12 :
			skill < 50 ? (skill - 36) / 14 :
			1
		)

		const progressTarget =
			skill < 6 ? 6 :
			skill < 14 ? 14 :
			skill < 24 ? 24 :
			skill < 36 ? 36 :
			skill < 50 ? 50 :
			100

		const progressStyle = {width: `${progressWidth}%`}

		const progressFraction = this.state.valueHidden ? null :
			`${formatSkill({skill})} / ${formatSkill({skill: progressTarget})}`

		return <div className="progress">
			<div className={progressClass} style={progressStyle}>
				{progressWidth >= 40 ? progressFraction : null}
			</div>
			{progressWidth < 40 ? progressFraction : null}
		</div>
	}
}

const recentGameShape = PropTypes.shape({
	time: PropTypes.string.isRequired,
	teams: PropTypes.arrayOf(
		PropTypes.shape({
			rank: PropTypes.number.isRequired,
			players: PropTypes.arrayOf(
				PropTypes.shape({
					username: PropTypes.string.isRequired,
				}).isRequired
			).isRequired
		}).isRequired
	).isRequired
})

@connect(state => ({playerList: selectPlayersByName(state)}))
class RecentGame extends React.PureComponent {
	static propTypes = {
		game: recentGameShape.isRequired
	}

	emitTeam = function*(team, event) {
		for(const {username} of team.players) {
			const {prettyName, displaySkill} = this.props.playerList[username]
			yield (<span key={`${username}-span`}>
				{prettyName}
			</span>)
			yield (<br key={`${username}-br`} />)
		}

		yield (
			<span className="hidden-sm-up" key="event">
				<b>{event}</b>
			</span>
		)
	}

	render() {
		const gameTime = format(new Date(this.props.game.time), 'dddd @ h:mm A')
		const {winners, losers} = keyBy(this.props.game.teams,
			team => team.rank === 0 ? "winners" : "losers")

		return <div className="card">
			<h5 className="card-header text-sm-left text-center">
				Recent Game <br className="hidden-sm-up"/>
				<small className="card-subtitle text-muted ">{gameTime}</small>
			</h5>
			<div className="card-block">
				<div className="card-text text-sm-left">
					<div className="row">
						<div className="col-6 col-sm-4 text-right">
							{Array.from(this.emitTeam(winners, "Won"))}
						</div>
						<div className="col-sm-2 hidden-xs-down">
							<span><b>Won</b></span>
						</div>
						<div className="col-sm-2 hidden-xs-down text-right">
							<span><b>Lost</b></span>
						</div>
						<div className="col-6 col-sm-4">
							{Array.from(this.emitTeam(losers, "Lost"))}
						</div>
					</div>
				</div>
			</div>
	</div>
	}
}

@connect(
	state => ({
		leaderboard: selectLeaderboard(state),
		username: selectUsername(state),
		recentGame: selectRecentGame(state),
		stats: selectStats(state),
	}),
	dispatch => ({
		refresh: ({username, leaderboard}) => {
			dispatch(refreshRecent({username, leaderboard}))
			dispatch(refreshUser())
		}
	}),
)
class Profile extends React.PureComponent {
	static propTypes = {
		signOut: PropTypes.func.isRequired,
		skill: PropTypes.number.isRequired,
		leaderboard: PropTypes.string.isRequired,
		username: PropTypes.string.isRequired,
		refresh: PropTypes.func.isRequired,
		recentGame: recentGameShape,
		stats: PropTypes.shape({
			wins: PropTypes.number.isRequired,
			losses: PropTypes.number.isRequired,
			games: PropTypes.number.isRequired,
		}).isRequired
	}

	componentDidMount() {
		this.props.refresh(this.props)
	}

	render() {
		const {skill, signOut, username, stats} = this.props

		return <div className="container-fluid pt-2 px-0">
			<div className="row pb-2">
				<div className="col">
					<SkillBar skill={skill} />
				</div>
			</div>
			<div className="row">
				<div className="col">
					<StatBlock title="Games" body={stats.games} />
				</div>
				<div className="col">
					<StatBlock title="Wins" body={stats.wins} />
				</div>
				<div className="col">
					<StatBlock title="Losses" body={stats.losses} />
				</div>
			</div>
			{this.props.recentGame ?
				<div className="row pt-2">
					<div className="col">
						<RecentGame game={this.props.recentGame} playerList={this.props.playerList}/>
					</div>
				</div> : null
			}
			<div className="row pt-2">
				<div className="col">
					<button type="button" onClick={signOut} className="btn btn-danger">
						Sign Out
					</button>
				</div>
			</div>
		</div>
	}
}

export default Profile
