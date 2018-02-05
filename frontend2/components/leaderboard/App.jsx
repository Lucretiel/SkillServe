import React from 'react'
import PropTypes from 'prop-types'

import { sortBy } from 'lodash'

import { query as graphQuery, mutate as graphMutate } from 'util/graphql.jsx'

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

const processPlayer = player => ({
	id: player.id,
	name: player.name,
	skill: player.rating.skill,
	displaySkill: player.rating.skill.toFixed(0)
})

const rankPlayers = sortedPlayers => {
	let tieRank = 0
	let prevSkill = null

	return sortedPlayers.map(({id, name, skill, displaySkill}, index) => ({
		id, name, skill, displaySkill,
		rank: displaySkill === prevSkill ? (
			tieRank
		) : (
			prevSkill = displaySkill,
			tieRank = index + 1
		)
	}))
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
		return <tr key="newPlayer">
			<td className="align-middle">*</td>
			<td className="align-middle" colSpan="2">
				<input
					type="text"
					placeholder="Name"
					className="form-control form-control-sm"
					onChange={event => this.setState({name: event.target.value})}
					onBlur={() => empty ? this.props.cancel() : undefined}
					ref={input => input ? input.focus() : undefined}
				/>
			</td>
			<td className="align-middle">
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


export default class Leaderboard extends React.PureComponent {
	static propTypes = {
		boardName: PropTypes.string.isRequired,
	}

	constructor(props) {
		super(props)

		this.state = {
			newPlayer: false,
			players: [],
		}
	}

	refreshPlayers = () => getPlayers({
		boardName: this.props.boardName
	}).then(result => {
		this.setState({players: result.data.board.players.map(processPlayer)})
	})

	createPlayer = playerName => createPlayer({
		boardName: this.props.boardName,
		name: playerName
	}).then(result => {
		this.setState(prevState => ({
			players: [...prevState.players, processPlayer(result.data.newPlayer)]
		}))
	}).then(this.refreshPlayers)

	componentDidMount() {
		this.refreshPlayers()
	}

	render() {
		const rankedPlayers = rankPlayers(sortBy(this.state.players, player => -player.skill))
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
						{rankedPlayers.map(player =>
							<tr key={player.id}>
								<td className="align-middle">{player.rank}</td>
								<td className="align-middle">{player.name}</td>
								<td className="align-middle">{player.displaySkill}</td>
								<td className="align-middle">
									<button type="button" className="btn btn-block btn-sm btn-outline-secondary">
										Play
									</button>
								</td>
							</tr>
						)}
						{this.state.newPlayer ?
							<CreatePlayerRow
								cancel={() => this.setState({newPlayer: false})}
								submit={playerName => {
									this.createPlayer(playerName)
									this.setState({newPlayer: false})
								}}
							/> : null
						}
						</tbody>
						{this.state.newPlayer ? null :
							<tfoot>
								<tr>
									<td colSpan="4" className="align-middle">
										<button
											className="btn btn-outline-secondary btn-sm btn-block"
											onClick={() => this.setState({newPlayer: true})}
										>
											New Player...
										</button>
									</td>
								</tr>
							</tfoot>
						}
					</table>
				</div>
			</div>
		</div>
	}
}
