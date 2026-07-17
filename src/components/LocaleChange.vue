<script setup lang="ts">
import * as uiLocales from '@nuxt/ui/locale'
import { useLocale } from '../composables/useLocale'

const { locale, setLocale, availableLocales, isLoading } = useLocale()

// Filtra los locales de Nuxt UI para mostrar solo los que la app soporta
const localeItems = Object.values(uiLocales).filter(lang => availableLocales.includes(lang.code))
</script>

<template>
	<ULocaleSelect
		:model-value="locale"
		:locales="localeItems"
		:loading="isLoading"
		@update:model-value="setLocale($event)"
		:disabled="isLoading"
	/>
</template>
