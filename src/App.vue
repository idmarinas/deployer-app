<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { computed, onBeforeMount, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDatabase } from '@/composables/useDatabase'
import { useDeployerShortcuts } from '@/composables/useDeployer'
import { registerExternalLinks } from '@/utils/externalLinks'
import { invoke } from '@tauri-apps/api/core'
import { CommandResponse } from './types/tauri-types'

const colorMode = useColorMode()
const { locale } = useI18n()
const { load } = useDatabase()
const { shortcuts } = useDeployerShortcuts()

const themeColor = computed(() => (colorMode.value === 'dark' ? '#18181b' : '#ffffff'))

useHead({
	htmlAttrs: {
		lang: locale,
	},
	meta: [{ name: 'theme-color', content: themeColor }],
})

onBeforeMount(async () => {
	await load()
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

// Definir shortcuts globales
defineShortcuts(shortcuts)
</script>

<template>
	<Suspense>
		<UApp :locale="locales[locale as keyof typeof locales]" :toaster="{ position: 'top-center' }">
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
