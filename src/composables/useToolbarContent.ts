import { h } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Ref } from 'vue'

import UButton from '@nuxt/ui/components/Button.vue'
import USwitch from '@nuxt/ui/components/Switch.vue'
import { useRouter } from 'vue-router'

function useToolbarContent(
  toolbar: 'hosts' | 'projects' | 'deployments' | 'variables' | 'passkeys' | 'tasks',
  state: Ref<{ enabled: boolean }>,
  loading: Ref<boolean>,
  updateToolbar: () => void,
  onSubmit: () => void,
  onReset: () => void,
  type: 'add' | 'edit'
) {
  const { t } = useI18n()
  const router = useRouter()

  const icon = {
    hosts: {
      uncheckedIcon: 'i-tabler-server-off',
      checkedIcon: 'i-tabler-server'
    },
    projects: {
      uncheckedIcon: 'i-tabler-package-off',
      checkedIcon: 'i-tabler-package'
    },
    deployments: {
      uncheckedIcon: 'i-tabler-send-off',
      checkedIcon: 'i-tabler-send'
    },
    variables: {
      uncheckedIcon: 'i-tabler-variable-off',
      checkedIcon: 'i-tabler-variable'
    },
    passkeys: {
      uncheckedIcon: 'i-tabler-key-off',
      checkedIcon: 'i-tabler-key'
    },
    tasks: {
      uncheckedIcon: 'i-tabler-x',
      checkedIcon: 'i-tabler-check'
    }
  }

  return () => [
    h('h2', { class: 'flex gap-2 items-center' }, [
      h(USwitch, {
        modelValue: state.value.enabled,
        uncheckedIcon: icon[toolbar].uncheckedIcon,
        checkedIcon: icon[toolbar].checkedIcon,
        loading: loading.value,
        size: 'xl',
        'onUpdate:modelValue': (value: boolean) => {
          state.value.enabled = value
          updateToolbar()
        }
      }),
      h('span', { class: 'flex flex-col' }, [
        h('span', {}, t(`schemas.${toolbar}.form.title.${type}`)),
        h('span', {
          class: `text-sm ${state.value.enabled ? 'text-green-600' : 'text-red-600'}`
        }, state.value.enabled ? t('common.active') : t('common.inactive'))
      ])
    ]),
    h('div', { class: 'flex gap-2 items-center' }, [
      h(UButton, { label: t(`components.form.${type === 'edit' ? 'save' : 'submit'}`), icon: type === 'edit' ? 'i-tabler-device-floppy' : 'i-tabler-send', loading: loading.value, onClick: onSubmit }),
      h(UButton, { label: t('components.form.reset'), icon: 'i-tabler-refresh', variant: 'soft', loading: loading.value, onClick: onReset }),
      h(UButton, { label: t('components.form.cancel'), icon: 'i-tabler-cancel', variant: 'outline', color: 'neutral', loading: loading.value, onClick: () => router.back() })
    ])
  ]
}

export function useToolbarContentCreate(
  toolbar: 'hosts' | 'projects' | 'deployments' | 'variables' | 'passkeys' | 'tasks',
  state: Ref<{ enabled: boolean }>,
  loading: Ref<boolean>,
  updateToolbar: () => void,
  onSubmit: () => void,
  onReset: () => void,) {
  return useToolbarContent(toolbar, state, loading, updateToolbar, onSubmit, onReset, 'add')
}

export function useToolbarContentEdit(
  toolbar: 'hosts' | 'projects' | 'deployments' | 'variables' | 'passkeys' | 'tasks',
  state: Ref<{ enabled: boolean }>,
  loading: Ref<boolean>,
  updateToolbar: () => void,
  onSubmit: () => void,
  onReset: () => void,) {
  return useToolbarContent(toolbar, state, loading, updateToolbar, onSubmit, onReset, 'edit')
}