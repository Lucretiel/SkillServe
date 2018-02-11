/**
 * This function produces rank indexes on a sorted list. For instance, when
 * sorting by points:
 *
 * [567, 445, 445, 123, 123, 123, 6] =>
 * [0,   1,   1,   3,   3,   3,   6]
 */

const rankMapper = (scoreOf = thing=>thing, firstRank=1) => mapFunc => things => {
	let tieRank = firstRank
	let prevScore = Symbol()

	return things.map((thing, index) => {
		const score = scoreOf(thing)
		const rank = tieRank = (score === prevScore) ? tieRank : (index + firstRank)
		prevScore = score

		return mapFunc(thing, rank, index, things)
	})
}

export default rankMapper
