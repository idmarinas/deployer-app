import type { CommandResponse } from '../types/tauri-types'

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { StepperItem } from '@nuxt/ui'
import { useColorMode } from '@vueuse/core'

// Composables
import { useDatabase } from './useDatabase'
import { useQuery } from './useQuery'


// Tauri related imports
import { invoke } from '@tauri-apps/api/core'

type StepStatus = 'idle' | 'loading' | 'success' | 'error'

interface StepItem extends Omit<StepperItem, 'key'> {
  id: string,
  status: StepStatus,
  invoke: string | Function
}

export function useDatabaseSetup() {
  const toast = useToast()
  const router = useRouter()
  const { locale, t } = useI18n()
  const colorMode = useColorMode()
  const { load, beginTransaction, commit, rollback } = useDatabase()

  const currentStep = ref<string | undefined>(undefined)
  const steps = ref<StepItem[]>([])
  const buttons = ref({
    select: {
      disabled: false,
      loading: false,
    },
    create: {
      disabled: false,
      loading: false,
    },
    restart: {
      disabled: true,
      loading: false,
      show: false,
    }
  })

  // Crear el archivo .sqlite.
  async function databaseCreate(path: string | null) {
    buttons.value = {
      select: {
        disabled: true,
        loading: false,
      },
      create: {
        disabled: true,
        loading: true,
      },
      restart: {
        disabled: true,
        loading: false,
        show: false,
      }
    }
    currentStep.value = undefined

    // Pasos para la configuración inicial
    steps.value = [
      {
        id: 'save_path',
        icon: 'i-tabler-database-search',
        title: t('pages.setup.steps.title.save_path'),
        description: t('pages.setup.steps.description.idle.save_path'),
        status: 'idle',
        async invoke() {
          try {
            await invoke<CommandResponse>('set_database_path', { path })

            return {
              success: true,
            }
          } catch {
            return {
              success: false,
              message_key: 'pages.setup.toast.error.save_path',
              message_params: {}
            }
          }
        }
      }, {
        id: 'create_file',
        icon: 'i-tabler-file-database',
        title: t('pages.setup.steps.title.create_file'),
        description: t('pages.setup.steps.description.idle.create_file'),
        status: 'idle',
        invoke: 'create_database_file'
      }, {
        id: 'initialize',
        icon: 'i-tabler-database-plus',
        title: t('pages.setup.steps.title.initialize'),
        description: t('pages.setup.steps.description.idle.initialize'),
        status: 'idle',
        invoke: 'initialize_database'
      }, {
        id: 'migrations',
        icon: 'i-tabler-database-cog',
        title: t('pages.setup.steps.title.migrations'),
        description: t('pages.setup.steps.description.idle.migrations'),
        status: 'idle',
        invoke: 'run_migrations'
      }, {
        id: 'seed',
        icon: 'i-tabler-database-import',
        title: t('pages.setup.steps.title.seed'),
        description: t('pages.setup.steps.description.idle.seed'),
        status: 'idle',
        async invoke(): Promise<CommandResponse> {
          const { saveAppSettings } = useQuery()
          await load()

          await beginTransaction()

          const saveResult = await saveAppSettings({
            locale: locale.value,
            theme_color: colorMode.value
          })

          if (saveResult.error) {
            await rollback()
            return {
              success: false,
              data: null,
              message_key: 'pages.setup.toast.error.seed',
              message_params: {}
            }
          }

          const commitResult = await commit()

          if (commitResult.error) {
            await rollback()
            return {
              success: false,
              data: null,
              message_key: 'pages.setup.toast.error.seed',
              message_params: {}
            }
          }

          return {
            success: true,
            data: null,
            message_key: 'pages.setup.toast.success.seed',
            message_params: {}
          }
        }
      }, {
        id: 'validate',
        icon: 'i-tabler-database-smile',
        title: t('pages.setup.steps.title.validate'),
        description: t('pages.setup.steps.description.idle.validate'),
        status: 'idle',
        invoke: 'validate_sqlite_database'
      }
    ]

    // Validar que la ruta del archivo .sqlite no sea nula
    if (!path) {
      toast.add({
        title: t('pages.setup.toast.title.canceled'),
        description: t('pages.setup.toast.description.canceled'),
        color: 'neutral'
      })

      resetSetup()

      return
    }

    const all_steps_completed = await executeSetupSteps(path)

    completeSetup(all_steps_completed)
  }

  // Cargar una archivo .sqlite ya existente.
  async function databaseLoad(path: string | null) {
    buttons.value = {
      select: {
        disabled: true,
        loading: true,
      },
      create: {
        disabled: true,
        loading: false,
      },
      restart: {
        disabled: true,
        loading: false,
        show: false,
      }
    }
    currentStep.value = undefined

    if (!path) {
      toast.add({
        title: t('pages.setup.toast.title.canceled'),
        description: t('pages.setup.toast.description.canceled'),
        color: 'neutral'
      })

      resetSetup()

      return
    }

    // Pasos para seleccionar .sqlite existente
    steps.value = [
      {
        id: 'save_path',
        icon: 'i-tabler-database-search',
        title: t('pages.setup.steps.title.save_path'),
        description: t('pages.setup.steps.description.idle.save_path'),
        status: 'idle',
        async invoke() {
          try {
            await invoke<CommandResponse>('set_database_path', { path })

            return {
              success: true,
            }
          } catch {
            return {
              success: false,
              message_key: 'pages.setup.toast.error.save_path',
              message_params: {}
            }
          }
        }
      }, {
        id: 'validate_pre',
        icon: 'i-tabler-database-smile',
        title: t('pages.setup.steps.title.validate'),
        description: t('pages.setup.steps.description.idle.validate'),
        status: 'idle',
        invoke: 'validate_sqlite_database'
      }, {
        id: 'migrations',
        icon: 'i-tabler-database-cog',
        title: t('pages.setup.steps.title.migrations'),
        description: t('pages.setup.steps.description.idle.migrations'),
        status: 'idle',
        invoke: 'run_migrations'
      }, {
        id: 'validate_post',
        icon: 'i-tabler-database-smile',
        title: t('pages.setup.steps.title.validate'),
        description: t('pages.setup.steps.description.idle.validate'),
        status: 'idle',
        invoke: 'validate_sqlite_database'
      }
    ]

    const all_steps_completed = await executeSetupSteps(path)

    completeSetup(all_steps_completed)
  }

  function setStepStatus(step: string, status: StepStatus) {
    currentStep.value = step

    const value = steps.value.find(v => v.id === step)

    if (!value) return

    value.status = status
    value.description = t(`pages.setup.steps.description.${status}.${step.replace('_pre', '').replace('_post', '')}`)
  }

  async function executeSetupSteps(path: string): Promise<boolean> {
    for (const step of steps.value) {
      setStepStatus(step.id, 'loading')
      await new Promise(resolve => setTimeout(resolve, 1000))

      let success = false

      if (typeof step.invoke === 'string') {
        const result = await invoke<CommandResponse>(step.invoke, { path })
        success = result.success

        if (!success) {
          toast.add({
            title: t('components.toast.title.error'),
            description: t(result?.message_key, result?.message_params),
            color: 'error'
          })
        }
      } else {
        const result = await step.invoke()
        success = result?.success ?? false

        if (!success) {
          toast.add({
            title: t('components.toast.title.error'),
            description: t(result?.message_key, result?.message_params),
            color: 'error'
          })
        }
      }

      if (success) {
        setStepStatus(step.id, 'success')
      } else {
        setStepStatus(step.id, 'error')
        return false
      }
    }

    return true
  }

  function completeSetup(all_steps_completed: boolean) {

    if (all_steps_completed) {
      toast.add({
        title: t('components.toast.title.success'),
        description: t('components.toast.description.success'),
        color: 'success'
      })

      buttons.value = {
        select: {
          disabled: true,
          loading: false,
        },
        create: {
          disabled: true,
          loading: false,
        },
        restart: {
          disabled: true,
          loading: false,
          show: false,
        }
      }

      router.push('/')
    } else {
      buttons.value = {
        select: {
          disabled: true,
          loading: false,
        },
        create: {
          disabled: true,
          loading: false,
        },
        restart: {
          disabled: false,
          loading: false,
          show: true,
        }
      }
    }

  }

  // Resetear el estado de la configuración
  function resetSetup() {
    buttons.value = {
      select: {
        disabled: false,
        loading: false,
      },
      create: {
        disabled: false,
        loading: false,
      },
      restart: {
        disabled: true,
        loading: false,
        show: false,
      }
    }

    steps.value = []
    currentStep.value = undefined
  }

  return {
    steps,
    currentStep,
    buttons,
    databaseCreate,
    databaseLoad,
    resetSetup
  }
}
