<script lang="ts">
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const { t } = useI18n()

const items = [
	{
		label: t('form.shared.select.framework.symfony.label'),
		description: t('form.shared.select.framework.symfony.description'),
		value: 'symfony',
	},
	// {
	// 	label: t('form.shared.select.framework.laravel.label'),
	// 	description: t('form.shared.select.framework.laravel.description'),
	// 	value: 'laravel',
	// },
	// {
	// 	label: t('form.shared.select.framework.nextjs.label'),
	// 	description: t('form.shared.select.framework.nextjs.description'),
	// 	value: 'nextjs',
	// },
	{
		label: t('form.shared.select.framework.vuejs.label'),
		description: t('form.shared.select.framework.vuejs.description'),
		value: 'vuejs',
	},
	{
		label: t('form.shared.select.framework.generic.label'),
		description: t('form.shared.select.framework.generic.description'),
		value: 'generic',
	},
]
</script>

<template>
	<USelectMenu value-key="value" :placeholder="t('form.shared.placeholder.framework.select')" :items="items" />
</template>
