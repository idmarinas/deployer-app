<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import * as locales from '@nuxt/ui/locale'

import { registerExternalLinks } from '@/utils/externalLinks'

const colorMode = useColorMode()
const { locale } = useI18n()

const themeColor = computed(() => colorMode.value === 'dark' ? '#18181b' : '#ffffff')

useHead({
  htmlAttrs: {
    lang: locale,
  },
  meta: [
    { name: 'theme-color', content: themeColor }
  ]
})

onMounted(() => {
  registerExternalLinks()
  document.getElementById('style-splashscreen')?.remove()
})
</script>

<template>
  <Suspense>
    <UApp :locale="locales[locale as keyof typeof locales]" :toaster="{ position: 'top-center' }">
      <RouterView />
    </UApp>
  </Suspense>
</template>