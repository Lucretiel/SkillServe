import React from 'react'
import PropTypes from 'prop-types'
import IPropTypes from 'react-immutable-proptypes'
import classNames from 'classnames'
import { Link } from 'react-router-dom'

import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { Seq } from 'immutable'

import {
	// Actions
	setBoardInfo,
	addPlayer,
	setPlayers,
	clearBoard,
	rotatePlayer,
	clearGame,
} from 'store/board.jsx'

import { addAlert } from 'store/alerts.jsx'
import { withUrl } from 'util/graphql.jsx'

const { query: graphQuery, mutate: graphMutate } = withUrl('/graphql')

const getBoardAndPlayers = graphQuery(`
	query($boardName:String!) {
		board(name:$boardName) {
			info {
				minPlayers
				maxPlayers
				maxTeams
				canTie
			}
			players {
				id
				name
				rating { skill }
			}
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

const autofocus = ref => ref ? ref.focus() : null
const noOp = () => undefined

const selectBoard = state => state.board
const selectPlayers = createSelector(selectBoard, board => board.players)
const selectPlayerNames = createSelector(selectPlayers, players =>
	Seq(players).map(player => player.name).toSet()
)
const selectPlayerTeams = createSelector(selectBoard, board => board.currentGame.playerRanks)
const selectBoardInfo = createSelector(selectBoard, board => board.info)
const selectPlayersWithTeams = createSelector(
	selectPlayers, selectPlayerTeams,
	(players, playerTeams) =>
		players.map(player =>
			player.set('teamId', playerTeams.get(player.id, null))
		)
)
const selectTeamsFull = createSelector(
	selectBoardInfo, selectPlayerTeams,
	({maxPlayers, maxTeams}, playerTeams) => playerTeams.size >= maxPlayers * maxTeams
)
const selectTwoPlayerTie = createSelector(
	selectPlayerTeams,
	playerTeams => playerTeams.size === 2 && playerTeams.first() === playerTeams.last()
)


class BaseCreatePlayerRow extends React.PureComponent {
	static propTypes = {
		cancel: PropTypes.func.isRequired,
		submit: PropTypes.func.isRequired,

		submitted: PropTypes.bool.isRequired,
		existingNames: IPropTypes.setOf(PropTypes.string.isRequired).isRequired
	}

	constructor(props) {
		super(props)
		this.state = {name: ""}
	}

	nameIsEmpty = () => this.state.name === ""
	nameExists = () => this.props.existingNames.has(this.state.name)
	nameIsValid = () => !this.nameIsEmpty() && !this.nameExists()
	nameIsInvalid = () => !this.nameIsEmpty() && this.nameExists()

	onChange = event => {
		if(!this.props.submitted)
			this.setState({name: event.target.value})
	}

	onUnfocus = () => {
		if(!this.props.submitted && this.nameIsEmpty())
			this.props.cancel()
	}

	onSubmit = () => {
		if(!this.props.submitted && this.nameIsValid())
			this.props.submit(this.state.name)
	}

	render() {
		const inputClass = classNames("form-control form-control-sm", {
			'disabled': this.props.submitted,
			'is-valid': this.nameIsValid(),
			'is-invalid': this.nameIsInvalid(),
		})

		const buttonClass = classNames("btn btn-primary btn-sm btn-block", {
			'disabled': this.props.submitted || !this.nameIsValid(),
		})

		return <tr>
			<td></td>
			<td colSpan={2}>
				<input
					type="text"
					placeholder="Name"
					className={inputClass}
					onChange={this.onChange}
					onBlur={this.onUnfocus}
					value={this.state.name}
					ref={autofocus}
					disabled={this.props.submitted}
				/>
			</td>
			<td>
				<button
					type="button"
					className={buttonClass}
					onClick={this.onSubmit}
					disabled={this.nameIsEmpty() || this.props.submitted}
				>
					Join
				</button>
			</td>
		</tr>
	}
}

const CreatePlayerRow = connect(
	state => ({existingNames: selectPlayerNames(state)}),
	dispatch => ({})
)(BaseCreatePlayerRow)


class BasePlayerButton extends React.PureComponent {
	static propTypes = {
		teamId: PropTypes.number,
		playerId: PropTypes.number.isRequired,

		// From redux
		canTie: PropTypes.bool.isRequired,
		maxTeams: PropTypes.number.isRequired,
		twoPlayerTie: PropTypes.bool.isRequired,
		teamsFull: PropTypes.bool.isRequired,

		rotatePlayer: PropTypes.func.isRequired,
	}

	handleClick = () => this.props.rotatePlayer(this.props.playerId)

	render() {
		const {
			teamId,
			canTie,
			maxTeams,
			twoPlayerTie,
			teamsFull
		} = this.props

		const btnClass = classNames("btn btn-block btn-sm", {
			"btn-light-outline": teamId === null && teamsFull,
			"btn-light": teamId === null && !teamsFull,
			"btn-success": teamId === 0,
			"btn-danger": teamId !== null && teamId > 0,
			"disabled": teamId === null && teamsFull,
		})

		const buttonText =
			teamId === null ?
				teamsFull ? "Full" : "Play" :
			maxTeams === 2 ?
				canTie && twoPlayerTie ? "Tie" :
				teamId === 0 ? "Win" :
				"Lose" :
			canTie ?
				`Rank ${teamId + 1}` :
				`Team ${teamId + 1}`

		return <button
			type="button"
			className={btnClass}
			disabled={teamsFull && teamId === null}
			onClick={this.handleClick}
		>
			{buttonText}
		</button>
	}
}

const PlayerButton = connect(
	state => ({
		teamsFull: selectTeamsFull(state),
		canTie: selectBoardInfo(state).canTie,
		maxTeams: selectBoardInfo(state).maxTeams,
		twoPlayerTie: selectTwoPlayerTie(state),
	}),
	{ rotatePlayer },
)(BasePlayerButton)


const normalizeRawPlayer = player => (
	{id: player.id, name: player.name, skill: player.rating.skill}
)

const newPlayerState = Object.freeze({
	idle: 0,
	prompting: 1,
	creating: 2,
})

const connectStore = connect(
	state => ({
		players: selectPlayersWithTeams(state),
		playerTeams: state.board.currentGame.playerRanks}),
	{ setBoardInfo, addPlayer, setPlayers, clearBoard, rotatePlayer, addAlert }
)

class Leaderboard extends React.PureComponent {
	static propTypes = {
		boardName: PropTypes.string.isRequired,

		// From redux
		players: IPropTypes.list.isRequired,

		// Actions
		setBoardInfo: PropTypes.func.isRequired,
		addPlayer: PropTypes.func.isRequired,
		setPlayers: PropTypes.func.isRequired,
		clearBoard: PropTypes.func.isRequired,

		addAlert: PropTypes.func.isRequired
	}

	constructor(props) {
		super(props)

		this.state = {
			newPlayer: newPlayerState.idle,
			working: 0,  // The number of outstanding requests
		}
	}

	// Wrap a promise to update this.state.working before and after the promise
	webRequest = promise => {
		this.setState(({working}) => ({working: working + 1}))
		return promise
			.catch(error => { this.props.addAlert(`UNHANDLED WEB REQUEST ERROR: ${error}`) })
			.then(() => { this.setState(({working}) => ({working: working - 1})) })
	}

	refreshPlayers = () => {
		this.webRequest(getBoardAndPlayers({
			boardName: this.props.boardName
		}).then(({data: {board: {info, players}}}) => {
			this.props.setBoardInfo(info)
			this.props.setPlayers(Seq(players).map(normalizeRawPlayer))
		}).catch(error => {
			this.props.addAlert("Error refreshing players (see console)")
			console.error("Error refreshing players", error)
		}))
	}

	createPlayer = playerName => {
		this.setState({newPlayer: newPlayerState.creating})
		this.webRequest(createPlayer({
			boardName: this.props.boardName,
			name: playerName
		}).then(result => {
			this.props.addPlayer(normalizeRawPlayer(result.data.newPlayer))
		}).catch(error => {
			console.error("Error creating player", error)
			this.props.alert("Error creating player (see console)")
		}).then(() => {
			this.setState({newPlayer: newPlayerState.idle})
		}))
	}

	componentDidMount() {
		this.refreshPlayers()
	}

	render() {
		const players = this.props.players
		const playerTeams = this.props.playerTeams

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
							{players.map(({id, name, rank, displaySkill, teamId}) =>
								<tr key={id}>
									<td>{rank}</td>
									<td>
										<Link to={`/leaderboard/${this.props.boardName}/profile/${id}`}>
											{name}
										</Link>
									</td>
									<td>{displaySkill}</td>
									<td>
										<PlayerButton teamId={teamId} playerId={id} />
									</td>
								</tr>
							)}
							{this.state.newPlayer !== newPlayerState.idle ?
								<CreatePlayerRow
									cancel={() => this.setState({newPlayer: newPlayerState.idle})}
									submit={this.createPlayer}
									submitted={this.state.newPlayer === newPlayerState.creating}
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
