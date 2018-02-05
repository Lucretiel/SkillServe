const cookiePattern = /^\s*([^=]+)=(.*)$/

const getCookie = name => {
	for(const cookie of document.cookie.split(';')) {
		const [_, cookieName, value] = cookiePattern.exec(cookie.trim())
		if(cookieName === name) return decodeURIComponent(value)
	}
	return null
}

export default getCookie
