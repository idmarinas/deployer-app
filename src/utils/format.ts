export function formatBytes(size?: number): string {
	if (!size || size <= 0) return '—'
	const units = ['B', 'KB', 'MB', 'GB']
	let value = size
	let unit = 0
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024
		unit++
	}
	return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}