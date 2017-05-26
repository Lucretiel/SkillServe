import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import UrlPattern from 'url-pattern'

import { push } from 'router/actions.jsx'

const LEFT_MOUSE_BUTTON = 0
const shouldIgnoreClick = ({e, target}) =>
	e.button !== LEFT_MOUSE_BUTTON ||
	e.shiftKey || e.altKey || e.metaKey || e.ctrlKey ||
	e.defaultPrevented ||
	target

const handleClick = ({event, target, location, push}) => {
	if(shouldIgnoreClick({e: event, target})) {
		return
	}

	event.preventDefault()
	return push(location)
}

@connect(null, dispatch => ({push: location => dispatch(push(location))}))
class Link extends React.PureComponent {
	static propTypes = {
		push: PropTypes.func.isRequired,
		to: PropTypes.string.isRequired,
		target: PropTypes.string,
	}

	localHandleClick = event => handleClick({
		event,
		target: this.props.target,
		location: this.props.to,
		push: this.props.push
	})

	render() {
		const {to, target, children, push, ...rest} = this.props
		return <a href={to} target={target} onClick={this.localHandleClick} {...rest}>
			{children}
		</a>
	}
}

export default Link
