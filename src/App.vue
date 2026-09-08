<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { computed, onBeforeMount, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { getDeployerSetting, setDeployerSetting } from '@/composables/deployer/useDeployerAppSettings'
import { useDeployerShortcuts } from '@/composables/deployer/useDeployerAppShortcuts'
import { loadDatetimeFormat, loadLocaleMessages, loadNumberFormat } from '@/locales/_loader'
import { registerExternalLinks } from '@/utils/externalLinks'

const colorMode = useColorMode()
const i18n = useI18n()
const { shortcuts } = useDeployerShortcuts()

const themeColor = computed(() => (colorMode.value === 'dark' ? '#0b0c0e' : '#ffffff'))

useHead({
	htmlAttrs: {
		lang: i18n.locale,
	},
	meta: [{ name: 'theme-color', content: themeColor }],
})

onBeforeMount(async () => {
	try {
		const savedLocale = await getDeployerSetting('locale')

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
	await setDeployerSetting('theme_color', newColor)
})

watch(i18n.locale, async newLocale => {
	await setDeployerSetting('locale', newLocale)
})

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
