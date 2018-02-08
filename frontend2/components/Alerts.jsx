import React from 'react'
import PropTypes from 'prop-types'
import IPropTypes from 'react-immutable-proptypes'

class Alert extends React.PureComponent {
	static propTypes = {
		children: PropTypes.node.isRequired,
		dismiss: PropTypes.func.isRequired,
	}

	render() {
		return <div className="alert alert-danger" role="alert">
		  <span>{this.props.children}</span>
		  <button type="button" className="close" onClick={this.props.dismiss}>
		    <span>×</span>
		  </button>
		</div>
	}
}

export default class Alerts extends React.PureComponent {
	static propTypes = {
		alerts: IPropTypes.listOf(PropTypes.node.isRequired),
		dismiss: PropTypes.func.isRequired,
	}

	render() {
		const { dismiss, alerts } = this.props
		return <div className="container">
			{alerts.toSeq().map((alert, alertId) =>
				<div className="row" key="alertId">
					<div className="col">
						<Alert dismiss={() => dismiss(alertId)}>
							{alert}
						</Alert>
					</div>
				</div>
			)}
		</div>
	}
}
