<script setup lang="ts">
import type {
	CommandResponse,
	ComposeFileInput,
	CreateDockerComposeInput,
	DockerComposeFile,
} from '@/types/tauri-types'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { useDashboardToolbar } from '@/composables/dashboard/toolbar/useDashboardToolbar'
import { useToolbarContentCreate } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useDockerComposeSchema, type DockerComposeSchema } from '@/composables/schemas/docker_composes'
import { useToast } from '@nuxt/ui/composables/useToast'
import { useQueryCache } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { validateComposeImages } from '@/lib/docker-compose/docker-hub'
import { isComposeFile } from '@/lib/files'
import { invoke } from '@tauri-apps/api/core'

definePage({
	name: 'dashboard-docker_composes-add',
})

const { t } = useI18n()
const router = useRouter()
const toolbar = useDashboardToolbar('docker_composes')

const toast = useToast()
const { dockerComposeSchema } = useDockerComposeSchema()

const initialState: DockerComposeSchema & { files: ComposeFileInput[] } = {
	name: '',
	description: undefined,
	host_id: undefined,
	remote_path: '/opt/docker-compose/',
	enabled: false,
	files: [],
}
const state = ref<any>({ ...initialState })
const form = useTemplateRef<Form<DockerComposeSchema>>('form')
const isLoading = ref(false)
const queryCache = useQueryCache()

useToolbarContentCreate(state, initialState, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<DockerComposeSchema>) {
	isLoading.value = true
	const input: Partial<CreateDockerComposeInput> = event.data

	const composeFile = state.value.files?.find((f: { name: string }) => isComposeFile(f.name))
	const yaml = (composeFile?.content ?? '').trim()
	if (!yaml) {
		toast.add({
			title: t('overlays.toast.title.error'),
			description: t('validation.docker_composes.compose_content.required'),
			color: 'error',
		})
		isLoading.value = false
		return
	}

	const invalidImages = await validateComposeImages(yaml)
	if (invalidImages.length > 0) {
		toast.add({
			title: t('overlays.toast.title.error'),
			description: t('notifications.docker_composes.invalid_images', { images: invalidImages.join(', ') }),
			color: 'error',
		})
		isLoading.value = false
		return
	}

	const result = await invoke<CommandResponse<number>>('crud_create_docker_compose', { input })

	if (result.success && result.data != null) {
		const files: ComposeFileInput[] = (state.value.files ?? []).map(
			(f: { id?: number; file_path: string; content?: string | null; is_binary: boolean; name?: string; mime_type?: string | null; size?: number | null; last_modified?: number | null; webkit_relative_path?: string | null; icon?: string | null }) => ({
				id: f.id,
				file_path: f.file_path,
				content: f.content ?? null,
				is_binary: f.is_binary,
				name: f.name ?? '',
				mime_type: f.mime_type ?? null,
				size: f.size ?? null,
				last_modified: f.last_modified ?? null,
				webkit_relative_path: f.webkit_relative_path ?? null,
				icon: f.icon ?? null,
			}),
		)

		const sync = await invoke<CommandResponse<DockerComposeFile[]>>('sync_docker_compose_files', {
			input: { module_id: result.data, files },
		})
		if (!sync.success) {
			toast.add({
				title: t('overlays.toast.title.error'),
				description: t(sync.message_key, sync.message_params),
				color: 'error',
			})
		}

		await queryCache.invalidateQueries({ key: ['docker_composes'] }, 'all')

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('notifications.docker_composes.added', { name: input.name }),
			color: 'success',
		})
		isLoading.value = false
		router.push({ name: 'dashboard-docker_composes' })
	} else {
		toast.add({
			title: t('overlays.toast.title.error'),
			description: t(result.message_key, result.message_params),
			color: 'error',
		})
		isLoading.value = false
	}
}

onMounted(() => {
	toolbar?.updateToolbar()
})

onBeforeUnmount(() => {
	toolbar?.clearContent()
})

watch(isLoading, () => toolbar?.updateToolbar())
</script>

<template>
	<UForm
		ref="form"
		:disabled="isLoading"
		id="form-docker-compose-create"
		:schema="dockerComposeSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<DockerComposeForm v-model="state" :is-loading="isLoading" />
	</UForm>
</template>
