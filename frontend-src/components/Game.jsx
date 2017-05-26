import React from 'react'
import {connect} from 'react-redux'
import PropTypes from 'prop-types'
import {map, find, join, filter, defaultTo, head} from 'lodash'
import classNames from 'classnames'
import {selectLeaderboard, selectUsername} from 'store/register.jsx'
import { selectPlayersByName } from "store/leaderboard.jsx"

import { playerShape as boardPlayerShape } from "components/Leaderboard.jsx"

import {
	submitPartialGame,
	selectPartialGameId,
	selectPartialGameType,
	selectWinnersFull,
	selectLosersFull,
	selectPartialGamePlayers,
	selectPartialWinners,
	selectPartialLosers,
} from 'store/partial_game.jsx'

class PartialGamePreview extends React.PureComponent {
	static propTypes = {
		ally: PropTypes.string,
		oppose: PropTypes.arrayOf(
			PropTypes.string.isRequired
		).isRequired,
	}

	hasAlly = () => this.props.ally !== null
	hasOppose = () => this.props.oppose.length > 0
	shouldPreview = () => this.hasOppose() || this.hasAlly()

	emitRows = function*() {
		const {ally, oppose} = this.props
		if(this.hasAlly()) {
			yield (
				<tr key="ally">
					<td colSpan="2">With {ally}</td>
				</tr>
			)
		}

		if(this.hasOppose()) {
			yield (
				<tr key="oppose">
					<td rowSpan="2">Versus</td>
					<td style={{width: "100%"}}>{oppose[0]}</td>
				</tr>
			)

			yield* oppose.slice(1).map((opponent, index) =>
				<tr key={`oppose-${index}`}>
					<td>{opponent}</td>
				</tr>
			)
		}
	}

	render() {
		return this.shouldPreview() ?
			<table className="table">
				<tbody>
					{Array.from(this.emitRows())}
				</tbody>
			</table> : null
	}
}

// Filter join: only join the truthy parts
const fjoin = (array, sep) => join(filter(array), sep)

const playerShapeProp = PropTypes.shape({
	winner: PropTypes.bool.isRequired,
	player: PropTypes.string.isRequired,
})

const playerListProp = PropTypes.arrayOf(
	playerShapeProp.isRequired
)

class ToggleButton extends React.PureComponent {
	static propTypes = {
		activeClass: PropTypes.string.isRequired,
		active: PropTypes.bool.isRequired,
		onSelect: PropTypes.func.isRequired,
		btnClass: PropTypes.string.isRequired,
		locked: PropTypes.bool.isRequired,
	}

	render() {
		const {children, activeClass, active, onSelect, btnClass, locked} = this.props
		const className = classNames({
			"btn": true,
			[activeClass]: active,
			'btn-secondary': !active,
			[btnClass]: btnClass,
		})

		return <div className="btn-group">
			<button
				type="button"
				className={className}
				onClick={event => onSelect()}
				disabled={locked}
			>
				{children}
			</button>
		</div>
	}
}

class Toggle extends React.PureComponent {
	static propTypes = {
		value: PropTypes.string.isRequired,
		choices: PropTypes.arrayOf(
			PropTypes.shape({
				activeClass: PropTypes.string.isRequired,
				text: PropTypes.string.isRequired,
				id: PropTypes.string.isRequired,
			}).isRequired
		).isRequired,
		btnClass: PropTypes.string,
		onChange: PropTypes.func.isRequired,
		locked: PropTypes.bool.isRequired,
	}

	render() {
		const {value, choices, name, onChange, btnClass="", locked} = this.props

		return <div className="btn-group btn-group-justified" role="group">
			{map(choices, ({activeClass, text, id}) =>
				<ToggleButton
					activeClass={activeClass} active={value === id} name={name} key={id}
					onSelect={() => onChange(id)} btnClass={btnClass} locked={locked}
				>
					{text}
				</ToggleButton>
			)}
		</div>
	}
}

@connect(
	state => ({
		currentUser: selectUsername(state),
		leaderboard: selectLeaderboard(state),
		partialGameId: selectPartialGameId(state),
		partialGameType: selectPartialGameType(state),
		winnersFull: selectWinnersFull(state),
		losersFull: selectLosersFull(state),
		winners: selectPartialWinners(state),
		losers: selectPartialLosers(state),
		partialGamePlayers: selectPartialGamePlayers(state),
		playerList: selectPlayersByName(state),
	}),
	dispatch => ({submitPartialGame: data => dispatch(submitPartialGame(data))})
)
class Game extends React.PureComponent {
	static propTypes = {
		currentUser: PropTypes.string.isRequired,
		leaderboard: PropTypes.string.isRequired,
		submitPartialGame: PropTypes.func.isRequired,
		partialGameId: PropTypes.number,
		partialGameType: PropTypes.string,
		winnersFull: PropTypes.bool,
		losersFull: PropTypes.bool,
		partialGamePlayers: playerListProp,
		playerList: PropTypes.objectOf(
			boardPlayerShape.isRequired
		).isRequired
	}

	state = {
		winner: true,
		gameType: "solo"
	}

	getCurrentUserResult = () => {
		const {partialGamePlayers, currentUser} = this.props
		if(partialGamePlayers == null) {
			return null
		}

		const userData = find(partialGamePlayers, {player: currentUser})
		if(!userData) {
			return null
		}

		return userData.winner
	}

	isUserSubmitted = () => this.getCurrentUserResult() !== null

	getWinner = () => {
		const userResult = this.getCurrentUserResult()
		return (
			userResult !== null ? userResult :
			this.props.winnersFull ? false :
			this.props.losersFull ? true :
			this.state.winner
		)

		this.props.winnersFull ?
			false :
		this.props.losersFull ?
			true :
		this.state.winner
	}

	getGameType = () =>
		this.props.partialGameType == null ?
			this.state.gameType :
			this.props.partialGameType

	getPlayerText = username => {
		const {prettyName, displaySkill} = this.props.playerList[username]
		return `${prettyName} (${displaySkill})`
	}

	getTeam = winner => {
		const team = winner ? this.props.winners : this.props.losers
		return map(team, this.getPlayerText)
	}

	getOppose = () => this.getTeam(!this.getWinner())
	getAlly = () => defaultTo(head(this.getTeam(this.getWinner())), null)

	isWinnerLocked = () => this.props.winnersFull || this.props.losersFull
	isTypeLocked = () => this.props.partialGameType != null

	handleWinChange = value => this.isWinnerLocked() ? null :
		this.setState({winner: value === "win" ? true : false})

	handleTypeChange = value => this.isTypeLocked() ? null :
		this.setState({gameType: value})

	submit = () => !this.isUserSubmitted() ?
		this.props.submitPartialGame({
			leaderboard: this.props.leaderboard,
			username: this.props.currentUser,
			game_type: this.getGameType(),
			winner: this.getWinner(),
			partial_game_id: this.props.partialGameId,
		}) :
		null

	render() {
		const winner = this.getWinner()
		const gameType = this.getGameType()
		const winText = gameType === "solo" ? "I won" : "We won"
		const loseText = gameType === "solo" ? "I lost" : "We lost"
		const submitClass = classNames("btn", "btn-primary", "btn-block")

		return <div className="container-fluid px-0">
			<div className="row">
				<div className="col-md pt-2">
					<Toggle
						value={this.getGameType()}
						choices={[
							{activeClass: "btn-info", text: "Solo Game", id: "solo"},
							{activeClass: "btn-info", text: "Team Game", id: "team"},
						]}
						locked={this.isTypeLocked() || this.isUserSubmitted()}
						onChange={this.handleTypeChange}
					/>
				</div>
				<div className="col-md pt-2">
					<Toggle
						value={this.getWinner() ? "win" : "lose"}
						choices={[
							{activeClass: "btn-success", text: winText, id: "win"},
							{activeClass: "btn-danger", text: loseText, id: "lose"},
						]}
						btnClass="btn-lg"
						locked={this.isWinnerLocked() || this.isUserSubmitted()}
						onChange={this.handleWinChange}
					/>
				</div>
				<div className="col-md pt-2">
					<button
						type="button" className={"btn btn-primary btn-block"}
						onClick={this.submit} disabled={this.isUserSubmitted()}
					>
						{this.isUserSubmitted() ? "Waiting for other players" : "Submit Game"}
					</button>
				</div>
			</div>
			<div className="row pt-2">
				<div className="col">
					<PartialGamePreview ally={this.getAlly()} oppose={this.getOppose()} />
				</div>
			</div>
		</div>
	}
}

export default Game
