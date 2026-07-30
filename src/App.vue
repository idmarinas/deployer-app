<script setup lang="ts">
import type { DeployerSetting } from './types/tauri-types'

import * as locales from '@nuxt/ui/locale'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { computed, onBeforeMount, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDeployerShortcuts } from '@/composables/useDeployer'
import { loadDatetimeFormat, loadLocaleMessages, loadNumberFormat } from '@/locales/_loader'
import { registerExternalLinks } from '@/utils/externalLinks'
import { invoke } from '@tauri-apps/api/core'
import { CommandResponse } from './types/tauri-types'

const colorMode = useColorMode()
const i18n = useI18n()
const { shortcuts } = useDeployerShortcuts()

const themeColor = computed(() => (colorMode.value === 'dark' ? '#18181b' : '#ffffff'))

useHead({
	htmlAttrs: {
		lang: i18n.locale,
	},
	meta: [{ name: 'theme-color', content: themeColor }],
})

onBeforeMount(async () => {
	// Restaurar idioma guardado en deployer_settings
	try {
		const response = await invoke<CommandResponse<DeployerSetting>>('get_deployer_setting', { key: 'locale' })
		const savedLocale = response.data?.value

		if (savedLocale && savedLocale !== i18n.locale.value) {
			const [messages, datetimeFormat, numberFormat] = await Promise.all([
				loadLocaleMessages(savedLocale),
				loadDatetimeFormat(savedLocale),
				loadNumberFormat(savedLocale),
			])

			i18n.setLocaleMessage(savedLocale, messages as any)
			if (datetimeFormat) i18n.setDateTimeFormat(savedLocale, datetimeFormat)
			if (numberFormat) i18n.setNumberFormat(savedLocale, numberFormat)
			i18n.locale.value = savedLocale
		}
	} catch {
		// Ignorar — usar locale por defecto
	}
})

onMounted(() => {
	registerExternalLinks()
	document.getElementById('style-splashscreen')?.remove()
})

watch(colorMode, async newColor => {
	await invoke<CommandResponse>('set_deployer_setting', {
		key: 'theme_color',
		value: newColor,
	})
})

watch(i18n.locale, async newLocale => {
	await invoke<CommandResponse>('set_deployer_setting', {
		key: 'locale',
		value: newLocale,
	})
})

// Definir shortcuts globales
defineShortcuts(shortcuts)
</script>

<template>
	<Suspense>
		<UApp :locale="locales[i18n.locale.value as keyof typeof locales]" :toaster="{ position: 'top-center' }">
			<UTheme
				:props="{
					navigationMenu: { orientation: 'vertical', tooltip: true, popover: true },
					tooltip: { delayDuration: 0 },
				}"
			>
				<RouterView />
			</UTheme>
		</UApp>
	</Suspense>
</template>
