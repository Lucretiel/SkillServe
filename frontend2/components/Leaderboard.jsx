import React from 'react'
import PropTypes from 'prop-types'

import { Record, List } from 'immutable'
import { isArray, isNil } from 'lodash'

import { withUrl } from 'util/graphql.jsx'
import teamSelectController from 'util/teamSelectController.jsx'

const { query: graphQuery, mutate: graphMutate } = withUrl('/graphql')

const getPlayers = graphQuery(`
	query($boardName:String!) {
		board(name:$boardName) {
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

/**
 * Algorithm for cycling buttons:
 * - Determine state of the world, ignoring local button
 * - Determine ideal sequence for local button
 * - Determine current location in sequence
 * - Advance to next step in sequence
 */

export default class Leaderboard extends React.PureComponent {
	static propTypes = {
		boardName: PropTypes.string.isRequired,
	}

	constructor(props) {
		super(props)

		this.state = {
			newPlayer: false,
			players: List([]),
			tempPlayers: List([]),
		}
	}

	refreshPlayers = () => getPlayers({
		boardName: this.props.boardName
	}).then(result => {
		this.setState({players: List(result.data.board.players.map(processPlayer))})
	}).catch(error =>
		console.error("Error refreshing players", error)
	)

	createPlayer = playerName => {
		const tempId = `temp-${idMaker()}`

		this.setState(prevState => ({
			newPlayer: false,
			tempPlayers: prevState.tempPlayers.push(new Player({
				name: playerName,
				id: tempId,
			}))
		}))

		return createPlayer({
			boardName: this.props.boardName,
			name: playerName
		}).then(result =>
			this.setState(prevState => ({
				players: prevState.players.push(processPlayer(result.data.newPlayer))
			}))
		).catch(error =>
			console.error("Error creating player", error)
		).then(() =>
			this.setState(prevState => ({
				tempPlayers: prevState.tempPlayers.filter(player => player.id !== tempId)
			}))
		)
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
					<table className="table table-hover table-sm">
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
								<TableRow key={id} name={name} rank={rank} skill={skill}>
									<button type="button" className="btn btn-block btn-sm btn-outline-secondary">
										Play
									</button>
								</TableRow>
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
