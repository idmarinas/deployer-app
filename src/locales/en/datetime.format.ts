import type { IntlDateTimeFormat } from 'vue-i18n'

export default <IntlDateTimeFormat>{
    short: {
        year: 'numeric', month: 'short', day: 'numeric'
    },
    long: {
        year: 'numeric', month: 'short', day: 'numeric',
        weekday: 'short', hour: 'numeric', minute: 'numeric'
    }
}