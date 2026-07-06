// Lightweight pure-ESM implementation of shallowEqual compatible with
// the `shallowequal` API surface. This avoids importing the CommonJS
// package entirely and prevents Vite from generating Node-specific
// shims that call `createRequire` in the browser.
function shallowEqual(objA, objB) {
	if (Object.is(objA, objB)) return true

	if (
		typeof objA !== 'object' || objA === null ||
		typeof objB !== 'object' || objB === null
	) {
		return false
	}

	const keysA = Object.keys(objA)
	const keysB = Object.keys(objB)
	if (keysA.length !== keysB.length) return false

	for (let i = 0; i < keysA.length; i++) {
		const key = keysA[i]
		if (!Object.prototype.hasOwnProperty.call(objB, key) || !Object.is(objA[key], objB[key])) {
			return false
		}
	}

	return true
}

export default shallowEqual
