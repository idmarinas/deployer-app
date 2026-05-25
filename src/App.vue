<script setup lang="ts">
import { computed, onBeforeMount, onMounted, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import * as locales from '@nuxt/ui/locale'

import { registerExternalLinks } from '@/utils/externalLinks'
import { useDatabase } from '@/composables/useDatabase'
import { useQuery } from '@/composables/useQuery'
import { useDeployerShortcuts } from '@/composables/useDeployer'

const colorMode = useColorMode()
const { locale } = useI18n()
const { load } = useDatabase()
const { saveAppSetting } = useQuery()
const { shortcuts } = useDeployerShortcuts()

const themeColor = computed(() => colorMode.value === 'dark' ? '#18181b' : '#ffffff')

useHead({
  htmlAttrs: {
    lang: locale,
  },
  meta: [
    { name: 'theme-color', content: themeColor }
  ]
})

onBeforeMount(async () => {
  await load()
})

onMounted(() => {
  registerExternalLinks()
  document.getElementById('style-splashscreen')?.remove()
})

watch(colorMode, async (newColor) => {
  await saveAppSetting('theme_color', newColor)
})

// Definir shortcuts globales
defineShortcuts(shortcuts)
</script>

<template>
  <Suspense>
    <UApp :locale="locales[locale as keyof typeof locales]" :toaster="{ position: 'top-center' }">
      <UTheme :props="{ navigationMenu: { orientation: 'vertical', tooltip: true, popover: true } }">
        <RouterView />
      </UTheme>
    </UApp>
  </Suspense>
</template>