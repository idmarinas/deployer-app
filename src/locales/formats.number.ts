import type { IntlNumberFormat, IntlNumberFormats, Locale } from 'vue-i18n'

import numberFormatEs from './es/formats/number.format'
import numberFormatEn from './en/formats/number.format'

export default <IntlNumberFormats<Locale, IntlNumberFormat>>{
    es: numberFormatEs,
    en: numberFormatEn
}