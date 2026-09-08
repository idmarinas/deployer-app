import type { CommandResponse } from '../../types/tauri-types'

import { StepperItem } from '@nuxt/ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

// Tauri related imports
import { invoke } from '@tauri-apps/api/core'

type StepStatus = 'idle' | 'loading' | 'success' | 'error'

interface StepItem extends Omit<StepperItem, 'key'> {
	id: string
	status: StepStatus
	invoke: string | Function
}

export function useAppMigrations() {
	const router = useRouter()
	const toast = useToast()
	const { t } = useI18n()

	const currentStep = ref<string | undefined>(undefined)
	const steps = ref<StepItem[]>([])
	const buttons = ref({
		run: {
			disabled: false,
			loading: false,
		},
		restart: {
			disabled: true,
			loading: false,
			show: false,
		},
	})

	async function runMigrations() {
		buttons.value.run.disabled = true
		buttons.value.run.loading = true

		steps.value = [
			{
				id: 'run_migrations',
				icon: 'i-tabler-database',
				title: t('pages.migrations.steps.title.run_migrations'),
				description: t('pages.migrations.steps.description.idle.run_migrations'),
				status: 'idle',
				invoke: 'execute_migrations',
			},
			{
				id: 'validate',
				icon: 'i-tabler-database-smile',
				title: t('pages.migrations.steps.title.validate'),
				description: t('pages.migrations.steps.description.idle.validate'),
				status: 'idle',
				invoke: 'validate_database_sqlite',
			},
		]

		const all_steps_completed = await executeSetupSteps()

		completeSetup(all_steps_completed)
	}

	async function executeSetupSteps(): Promise<boolean> {
		for (const step of steps.value) {
			setStepStatus(step.id, 'loading')
			await new Promise(resolve => setTimeout(resolve, 1000))

			let success = false

			if (typeof step.invoke === 'string') {
				const result = await invoke<CommandResponse>(step.invoke)
				success = result.success

				if (!success) {
					toast.add({
						title: t('overlays.toast.title.error'),
						description: t(result?.message_key, result?.message_params),
						color: 'error',
					})
				}
			} else {
				const result = await step.invoke()
				success = result?.success ?? false

				if (!success) {
					toast.add({
						title: t('overlays.toast.title.error'),
						description: t(result?.message_key, result?.message_params),
						color: 'error',
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

	function setStepStatus(step: string, status: StepStatus) {
		currentStep.value = step

		const value = steps.value.find(v => v.id === step)

		if (!value) return

		value.status = status
		value.description = t(
			`pages.migrations.steps.description.${status}.${step.replace('_pre', '').replace('_post', '')}`,
		)
	}

	function completeSetup(all_steps_completed: boolean) {
		if (all_steps_completed) {
			toast.add({
				title: t('overlays.toast.title.success'),
				description: t('overlays.toast.description.success'),
				color: 'success',
			})

			buttons.value.run.disabled = true
			buttons.value.run.loading = false

			router.push('/')
		} else {
			buttons.value.run.disabled = true
			buttons.value.run.loading = false

			buttons.value.restart.disabled = false
			buttons.value.restart.show = true
		}
	}

	// Resetear el estado de la configuración
	function resetMigration() {
		buttons.value.run.disabled = false
		buttons.value.run.loading = false

		buttons.value.restart.disabled = true
		buttons.value.restart.loading = false
		buttons.value.restart.show = false

		steps.value = []
		currentStep.value = undefined
	}

	return {
		currentStep,
		steps,
		buttons,
		runMigrations,
		resetMigration,
	}
}
