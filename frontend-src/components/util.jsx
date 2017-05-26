import {spring} from 'react-motion'

export const skillSpring = value => spring(value, {stiffness: 150, damping: 40})

export const displaySkill = ({skill, isProvisional=false}) =>
	isProvisional ? '*' : (skill * 10).toFixed(0)
