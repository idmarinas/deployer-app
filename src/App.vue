<script setup lang="ts">
import { computed, onBeforeMount, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import * as locales from '@nuxt/ui/locale'

// Tauri related
import { invoke } from '@tauri-apps/api/core'

const colorMode = useColorMode()
const router = useRouter()
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

onBeforeMount(async () => {
  const exists = await invoke<boolean>('check_database_exists')

  if (exists) {
    router.push('/home')
  } else {
    router.push('/setup')
  }
})

onMounted(() => {
  document.getElementById('style-splashscreen')?.remove()
})
</script>

<template>
  <Suspense>
    <UApp :locale="locales[locale as keyof typeof locales]" :toaster="{position: 'top-center'}">
      <RouterView />
    </UApp>
  </Suspense>
</template>