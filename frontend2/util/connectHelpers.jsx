import mapValues from 'lodash/mapValues'

export const mapStateToProps = selectors => state =>
	mapValues(selectors, s => s(state))
