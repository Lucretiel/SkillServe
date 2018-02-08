import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

import { Record, List, Map, Seq } from 'immutable'
import { isArray, isNil, debounce } from 'lodash'

import { withUrl } from 'util/graphql.jsx'
import teamSelectController from 'util/teamSelectController.jsx'

const { query: graphQuery, mutate: graphMutate } = withUrl('/graphql')

const getBoardAndPlayers = graphQuery(`
	query($boardName:String!) {
		board(name:$boardName) {
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

const Player = Record({
	id: null, name: null, skill: null, displaySkill: null, rank: null
})

const processPlayer = rawPlayer => new Player({
	id: rawPlayer.id,
	name: rawPlayer.name,
	skill: rawPlayer.rating.skill,
	displaySkill: rawPlayer.rating.skill.toFixed(0)
})


class TableRow extends React.PureComponent {
	static propTypes = {
		rank: PropTypes.number,
		name: PropTypes.node,
		skill: PropTypes.string,
		button: PropTypes.node,
		children: PropTypes.node,
	}

	render() {
		let { rank="*", name=null, skill=null, button=null, children } = this.props

		children =
			isNil(children) ? [] :
			isArray(children) ? children :
			[children]

		let index = 0
		const trySet = value => isNil(value) && index < children.length ? children[index++] : value
		name = trySet(name)
		button = trySet(button)
		const noSkill = isNil(skill)
		const long = isNil(name) || isNil(button)

		return long ?
			<tr><td key="row" className="align-middle" colSpan="4">{name}</td></tr>:
			<tr>
				<td key="rank" className="align-middle">{rank}</td>
				<td key="name" className="align-middle" colSpan={noSkill ? 2 : null}>{name}</td>
				{noSkill ? null : <td key="skill" className="align-middle">{skill}</td>}
				<td key="button" className="align-middle">{button}</td>
			</tr>
	}
}


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
		return <TableRow>
			<input
				type="text"
				placeholder="Name"
				className="form-control form-control-sm"
				onChange={event => this.setState({name: event.target.value})}
				onBlur={() => empty ? this.props.cancel() : undefined}
				ref={input => input ? input.focus() : undefined}
			/>
			<button
				type="button"
				className="btn btn-primary btn-sm btn-block"
				onClick={() => empty ? undefined : this.props.submit(this.state.name)}
				disabled={empty}
			>
				Create
			</button>
		</TableRow>
	}
}

const idMaker = (() => {
	let id = 0
	return () => (id = (id === 50 ? 0 : id + 1))
})()

const localKey = subKey => boardName => `skillboard::${boardName}::${subKey}`
const playersKey = localKey("players")

const localSavePlayers = debounce(
	(boardName, players) => localStorage.setItem(
		playersKey(boardName),
		JSON.stringify(players.toJS())
	), 500
)

const localLoadPlayers = boardName => (
	Seq(JSON.parse(localStorage.getItem(playersKey(boardName)) || '[]'))
	.map(player => new Player(player))
	.toList()
)

export default class Leaderboard extends React.PureComponent {
	static propTypes = {
		boardName: PropTypes.string.isRequired,
		alert: PropTypes.func.isRequired,
	}

	constructor(props) {
		super(props)

		this.state = {
			newPlayer: false,
			players: localLoadPlayers(props.boardName),
			tempPlayers: List([]),
			maxPlayers: 2,
			maxTeams: 2,
			canTie: false,
			playerTeams: Map([]),
			teamRanks: Map([]),
			working: 0,  // The number of outstanding requests
		}
	}

	webRequest = promise => {
		this.setState(({working}) => ({working: working + 1}))
		return promise
			.catch(error => console.error("UNHANDLED:", error))
			.then(() => this.setState(({working}) => ({working: working - 1})))
	}

	updatePlayers = updater => this.setState((prevState, props) => {
		const newPlayers = updater(prevState.players)
		localSavePlayers(props.boardName, newPlayers)
		return { players: newPlayers }
	})

	setPlayers = newPlayers => this.updatePlayers(() => newPlayers)

	refreshPlayers = () => this.webRequest(getBoardAndPlayers({
		boardName: this.props.boardName
	}).then(({data: {board: {maxPlayers, maxTeams, players, canTie}}}) => {
		this.setState({maxTeams, maxPlayers, canTie})
		this.setPlayers(Seq(players).map(processPlayer).toList())
	}).catch(error => {
		console.error("Error refreshing players", error)
		this.props.alert("Error refreshing players (see console)")
	}))

	createPlayer = playerName => {
		const tempId = `temp-${idMaker()}`

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
								<TableRow key={id} name={name} button="Creating..."/>
							)}
							{this.state.newPlayer ? null :
								<TableRow key="playerEntry">
									<button
										className="btn btn-outline-secondary btn-sm btn-block"
										onClick={() => this.setState({newPlayer: true})}
									>
										New Player...
									</button>
								</TableRow>
							}
							{this.state.newPlayer ?
								<CreatePlayerRow
									cancel={() => this.setState({newPlayer: false})}
									submit={this.createPlayer}
								/> : null
							}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	}
}
