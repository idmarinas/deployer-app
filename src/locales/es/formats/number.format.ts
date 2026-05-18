import type { IntlNumberFormat } from 'vue-i18n'

export default <IntlNumberFormat>{
    currency: {
        style: 'currency', currency: 'EUR', notation: 'standard'
    },
    decimal: {
        style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2
    },
    percent: {
        style: 'percent', useGrouping: false
    }
}