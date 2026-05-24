<script setup lang="ts">
import { computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'

import { useI18n } from 'vue-i18n'
import { useThemeColor } from '@/composables/useThemeColor'

defineProps<{
  collapsed?: boolean
}>()

const { t } = useI18n()
const appConfig = useAppConfig()
const { colorMode, changeThemeColor } = useThemeColor()

const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: t('app.title'),
  avatar: {
    icon: 'i-tabler-rocket',
    size: 'lg'
  }
}], [{
  label: t('components.deployerAppMenu.settings'),
  icon: 'i-tabler-settings',
  to: '/app/settings'
}], [{
  label: t('components.deployerAppMenu.appearance.label'),
  icon: 'i-tabler-sun-moon',
  children: [{
    //   label: t('components.deployerAppMenu.appearance.system'),
    //   icon: appConfig.ui.icons.system,
    //   type: 'checkbox',
    //   checked: colorMode.value === 'system' as 'auto',
    //   onSelect(e: Event) {
    //     e.preventDefault()

    //     changeThemeColor('system');
    //   }
    // }, {
    label: t('components.deployerAppMenu.appearance.light'),
    icon: appConfig.ui.icons.light,
    type: 'checkbox',
    checked: colorMode.value === 'light',
    onSelect(e: Event) {
      e.preventDefault()

      changeThemeColor('light')
    }
  }, {
    label: t('components.deployerAppMenu.appearance.dark'),
    icon: appConfig.ui.icons.dark,
    type: 'checkbox',
    checked: colorMode.value === 'dark',
    onSelect(e: Event) {
      e.preventDefault()

      changeThemeColor('dark')
    }
  }]
}]
]))
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }">
    <UButton icon="i-tabler-rocket" :label="collapsed ? undefined : t('app.title')"
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
