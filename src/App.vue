<script setup lang="ts">
import { computed, onBeforeMount, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import * as locales from '@nuxt/ui/locale'

import { registerExternalLinks } from '@/utils/externalLinks'
import { useDatabase } from '@/composables/useDatabase'

const colorMode = useColorMode()
const { locale } = useI18n()
const { load } = useDatabase()

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