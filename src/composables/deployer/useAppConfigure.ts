import type { CommandResponse } from '@/types/tauri-types'

import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { appConfigureSteps, StepItem, StepStatus } from '@/composables/deployer/appConfigureSteps'
import { invoke } from '@tauri-apps/api/core'

export function useAppConfigure() {
	const toast = useToast()
	const router = useRouter()
	const { t } = useI18n()
	const { createSteps, loadSteps } = appConfigureSteps()

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
		},
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
			},
		}
		currentStep.value = undefined

		// Pasos para la configuración inicial
		steps.value = createSteps(path)

		// Validar que la ruta del archivo .sqlite no sea nula
		if (!path) {
			toast.add({
				title: t('pages.app.setup.toast.title.canceled'),
				description: t('pages.app.setup.toast.description.canceled'),
				color: 'neutral',
			})

			resetSetup()

			return
		}

		const all_steps_completed = await executeSetupSteps(path)

		completeSetup(all_steps_completed)
	}

	// Cargar un archivo .sqlite ya existente.
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
			},
		}
		currentStep.value = undefined

		if (!path) {
			toast.add({
				title: t('pages.app.setup.toast.title.canceled'),
				description: t('pages.app.setup.toast.description.canceled'),
				color: 'neutral',
			})

			resetSetup()

			return
		}

		// Pasos para seleccionar .sqlite existente
		steps.value = loadSteps(path)

		const all_steps_completed = await executeSetupSteps(path)

		completeSetup(all_steps_completed)
	}

	function setStepStatus(step: string, status: StepStatus) {
		currentStep.value = step

		const value = steps.value.find(v => v.id === step)

		if (!value) return

		value.status = status
		value.description = t(
			`pages.app.setup.steps.description.${status}.${step.replace('_pre', '').replace('_post', '')}`,
		)
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
						title: t('overlays.toast.title.error'),
						description: t(result?.message_key, result?.message_params, { escapeParameter: false }),
						color: 'error',
					})
				}
			} else {
				const result = await step.invoke()
				success = result?.success ?? false

				if (!success) {
					toast.add({
						title: t('overlays.toast.title.error'),
						description: t(result?.message_key, result?.message_params, { escapeParameter: false }),
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

	async function completeSetup(all_steps_completed: boolean) {
		if (all_steps_completed) {
			toast.add({
				title: t('overlays.toast.title.success'),
				description: t('overlays.toast.description.success'),
				color: 'success',
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
				},
			}

			router.push('/dashboard')
		} else {
			// Si falla en algún punto borrar el path por si se ha guardado.
			await invoke('set_database_path', { path: '' })

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
				},
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
			},
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
		resetSetup,
	}
}
