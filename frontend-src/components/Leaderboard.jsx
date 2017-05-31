import React from 'react'
import {createSelector} from 'reselect'
import classNames from 'classnames'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import {selectPlayers, refreshLeaderboard} from 'store/leaderboard.jsx'
import {selectLeaderboard, selectUsername} from 'store/register.jsx'
import {submitFullGame} from 'store/submit_game.jsx'
import {map, some as any, find, without, includes, join} from 'lodash'
import {Motion} from 'react-motion'
import { selectFragment } from "router/selectors.jsx"
import { replace } from "router/actions.jsx"

import {skillSpring} from 'components/util.jsx'
import {formatSkill} from 'util.jsx'
import FlipMove from 'react-flip-move';

export const playerShape = PropTypes.shape({
	prettyName: PropTypes.string.isRequired,
	skill: PropTypes.number.isRequired,
	isProvisional: PropTypes.bool.isRequired,
	username: PropTypes.string.isRequired,
	rank: PropTypes.number,
	displaySkill: PropTypes.string.isRequired
})

const playerArray = PropTypes.arrayOf(playerShape.isRequired)

const selectHighlighted = createSelector(selectFragment, fragment => {
	const match = fragment.match(/^highlight=(([a-zA-Z0-9-_]+,)+)$/)
	return match ? match[1].split(',') : []
})

@connect(
	state => ({highlighted: selectHighlighted(state)}),
	dispatch => ({replaceLoc: loc => dispatch(replace({path: loc}))})
)
class PlayerTable extends React.PureComponent {
	static propTypes = {
		players: playerArray.isRequired,
		currentUsername: PropTypes.string.isRequired,
		rotatePlayer: PropTypes.func.isRequired,
		winners: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
		losers: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
		highlighted: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
		replaceLoc: PropTypes.func.isRequired,
	}

	isWinner = username => includes(this.props.winners, username)
	isLoser = username => includes(this.props.losers, username)
	allFull = () => this.props.winners.length + this.props.losers.length >= 4

	buttonForPlayer = username => (
		this.isWinner(username) ?
			<button className="btn btn-success btn-sm btn-block" onClick={() => this.props.rotatePlayer(username)}>
				Won
			</button> :
		this.isLoser(username) ?
			<button className="btn btn-danger btn-sm btn-block" onClick={() => this.props.rotatePlayer(username)}>
				Lost
			</button> :
		!this.allFull() ?
			<button className="btn btn-secondary btn-sm btn-block" onClick={() => this.props.rotatePlayer(username)}>
				Play
			</button> :
			<button className="btn btn-sm btn-block" disabled>
				Full
			</button>
	)

	highlight = username =>
		this.props.replaceLoc({
			hash: 'highlight=' + join([...this.props.highlighted, username], ',')
		})

	unHighlight = username =>
		this.props.replaceLoc({
			hash: 'highlight=' + join(without(this.props.highlighted, username), ',')
		})

	isHighlighted = username =>
		includes(this.props.highlighted, username)

	render() {
		const {players, currentUsername} = this.props

		return <table className="table table-hover table-sm">
			<thead>
				<tr>
					<th>Rank</th>
					<th>Player</th>
					<th>Skill</th>
					<th>Game</th>
				</tr>
			</thead>
			{players.length !== 0 ?
				<FlipMove duration={750} typeName="tbody">
					{map(players, ({username, prettyName, rank, skill, quality, isProvisional}) =>
						<tr
							key={username} className={
								(username === currentUsername ? 'table-warning ' : '') +
								(includes(this.props.highlighted) ? 'table-info ' : '')}
							onClick={this.isHighlighted(username) ?
								() => this.unHighlight(username) :
								() => this.highlight(username)
							}
						>
							<td>{rank}</td>
							<td>{prettyName}</td>
							<td>
								<Motion style={{skill: skillSpring(skill)}}>
									{({skill}) =>
										<span>{
											formatSkill({skill, isProvisional})
										}</span>
									}
								</Motion>
							</td>
							<td>
								{this.buttonForPlayer(username)}
							</td>
						</tr>
					)}
				</FlipMove> :
				<tbody></tbody>
			}
		</table>
	}
}

@connect(
	state => ({
		players: selectPlayers(state),
		leaderboard: selectLeaderboard(state),
		currentUsername: selectUsername(state),
	}),
	dispatch => ({
		refreshPlayers: leaderboard => dispatch(refreshLeaderboard({leaderboard})),
		submitFullGame: ({winners, losers, leaderboard}) => dispatch(submitFullGame({winners, losers, leaderboard})),
	}))
class Leaderboard extends React.PureComponent {
	static propTypes = {
		players: playerArray.isRequired,
		leaderboard: PropTypes.string.isRequired,
		currentUsername: PropTypes.string.isRequired,
		refreshPlayers: PropTypes.func.isRequired,
		submitFullGame: PropTypes.func.isRequired
	}

	state = {
		winners: [],
		losers: []
	}

	winnersFull = () => this.state.winners.length === 2
	losersFull = () => this.state.losers.length === 2
	allFull = () => this.winnersFull() && this.losersFull()
	totalPlayers = () => this.state.winners.length + this.state.losers.length
	buttonReady = () => this.state.winners.length === this.state.losers.length && this.state.winners.length > 0

	moreWinners = () => this.state.winners.length > this.state.losers.length
	moreLosers = () => this.state.losers.length > this.state.winners.length

	isWinner = username => includes(this.state.winners, username)
	isLoser = username => includes(this.state.losers, username)

	fromWinner = username => this.setState({
		winners: without(this.state.winners, username)
	})

	fromLoser = username => this.setState({
		losers: without(this.state.losers, username)
	})

	toLoser = username => this.setState({
		losers: [...this.state.losers, username]
	})

	toWinner = username => this.setState({
		winners: [...this.state.winners, username]
	})

	rotateOrdering = () => this.totalPlayers() % 2 === 0 ? 1 : -1

	rotatePlayer = username => {
		if(this.isWinner(username)) {
			this.fromWinner(username)
			if(this.rotateOrdering() === -1 && !this.losersFull()) {
				this.toLoser(username)
			}
		} else if(this.isLoser(username)) {
			this.fromLoser(username)
			if(this.rotateOrdering() === 1 && !this.winnersFull()) {
				this.toWinner(username)
			}
		} else if(this.winnersFull()) {
			this.toLoser(username)
		} else if(this.losersFull()) {
			this.toWinner(username)
		} else if(this.rotateOrdering() === 1) {
			this.toWinner(username)
		} else {
			this.toLoser(username)
		}
	}

	submitGame = () => {
		this.props.submitFullGame({
			winners: this.state.winners,
			losers: this.state.losers,
			leaderboard: this.props.leaderboard,
		})

		this.setState({
			winners: [],
			losers: []
		})
	}

	refreshPlayers = () => this.props.refreshPlayers(this.props.leaderboard)

	componentWillMount() {
		this.refreshPlayers()
	}

	render() {
		const {players, signOut, currentUsername} = this.props

		return <div className="container-fluid pt-2 px-0">
			<div className="row">
				<div className="col">
					<PlayerTable
						players={players} currentUsername={currentUsername}
						winners={this.state.winners} losers={this.state.losers}
						rotatePlayer={this.rotatePlayer}/>
				</div>
			</div>

			{any(players, player => player.isProvisional) ?
				<div className="row">
					<div className="col">
						<p><small>
							* Provisional: need to play more games so your skill can be calculated.
						</small></p>
					</div>
				</div> : null
			}

			<div className="row pb=2">
				<div className="col">
					<button className="btn btn-primary mr-2" type="button" onClick={this.refreshPlayers}>
						Refresh
					</button>
					{this.buttonReady() ?
						<button className="btn btn-primary mr-2" type="button" onClick={this.submitGame}>
							Submit Game
						</button> :
						<button className="btn btn-secondary mr-2" type="button" disabled>
							Submit Game
						</button>
					}
				</div>
			</div>
		</div>
	}
}

export default Leaderboard
