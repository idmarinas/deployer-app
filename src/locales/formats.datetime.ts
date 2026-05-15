import type { IntlDateTimeFormat, IntlDateTimeFormats, Locale } from 'vue-i18n'

import datetimeFormatEs from './es/formats/datetime.format'
import datetimeFormatEn from './en/formats/datetime.format'

export default <IntlDateTimeFormats<Locale, IntlDateTimeFormat>>{
    es: datetimeFormatEs,
    en: datetimeFormatEn,
}