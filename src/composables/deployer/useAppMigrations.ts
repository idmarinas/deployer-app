import type { CommandResponse } from '@/types/tauri-types'

import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

// Tauri related imports
import { appConfigureSteps, StepItem, StepStatus } from '@/composables/deployer/appConfigureSteps'
import { invoke } from '@tauri-apps/api/core'

export function useAppMigrations() {
	const router = useRouter()
	const toast = useToast()
	const { t } = useI18n()
	const { migrationSteps } = appConfigureSteps()

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

		steps.value = migrationSteps()

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
		value.description = t(`steps.setup.description.${status}.${step.replace('_pre', '').replace('_post', '')}`)
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

			router.push({ name: 'dashboard-home' })
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
