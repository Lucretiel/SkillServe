import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import UrlPattern from 'url-pattern'
import { createSelector } from "reselect"
import { selectPathname } from 'router/selectors.jsx'


const getForRoute = (state, props) => props.forRoute


const mapStateToProps = () => {
	const getMatcher = createSelector(getForRoute, forRoute => new UrlPattern(forRoute))
	const doesMatch = createSelector(
		[getMatcher, selectPathname],
		(matcher, currentPath) => matcher.match(currentPath) !== null
	)

	return (state, props) => {
		return {doesMatch: doesMatch(state, props)}
	}
}


@connect(mapStateToProps)
class Fragment extends React.PureComponent {
	static propTypes = {
		doesMatch: PropTypes.bool.isRequired,
		forRoute: PropTypes.string.isRequired,
		children: PropTypes.node,
	}

	render() {
		return this.props.doesMatch ? React.Children.only(this.props.children) : null
	}
}

export default Fragment
