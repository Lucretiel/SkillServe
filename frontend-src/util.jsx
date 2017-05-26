export const formatSkill = ({skill, isProvisional=false}) =>
	isProvisional ? '*' : (skill * 20).toFixed(0)
