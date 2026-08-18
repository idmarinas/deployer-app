<script lang="ts">
import { useDockerComposeById } from '@/loaders/docker_composes'
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useDashboardToolbar } from '@/composables/dashboard/toolbar/useDashboardToolbar'
import { useToolbarContentEdit } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useDockerComposeSchema, type DockerComposeSchema } from '@/composables/schemas/docker_composes'
import { validateComposeImages } from '@/lib/docker-compose/docker-hub'
import { isMainComposeFile } from '@/lib/docker-compose/files'
import type {
	CommandResponse,
	ComposeFileInput,
	DockerComposeFile,
	UpdateDockerComposeInput,
} from '@/types/tauri-types'
import { sanitizeNulls } from '@/utils/sanitize'
import { Form, FormSubmitEvent } from '@nuxt/ui'
import { useQueryCache } from '@pinia/colada'
import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/docker_composes/:id(\\d+)/edit',
	name: 'dashboard-docker_composes-id-edit',
	params: {
		path: {
			id: 'int',
		},
	},
})

const { t } = useI18n()
const route = useRoute('dashboard-docker_composes-id-edit')
const router = useRouter()
const toolbar = useDashboardToolbar('docker_composes')
const toast = useToast()
const { data: compose, isLoading, reload } = useDockerComposeById()
const { dockerComposeSchema } = useDockerComposeSchema(Number.parseInt(route.params.id))

const queryCache = useQueryCache()

const state = ref<any>({ files: [] })
const form = useTemplateRef<Form<DockerComposeSchema>>('form')

useToolbarContentEdit(state, compose, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<DockerComposeSchema>) {
	isLoading.value = true
	const input: Partial<UpdateDockerComposeInput> = event.data

	const composeFile = state.value.files?.find((f: { file_path: string }) => isMainComposeFile(f.file_path))
	if (!composeFile) {
		toast.add({
			title: t('overlays.toast.title.error'),
			description: t('validation.docker_composes.compose_required'),
			color: 'error',
		})
		isLoading.value = false
		return
	}

	const yaml = (composeFile.content ?? '').trim()
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

	const result = await invoke<CommandResponse<number>>('crud_update_docker_compose', {
		id: Number.parseInt(route.params.id),
		input,
	})

	console.log(result)
	if (result.success && result.data != null) {
		const files: ComposeFileInput[] = (state.value.files ?? []).map(
			(f: {
				id?: number
				file_path: string
				content?: string | null
				is_binary: boolean
				name?: string
				mime_type?: string | null
				size?: number | null
				last_modified?: number | null
				webkit_relative_path?: string | null
				icon?: string | null
			}) => ({
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
		console.log(sync)
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
			description: t('notifications.docker_composes.updated', { name: input.name }),
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
	reload()
	toolbar?.updateToolbar()
})

onBeforeUnmount(() => {
	toolbar?.clearContent()
})

watch(
	compose,
	newCompose => {
		if (newCompose) {
			state.value = sanitizeNulls(newCompose)
		}
	},
	{ immediate: true },
)

watch(isLoading, () => {
	toolbar?.updateToolbar()
})
</script>

<template>
	<UForm
		ref="form"
		:disabled="isLoading"
		id="form-docker-compose-edit"
		:schema="dockerComposeSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<DockerComposeForm v-model="state" :is-loading="isLoading" />
	</UForm>
</template>