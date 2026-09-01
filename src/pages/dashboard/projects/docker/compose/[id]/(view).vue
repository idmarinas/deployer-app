<script lang="ts">
import type { CommandResponse, DockerComposeService } from '@/types/tauri-types'
import type { VNode } from 'vue'

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { useToast } from '@nuxt/ui/composables/useToast'
import { invoke } from '@tauri-apps/api/core'

import { useToolbarButtons } from '@/composables/dashboard/toolbar/useToolbarButtons'
import { useToolbarContentTitle } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForProjectsDockerCompose } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { PositionedButton } from '@/composables/usePositionedButtons'
import { useDockerComposeById } from '@/loaders/projects/docker/compose'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/docker_composes/:id(\\d+)',
	name: 'dashboard-docker_composes-id',
	params: {
		path: {
			id: 'int',
		},
	},
})

const { toolbar } = useToolbarForProjectsDockerCompose()
const route = useRoute('dashboard-docker_composes-id')
const { t } = useI18n()
const toast = useToast()
const { data: compose, isLoading, status, error, reload } = useDockerComposeById()

const { useViewButtons } = useToolbarButtons('docker_composes', isLoading)
const output = ref('')
const isOperating = ref(false)
const services = ref<DockerComposeService[]>([])
const pageTitle = computed(() => compose.value?.name || '')

const compose_files = computed(() => (compose as any).value.files ?? [])

async function executeAction(action: 'up' | 'down' | 'ps' | 'logs' | 'restart' | 'pull') {
	isOperating.value = true
	output.value = ''
	services.value = []

	try {
		const input = { docker_compose_id: Number.parseInt(route.params.id) }

		if (action === 'ps') {
			const result = await invoke<CommandResponse<DockerComposeService[]>>(`project_docker_compose_${action}`, {
				input,
			})
			if (result.success) {
				services.value = result.data ?? []
				output.value = t('pages.docker_composes.manage.status_updated')
				toast.add({
					title: t('overlays.toast.title.success'),
					color: 'success',
				})
			} else {
				output.value = result.message_key
				toast.add({ title: t('overlays.toast.title.error'), description: result.message_key, color: 'error' })
			}
		} else {
			const result = await invoke<CommandResponse<string>>(`project_docker_compose_${action}`, { input })
			if (result.success) {
				output.value = result.data ?? ''
				toast.add({
					title: t('overlays.toast.title.success'),
					color: 'success',
				})
			} else {
				output.value = result.message_key
				toast.add({ title: t('overlays.toast.title.error'), description: result.message_key, color: 'error' })
			}
		}
	} catch (e) {
		output.value = String(e)
		toast.add({ title: t('overlays.toast.title.error'), description: String(e), color: 'error' })
	} finally {
		isOperating.value = false
	}
}

function updatedEnabled(enabled: boolean) {
	compose.value = {
		...compose.value,
		enabled,
	} as any
}

const buttons: PositionedButton[] = [
	{ id: 'cancel', action: 'remove' },
	{ id: 'edit', action: 'update', tooltip: false, class: 'mr-5' },
]
const toolbarButtons = computed<VNode[]>(() => useViewButtons(compose as any, buttons, true))
useToolbarContentTitle(pageTitle, toolbar, toolbarButtons)

onMounted(() => {
	reload()
	// Inyectar contenido en el toolbar cuando se monta el componente
	toolbar?.clearContent()
})

onBeforeUnmount(() => {
	// Limpiar el toolbar cuando se desmonta
	toolbar?.clearContent()
})

// Actualizar toolbar cuando isLoading cambia
watch([isLoading, pageTitle, () => route.params.id], ([newLoading, newTitle, newId]) => {
	if (newLoading) {
		toolbar?.clearContent()
	} else {
		if (newTitle) {
			toolbar?.updateToolbar()
		}
	}

	if (newId) reload()
})
</script>

<template>
	<div v-if="!isLoading && status === 'success' && compose" class="flex flex-col gap-6">
		<ViewCard
			:id="compose.id!"
			:description="(compose.description as unknown as object) || undefined"
			:enabled="compose.enabled!"
			:created_at="compose.created_at!"
			:updated_at="compose.updated_at!"
			:on-updated-enabled="updatedEnabled"
			update-command="crud_update_docker_compose"
		>
			<template #title-right>
				<UBadge :icon="ICONS.server.server" :label="compose.host_name || '-'" variant="outline" class="normal-case" />
				<UBadge
					variant="outline"
					:label="compose.remote_path"
					icon="i-tabler-folder-cog"
					class="normal-case"
					color="neutral"
				/>
			</template>
		</ViewCard>

		<div class="flex flex-col gap-3">
			<h3 class="text-sm font-semibold text-muted uppercase tracking-wider">
				{{ t('pages.docker_composes.manage.actions_title') }}
			</h3>
			<div class="flex gap-2 flex-wrap">
				<UButton
					icon="i-tabler-upload"
					:label="t('pages.docker_composes.actions.up')"
					color="success"
					:loading="isOperating"
					@click="executeAction('up')"
				/>
				<UButton
					icon="i-tabler-player-stop"
					:label="t('pages.docker_composes.actions.down')"
					color="error"
					variant="outline"
					:loading="isOperating"
					@click="executeAction('down')"
				/>
				<UButton
					icon="i-tabler-refresh"
					:label="t('pages.docker_composes.actions.restart')"
					variant="outline"
					:loading="isOperating"
					@click="executeAction('restart')"
				/>
				<UButton
					icon="i-tabler-list-details"
					:label="t('pages.docker_composes.actions.ps')"
					variant="outline"
					:loading="isOperating"
					@click="executeAction('ps')"
				/>
				<UButton
					icon="i-tabler-terminal-2"
					:label="t('pages.docker_composes.actions.logs')"
					variant="outline"
					:loading="isOperating"
					@click="executeAction('logs')"
				/>
				<UButton
					icon="i-tabler-download"
					:label="t('pages.docker_composes.actions.pull')"
					variant="outline"
					:loading="isOperating"
					@click="executeAction('pull')"
				/>
			</div>
		</div>

		<div v-if="services.length > 0" class="flex flex-col gap-2">
			<h3 class="text-sm font-semibold text-muted uppercase tracking-wider">
				{{ t('pages.docker_composes.manage.services_title') }}
			</h3>
			<div class="grid gap-2">
				<div
					v-for="service in services"
					:key="service.name"
					class="flex items-center justify-between p-3 rounded-lg bg-muted/50"
				>
					<span class="font-mono text-sm">{{ service.name }}</span>
					<UBadge :color="service.status.includes('running') ? 'success' : 'neutral'" variant="subtle">
						{{ service.status }}
					</UBadge>
				</div>
			</div>
		</div>

		<div v-if="output" class="flex flex-col gap-2">
			<h3 class="text-sm font-semibold text-muted uppercase tracking-wider">
				{{ t('pages.docker_composes.manage.output_title') }}
			</h3>
			<UCard :ui="{ root: 'bg-neutral-950 text-green-400' }">
				<pre class="font-mono text-xs whitespace-pre-wrap overflow-auto max-h-96">{{ output }}</pre>
			</UCard>
		</div>

		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<h3 class="text-sm font-semibold text-muted uppercase tracking-wider">
					{{ t('pages.docker_composes.manage.files_title') }}
				</h3>
				<UBadge
					variant="subtle"
					size="xs"
					:label="t('pages.docker_composes.manage.files_count', { count: compose_files.length })"
				/>
			</div>

			<ComposeTreeFilesUpload
				:model-value="compose_files"
				:can-upload="false"
				:can-edit="false"
				:can-create-file="false"
			/>
		</div>
	</div>
	<StatusError v-else-if="status === 'error' && error?.message === 'not-found'" />
	<Loading v-else-if="isLoading" what="docker_compose" />
	<GeneralError v-else />
</template>
