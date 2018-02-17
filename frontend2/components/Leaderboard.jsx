import React from 'react'
import PropTypes from 'prop-types'
import IPropTypes from 'react-immutable-proptypes'
import { Link } from 'react-router-dom'

import { connect } from 'react-redux'

import { Record, List, Map, Seq } from 'immutable'
import { isArray, isNil, debounce } from 'lodash'

import {
	// Actions
	setBoardInfo,
	addPlayer,
	setPlayers,
	clearBoard,
	rotatePlayer,
	clearGame,

	// Selectors
	getPlayers,
} from 'store/board.jsx'

import { addAlert } from 'store/alerts.jsx'

import { withUrl } from 'util/graphql.jsx'
import teamSelectController from 'util/teamSelectController.jsx'
import { mapStateToProps } from 'util/connectHelpers.jsx'

const { query: graphQuery, mutate: graphMutate } = withUrl('/graphql')

const getBoardAndPlayers = graphQuery(`
	query($boardName:String!) {
		board(name:$boardName) {
			minPlayers
			maxPlayers
			maxTeams
			canTie
			players { id name rating { skill } }
		}
	}
`)

const createPlayer = graphMutate(`
	mutation($boardName:String! $name:String!) {
		newPlayer: createPlayer(
			boardName:$boardName
			name:$name
		) { id name rating { skill } }
	}
`)

class CreatePlayerRow extends React.PureComponent {
	static propTypes = {
		cancel: PropTypes.func.isRequired,
		submit: PropTypes.func.isRequired,
	}

	constructor(props) {
		super(props)
		this.state = {name: ""}
	}

	render() {
		const empty = this.state.name === ""
		return <tr>
			<td></td>
			<td colSpan={2}>
				<input
					type="text"
					placeholder="Name"
					className="form-control form-control-sm"
					onChange={event => this.setState({name: event.target.value})}
					onBlur={() => empty ? this.props.cancel() : undefined}
					ref={input => input ? input.focus() : undefined}
				/>
			</td>
			<td>
				<button
					type="button"
					className="btn btn-primary btn-sm btn-block"
					onClick={() => empty ? undefined : this.props.submit(this.state.name)}
					disabled={empty}
				>
					Create
				</button>
			</td>
		</tr>
	}
}

const connectStore = connect(
	mapStateToProps({players: getPlayers}),
	{ setBoardInfo, addPlayer, setPlayers, clearBoard, rotatePlayer, clearGame, addAlert }
)

class Leaderboard extends React.PureComponent {
	static propTypes = {
		boardName: PropTypes.string.isRequired,

		// From redux
		players: IPropTypes.list.isRequired

		// Actions
		setBoardInfo: PropTypes.func.isRequired,
		addPlayer: PropTypes.func.isRequired,
		setPlayers: PropTypes.func.isRequired,
		clearBoard: PropTypes.func.isRequired,
		rotatePlayer: PropTypes.func.isRequired,
		clearGame: PropTypes.func.isRequired,

		addAlert: PropTypes.func.isRequired
	}

	constructor(props) {
		super(props)

		this.state = {
			newPlayer: false,
			tempPlayers: List(),
			working: 0,  // The number of outstanding requests
		}
	}

	webRequest = promise => {
		this.setState(({working}) => ({working: working + 1}))
		return promise
			.catch(error => console.error("UNHANDLED:", error))
			.then(() => this.setState(({working}) => ({working: working - 1})))
	}

	refreshPlayers = () => this.webRequest(getBoardAndPlayers({
		boardName: this.props.boardName
	}).then(({data: {board: {maxPlayers, maxTeams, players, minPlayers, canTie}}}) => {
		this.props.setBoardInfo({minPlayers, maxPlayers, maxTeams, canTie})
		this.props.setPlayers(Seq(players).map(player => ({
			id: player.id, name: player.name, skill: player.rating.skill
		})))
	}).catch(error => {
		this.props.addAlert("Error refreshing players (see console)")
		console.error("Error refreshing players", error)
	}))

	createPlayer = playerName => {
		const tempId = "TEMP_ID"

		// TODO: THIS IS WHERE YOU LEFT OFF THE PORT TO REDUX. RESUME HERE.
		this.setState(prevState => ({
			newPlayer: false,
			tempPlayers: prevState.tempPlayers.push(new Player({
				name: playerName,
				id: tempId,
			}))
		}))

		return this.webRequest(createPlayer({
			boardName: this.props.boardName,
			name: playerName
		}).then(result => {
			this.updatePlayers(prevPlayers =>
				prevPlayers.push(processPlayer(result.data.newPlayer))
			)
		}).catch(error => {
			console.error("Error creating player", error)
			this.props.alert("Error creating player (see console)")
		}).then(() => {
			this.setState(prevState => ({
				tempPlayers: prevState.tempPlayers.filter(player => player.id !== tempId)
			}))
		}))
	}

	componentDidMount() {
		this.refreshPlayers()
	}

	render() {
		const rankedPlayers = this.state.players
			.toSeq()
			.sortBy(player => -player.displaySkill)
			.update(sortedPlayers => {
				let tieRank = 0
				let prevSkill = null

				return sortedPlayers.map((player, index) =>
					player.set('rank',
						player.displaySkill === prevSkill ? (
							tieRank
						) : (
							prevSkill = player.displaySkill,
							tieRank = index + 1
						)
					)
				)
			})

		return <div className="container">
			<div className="row">
				<div className="col">
					{this.state.working ? "WORKING" : null}
					<table className="table table-hover table-sm" id="leaderboard-table">
						<thead>
							<tr>
								<th scope="col">Rank</th>
								<th scope="col">Player</th>
								<th scope="col">Skill</th>
								<th scope="col">Game</th>
							</tr>
						</thead>
						<tbody>
							{rankedPlayers.map(({id, name, rank, displaySkill: skill}) =>
								<tr key={id}>
									<td>{rank}</td>
									<td>
										<Link to={`/leaderboard/${this.props.boardName}/profile/${id}`}>
											{name}
										</Link>
									</td>
									<td>{skill}</td>
									<td>
										<div className="btn-group-vertical btn-block">
											<button type="button" className="btn btn-block btn-sm btn-outline-secondary">
												Team
											</button>
											<button type="button" className="btn btn-block btn-sm btn-outline-secondary">
												Play
											</button>
										</div>
									</td>
								</tr>
							)}
							{this.state.tempPlayers.map(({id, name}) =>
								<tr key={id}>
									<td></td>
									<td>{name}</td>
									<td colSpan="2">Creating...</td>
								</tr>
							)}
							{this.state.newPlayer ?
								<CreatePlayerRow
									cancel={() => this.setState({newPlayer: false})}
									submit={this.createPlayer}
								/> :
								<tr key="newPlayerButton">
									<td colSpan="4">
										<button
											className="btn btn-outline-secondary btn-sm btn-block"
											onClick={() => this.setState({newPlayer: true})}
										>
											New Player...
										</button>
									</td>
								</tr>
							}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	}
}

export default connectStore(Leaderboard)
