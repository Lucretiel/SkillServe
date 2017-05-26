import React from "react"
import {connect} from 'react-redux'
import PropTypes from "prop-types"
import classNames from "classnames"
import format from 'date-fns/format'
import {keyBy, debounce} from "lodash"
import {Motion} from 'react-motion'

import {skillSpring} from 'components/util.jsx'
import {formatSkill} from 'util.jsx'

import {refreshRecent, selectRecentGame} from 'store/recent_game.jsx'
import {selectLeaderboard, selectUsername, refreshUser, selectStats} from 'store/register.jsx'
import {selectPlayersByName} from "store/leaderboard.jsx"

class StatBlock extends React.PureComponent {
	static propTypes = {
		title: PropTypes.string.isRequired,
		body: PropTypes.node.isRequired,
	}

	render() {
		return <div className="card bg-faded">
			<div className="card-block" style={{padding: "0.5rem", paddingLeft: "1rem"}}>
				<span className="card-text"><small>{this.props.title}</small><br /><b>{this.props.body}</b></span>
			</div>
		</div>
	}
}

const tiers = {
	tier1: 7.988,
	tier2: 12.892,
	tier3: 17.108,
	tier4: 22.012,
	tier5: 50,
}

const tierWidths = {
	tier1: tiers.tier1,
	tier2: tiers.tier2 - tiers.tier1,
	tier3: tiers.tier3 - tiers.tier2,
	tier4: tiers.tier4 - tiers.tier3,
	tier5: tiers.tier5 - tiers.tier4,
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
		const t = tiers
		const w = tierWidths

		const progressClass = classNames("progress-bar", "mr-2", {
			'bronze-bg': skill < t.tier1,
			'silver-bg': t.tier1 <= skill && skill < t.tier2,
			'gold-bg': t.tier2 <= skill && skill < t.tier3,
			'platinum-bg': t.tier3 <= skill && skill < t.tier4,
			'diamond-bg': t.tier4 <= skill
		})

		const progressWidth = 100 * (
			skill < 0 ? 0 :
			skill < t.tier1 ? skill / w.tier1 :
			skill < t.tier2 ? (skill - t.tier1) / w.tier2 :
			skill < t.tier3 ? (skill - t.tier2) / w.tier3 :
			skill < t.tier4 ? (skill - t.tier3) / w.tier4 :
			skill < t.tier5 ? (skill - t.tier4) / w.tier5 :
			1
		)

		const progressTarget =
			skill < t.tier1 ? t.tier1 :
			skill < t.tier2 ? t.tier2 :
			skill < t.tier3 ? t.tier3 :
			skill < t.tier4 ? t.tier4 :
			tier5

		const progressStyle = {width: `${progressWidth}%`}

		const tierName =
			skill < t.tier1 ? 'Bronze' :
			skill < t.tier2 ? 'Silver' :
			skill < t.tier3 ? 'Gold' :
			skill < t.tier4 ? 'Platinum' :
			'Diamond'

		const progressFraction = this.state.valueHidden ? null :
			`${formatSkill({skill})} / ${formatSkill({skill: progressTarget})} | ${tierName} tier`

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
					<Motion defaultStyle={{skill: 0}} style={{skill: skillSpring(skill)}}>
						{({skill}) => <SkillBar skill={skill} />}
					</Motion>
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
