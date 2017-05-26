import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import UrlPattern from 'url-pattern'
import { selectPathname } from 'router/selectors.jsx'


@connect(state => ({currentPath: selectPathname(state)}))
class Fragment extends React.PureComponent {
	static propTypes = {
		currentPath: PropTypes.string.isRequired,
		forRoute: PropTypes.string.isRequired,
		children: PropTypes.node,
	}

	render() {
		const {currentPath, forRoute, children} = this.props
		const routeMatcher = new UrlPattern(forRoute)
		const result = routeMatcher.match(currentPath)

		return result === null ? null : React.Children.only(children)
	}
}

export default Fragment
