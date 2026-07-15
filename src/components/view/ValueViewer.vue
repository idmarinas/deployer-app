<!--
  Componente que muestra el valor de un campo.
  Muestra *** si el valor está encriptado
-->

<script lang="ts">
import { computed, ref } from 'vue'

import { useI18n } from 'vue-i18n'

import { ICONS } from '@/utils/icons'
import { isEncryptedValue } from '@/utils/crypto'
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		value?: string | number | boolean | Date
		props?: object
		onlyText?: boolean
	}>(),
	{
		onlyText: false,
		props: () => ({}),
	},
)

const { t, locale } = useI18n()

const isEncrypted = ref(false)
const isEmpty = ref(false)

const valueFormated = computed(() => {
	if (props.value?.toString() !== undefined && isEncryptedValue(props.value.toString())) {
		isEncrypted.value = true
		return (
			t('common.common.encrypted')
				?.match(/.{1,4}/g)
				?.join('*') || ''
		)
	} else if (props.value === undefined || props.value === null || props.value === '') {
		isEmpty.value = true
		return t('common.empty.label')
	} else if (typeof props.value === 'number') {
		return props.value.toLocaleString(locale.value)
	} else if (props.value instanceof Date) {
		return props.value.toLocaleString(locale.value, { dateStyle: 'long', timeStyle: 'short' })
	}

	return props.value.toString()
})
</script>

<template>
	<UBadge
		v-if="isEmpty && !onlyText"
		:icon="ICONS.misc.empty"
		:label="valueFormated"
		color="neutral"
		variant="outline"
		size="sm"
		v-bind="props.props"
	/>
	<UBadge
		v-else-if="isEncrypted && !onlyText"
		:icon="ICONS.misc.encrypt"
		:label="valueFormated"
		variant="outline"
		size="sm"
		v-bind="props.props"
	/>
	<template v-else>{{ valueFormated }}</template>
</template>
