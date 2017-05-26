import React from 'react'
import {createSelector} from 'reselect'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import {selectPlayers, refreshLeaderboard} from 'store/leaderboard.jsx'
import {selectLeaderboard, selectUsername} from 'store/register.jsx'
import {map, some as any, find} from 'lodash'

export const playerShape = PropTypes.shape({
	prettyName: PropTypes.string.isRequired,
	skill: PropTypes.number.isRequired,
	isProvisional: PropTypes.bool.isRequired,
	username: PropTypes.string.isRequired,
	rank: PropTypes.number,
	displaySkill: PropTypes.string.isRequired
})

const playerArray = PropTypes.arrayOf(playerShape.isRequired)

class PlayerTable extends React.PureComponent {
	static propTypes = {
		players: playerArray.isRequired,
		currentUsername: PropTypes.string.isRequired
	}

	render() {
		const {players, currentUsername} = this.props

		return <table className="table table-hover table-sm">
			<thead>
				<tr>
					<th>Rank</th>
					<th>Player</th>
					<th>Skill</th>
				</tr>
			</thead>
			<tbody>
				{map(players, ({username, prettyName, rank, displaySkill, quality}) =>
					<tr key={username} className={username === currentUsername ? 'table-warning' : ''}>
						<td>{rank}</td>
						<td>{prettyName}</td>
						<td>{displaySkill}</td>
					</tr>
				)}
			</tbody>
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
		refreshPlayers: leaderboard => dispatch(refreshLeaderboard(leaderboard))
	}))
class Leaderboard extends React.PureComponent {
	static propTypes = {
		players: playerArray.isRequired,
		leaderboard: PropTypes.string.isRequired,
		currentUsername: PropTypes.string.isRequired,
		refreshPlayers: PropTypes.func.isRequired,
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
					<PlayerTable players={players} currentUsername={currentUsername}/>
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

			<div className="row">
				<div className="col">
					<button className="btn btn-primary mr-1" type="button" onClick={this.refreshPlayers}>
						Refresh
					</button>
				</div>
			</div>
		</div>
	}
}

export default Leaderboard
