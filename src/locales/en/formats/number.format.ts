import type { IntlNumberFormat } from 'vue-i18n'

export default <IntlNumberFormat>{
	n: {
		useGrouping: true,
	},
	currency: {
		style: 'currency',
		currency: 'USD',
		notation: 'standard',
	},
	decimal: {
		style: 'decimal',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	},
	percent: {
		style: 'percent',
		useGrouping: false,
		maximumFractionDigits: 2,
	},
}
