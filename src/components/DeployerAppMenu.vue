<script lang="ts">
import { computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'

import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'

import { useI18n } from 'vue-i18n'
import { useColorMode } from '@vueuse/core'
import * as uiLocales from '@nuxt/ui/locale'

import { useLocale } from '@/composables/useLocale'
</script>

<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()

const { locale, setLocale, availableLocales, isLoading: isLocaleLoading } = useLocale()

const { t } = useI18n()
const appConfig = useAppConfig()
const colorMode = useColorMode()

const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: t('app.title'),
  avatar: {
    icon: 'i-tabler-rocket',
    src: '/logo.png',
    class: 'bg-transparent',
    alt: 'DeployerApp Logo',
    size: 'lg',
    ui: {
      root: 'rounded-none'
    }
  }
}], [{
  label: t('components.deployerAppMenu.settings'),
  icon: 'i-tabler-settings',
  to: '/app/settings'
},{
    label: 'Restablecer ventana',
    icon: 'i-tabler-window',
    onClick: async () => {
      const win = getCurrentWindow()
      await win.setSize(new LogicalSize(1400, 900))
      await win.center()
    }
  }
], [{
  label: t('components.deployerAppMenu.appearance.label'),
  icon: 'i-tabler-sun-moon',
  children: [{
    label: t('components.deployerAppMenu.appearance.light'),
    icon: appConfig.ui.icons.light,
    type: 'checkbox',
    checked: colorMode.value === 'light',
    onSelect(e: Event) {
      e.preventDefault()

      colorMode.value = 'light'
    }
  }, {
    label: t('components.deployerAppMenu.appearance.dark'),
    icon: appConfig.ui.icons.dark,
    type: 'checkbox',
    checked: colorMode.value === 'dark',
    onSelect(e: Event) {
      e.preventDefault()

      colorMode.value = 'dark'
    }
  }]
}, {
  label: t('components.deployerAppMenu.locale'),
  icon: 'i-tabler-language',
  children: Object.values(uiLocales).filter(lang => availableLocales.includes(lang.code)).map(lang => ({
    label: lang.name,
    icon: `circle-flags:lang-${lang.code}`,
    type: 'checkbox',
    name: 'locale',
    loading: isLocaleLoading.value,
    disabled: isLocaleLoading.value,
    checked: locale.value === lang.code,
    onSelect(e: Event) {
      e.preventDefault()
      setLocale(lang.code)
    }
  }))
}]
]))
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }">
    <UButton :avatar="{ icon: 'i-tabler-rocket', src: '/logo.png', class: 'bg-transparent', ui: {root: 'rounded-none'}}" :label="collapsed ? undefined : t('app.title')"
      :trailing-icon="collapsed ? undefined : 'i-tabler-selector'" color="neutral" variant="ghost" block
      :square="collapsed" class="data-[state=open]:bg-elevated" :ui="{
        trailingIcon: 'text-dimmed'
      }" />

    <template #chip-leading="{ item }">
      <div class="inline-flex items-center justify-center shrink-0 size-5">
        <span class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2" :style="{
          '--chip-light': `var(--color-${(item as any).chip}-500)`,
          '--chip-dark': `var(--color-${(item as any).chip}-400)`
        }" />
      </div>
    </template>
  </UDropdownMenu>
</template>
