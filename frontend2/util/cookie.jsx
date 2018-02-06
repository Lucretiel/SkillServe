import { Seq } from 'immutable'

const cookiePattern = /^\s*([^=]+)=(.*)$/

const getCookie = name => Seq(document.cookie.split(';'))
	.map(cookie => cookiePattern.exec(cookie.trim()).slice(1))
	.filter(([key, value]) => decodeURIComponent(key) === name)
	.map(([key, value]) => decodeURIComponent(value))
	.get(0, null)

export default getCookie
