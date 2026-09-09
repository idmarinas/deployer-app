<script lang="ts">
import type { Host } from '@/types/entities'
import type { CommandResponse, HostServerUpdates, HostStatusMetrics, HostSystemInfo } from '@/types/tauri-types'
import type { Ref, VNode } from 'vue'

import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'

import { invoke } from '@tauri-apps/api/core'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { useToolbarButtons } from '@/composables/dashboard/toolbar/useToolbarButtons'
import { useToolbarContentTitle } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForHostsModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import useToaster from '@/composables/useToaster'
import { useHostById } from '@/loaders/hosts'

import { ICONS } from '@/utils/icons'

import { useHostQuery } from '@/composables/queries/hosts'
import { PositionedButton } from '@/composables/usePositionedButtons'
import { ModulesName } from '@/utils/deployer-app'
import UButton from '@nuxt/ui/components/Button.vue'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/hosts/:id(\\d+)',
	name: 'dashboard-hosts-id',
	params: {
		path: {
			id: 'int',
		},
	},
})

const { toolbar } = useToolbarForHostsModule()
const route = useRoute('dashboard-hosts-id')
const toaster = useToaster()

const { t, n, d } = useI18n()
const { data: hostData, isLoading, status, error, reload } = useHostById()
const hostQuery = useHostQuery()

const isOperating = ref(false)

const isLoadingOrOperating = computed(() => isLoading.value || isOperating.value)
const { useViewButtons, useButtons } = useToolbarButtons(ModulesName.Hosts, isLoadingOrOperating, hostQuery.remove)
const { hostButtons } = useButtons()

const pageTitle = computed(() => hostData.value?.name || '')

const buttons: PositionedButton[] = [
	{ id: 'cancel', action: 'remove' },
	{ id: 'edit', action: 'update', tooltip: false, class: 'mr-5' },
	hostButtons.testConnection(hostData, { action: 'after', targetId: 'edit', tooltip: true, color: 'secondary' }),
]
const toolbarButtons = computed<VNode[]>(() => useViewButtons(hostData as any, buttons, true))

const disableHostInformation = computed(() => {
	if (!hostData.value?.system_info?.last_checked_at) return false

	const now = Date.now()
	const time = new Date(hostData.value.system_info.last_checked_at).getTime()
	const COOLDOWN = 24 * 60 * 60 * 1000

	return now - time <= COOLDOWN
})
const disableHostMetrics = computed(() => {
	if (!hostData.value?.status_info?.last_checked_at) return false

	const now = Date.now()
	const time = new Date(hostData.value.status_info.last_checked_at).getTime()
	const COOLDOWN = 15 * 60 * 1000

	return now - time <= COOLDOWN
})
const disableServerUpdates = computed(() => {
	if (!hostData.value?.system_info?.package_manager) return true
	else if (!hostData.value?.server_updates?.last_checked_at) return false

	const now = Date.now()
	const time = new Date(hostData.value.server_updates.last_checked_at).getTime()
	const COOLDOWN = 24 * 60 * 60 * 1000

	return now - time <= COOLDOWN
})

async function updateHostInformation() {
	if (!hostData.value) return

	isOperating.value = true

	const notice = toaster.warning(
		t('notifications.hosts.system_info.loading.title'),
		t('notifications.hosts.system_info.loading.description', { name: hostData.value.name }),
		{
			duration: 0,
		},
	)

	await invoke<CommandResponse<HostSystemInfo>>('host_check_system_info', { hostId: hostData.value.id })
		.then(result => {
			if (result.success) {
				hostData.value = {
					...hostData.value,
					system_info: result.data,
				} as Host

				toaster.toast.update(
					notice.id,
					toaster.success(
						t('notifications.hosts.system_info.success.title'),
						t('notifications.hosts.system_info.success.description', { name: hostData.value.name }),
						{ id: notice.id, duration: undefined },
					),
				)
			} else {
				toaster.toast.update(
					notice.id,
					toaster.error(
						t('notifications.hosts.system_info.error.title'),
						t('notifications.hosts.system_info.error.description', {
							name: hostData.value?.name,
							...result.message_params,
						}),
						{ id: notice.id, duration: undefined },
					),
				)
			}
		})
		.catch(e => {
			toaster.toast.update(
				notice.id,
				toaster.error(t('overlays.toast.title.error'), String(e), { id: notice.id, duration: undefined }),
			)
		})
		.finally(() => {
			isOperating.value = false
		})
	isOperating.value = false
}

async function checkMetrics() {
	if (!hostData.value) return

	isOperating.value = true

	const notice = toaster.warning(
		t('notifications.hosts.status_info.loading.title'),
		t('notifications.hosts.status_info.loading.description', { name: hostData.value.name }),
		{
			duration: 0,
		},
	)

	await invoke<CommandResponse<HostStatusMetrics>>('host_check_metrics', { hostId: hostData.value.id })
		.then(result => {
			if (result.success) {
				hostData.value = {
					...hostData.value,
					status_info: result.data,
				} as Host

				toaster.toast.update(
					notice.id,
					toaster.success(
						t('notifications.hosts.status_info.success.title'),
						t('notifications.hosts.status_info.success.description', { name: hostData.value.name }),
						{ id: notice.id, duration: undefined },
					),
				)
			} else {
				toaster.toast.update(
					notice.id,
					toaster.error(
						t('notifications.hosts.status_info.error.title'),
						t('notifications.hosts.status_info.error.description', {
							name: hostData.value?.name,
							...result.message_params,
						}),
						{ id: notice.id, duration: undefined },
					),
				)
			}
		})
		.catch(e => {
			toaster.toast.update(
				notice.id,
				toaster.error(t('overlays.toast.title.error'), String(e), { id: notice.id, duration: undefined }),
			)
		})
		.finally(() => {
			isOperating.value = false
		})
}

async function checkUpdates() {
	if (!hostData.value) return

	isOperating.value = true

	const notice = toaster.warning(
		t('notifications.hosts.check_updates.loading.title'),
		t('notifications.hosts.check_updates.loading.description', { name: hostData.value.name }),
		{
			duration: 0,
		},
	)

	await invoke<CommandResponse<HostServerUpdates>>('host_check_updates', { hostId: hostData.value.id })
		.then(result => {
			if (result.success) {
				hostData.value = {
					...hostData.value,
					server_updates: result.data,
				} as Host

				const count = result.data?.packages?.length || 0

				toaster.toast.update(
					notice.id,
					toaster.success(
						t('notifications.hosts.check_updates.success.title', { count }),
						t('notifications.hosts.check_updates.success.description', { count, name: hostData.value.name }),
						{ id: notice.id, duration: undefined },
					),
				)
			} else {
				toaster.toast.update(
					notice.id,
					toaster.error(
						t('notifications.hosts.check_updates.error.title'),
						t('notifications.hosts.check_updates.error.description', { name: hostData.value!.name }),
						{ id: notice.id, duration: undefined },
					),
				)
			}
		})
		.catch(e => {
			toaster.toast.update(
				notice.id,
				toaster.error(t('overlays.toast.title.error'), String(e), { id: notice.id, duration: undefined }),
			)
		})
		.finally(() => {
			isOperating.value = false
		})
}

function updatedEnabled(enabled: boolean) {
	hostData.value = {
		...hostData.value,
		enabled,
	} as any
}

async function onToggleEnabled(input: { enabled: boolean }): Promise<boolean> {
	if (!hostData.value?.id) return false
	const result = await hostQuery.update(hostData.value.id, input)
	return !!result
}

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

provide<Ref<boolean>>('isOperating', isOperating)
</script>

<template>
	<template v-if="!isLoading && status === 'success' && hostData">
		<ViewCard
			:id="hostData.id"
			:description="hostData.description || undefined"
			:created_at="hostData.created_at"
			:updated_at="hostData.updated_at"
			:enabled="hostData.enabled"
			:on-updated-enabled="updatedEnabled"
			:on-toggle="onToggleEnabled"
		>
			<template #title-right>
				<UBadge
					:icon="ICONS.server.server"
					:label="`${hostData.username}@${hostData.host}:${hostData.port}`"
					variant="outline"
					class="lowercase"
				/>
				<UBadge
					variant="outline"
					:label="
						t(
							hostData.auth_type === 'password'
								? 'form.hosts.auth_type.select.password'
								: 'form.hosts.auth_type.select.key',
						)
					"
					:color="hostData.auth_type === 'password' ? 'neutral' : 'info'"
					:icon="hostData.auth_type === 'password' ? ICONS.auth.passwordUser : ICONS.auth.key"
				/>
			</template>
		</ViewCard>

		<UTabs
			:items="[
				{
					label: t('pages.hosts.manage.title.server_info'),
					icon: 'i-tabler-info-circle',
					slot: 'info',
				},
				{
					label: t('pages.hosts.manage.title.updates'),
					icon: 'i-tabler-download',
					slot: 'updates',
				},
				{
					label: t('pages.hosts.manage.title.metrics'),
					icon: 'i-tabler-chart-histogram',
					slot: 'metrics',
				},
			]"
			class="w-full"
		>
			<template #info>
				<div class="flex items-center justify-between">
					<span class="flex items-center gap-2">
						<span>{{ t('common.common.last_check') }}:</span>
						<span>
							{{ hostData.system_info?.last_checked_at ? d(hostData.system_info.last_checked_at, 'long') : '-' }}
						</span>
					</span>

					<UButton
						:loading="isOperating"
						:icon="ICONS.actions.refresh"
						:label="t('common.actions.refresh')"
						variant="soft"
						:disabled="disableHostInformation"
						@click="updateHostInformation"
					/>
				</div>
				<USeparator class="my-4" />
				<div class="grid grid-cols-1 md:grid-cols-2 gap-2 gap-x-6">
					<div class="flex items-center justify-between rounded-lg">
						<span class="text-xs text-muted font-medium">{{ t('pages.hosts.manage.distribution') }}</span>
						<span class="text-sm font-mono">{{ hostData.system_info?.distribution || '-' }}</span>
					</div>
					<div class="flex items-center justify-between rounded-lg">
						<span class="text-xs text-muted font-medium">{{ t('pages.hosts.manage.kernel') }}</span>
						<span class="text-sm font-mono">{{ hostData.system_info?.kernel || '-' }}</span>
					</div>
					<div class="flex items-center justify-between rounded-lg">
						<span class="text-xs text-muted font-medium">{{ t('pages.hosts.manage.arch') }}</span>
						<span class="text-sm font-mono">{{ hostData.system_info?.arch || '-' }}</span>
					</div>
					<div class="flex items-center justify-between rounded-lg">
						<span class="text-xs text-muted font-medium">{{ t('pages.hosts.manage.package_manager') }}</span>
						<span class="text-sm font-mono">{{ hostData.system_info?.package_manager || '-' }}</span>
					</div>
					<div class="flex items-center justify-between rounded-lg">
						<span class="text-xs text-muted font-medium">{{ t('pages.hosts.manage.cpu_cores') }}</span>
						<span class="text-sm font-mono">{{ hostData.system_info?.cpu_cores || '-' }}</span>
					</div>
					<div class="flex items-center justify-between rounded-lg">
						<span class="text-xs text-muted font-medium">{{ t('pages.hosts.manage.memory_total') }}</span>
						<span class="text-sm font-mono">{{ hostData.system_info?.memory_total || '-' }}</span>
					</div>
					<div class="flex items-center justify-between rounded-lg">
						<span class="text-xs text-muted font-medium">{{ t('pages.hosts.manage.disk_total') }}</span>
						<span class="text-sm font-mono">{{ hostData.system_info?.disk_total || '-' }}</span>
					</div>
				</div>
			</template>
			<template #updates>
				<div class="flex items-center justify-between">
					<span class="flex items-center gap-2">
						<span>{{ t('common.common.last_check') }}:</span>
						<span>
							{{ hostData.server_updates?.last_checked_at ? d(hostData.server_updates.last_checked_at, 'long') : '-' }}
						</span>
					</span>
					<UButton
						:icon="ICONS.actions.refresh"
						:label="t('pages.hosts.manage.check_updates')"
						variant="soft"
						:loading="isOperating"
						:disabled="disableServerUpdates"
						@click="checkUpdates"
					/>
				</div>
				<USeparator class="my-4" />

				<TableServerUpdates
					:server_name="hostData.name"
					:server_id="hostData.id"
					:data="
						Object.keys(hostData.server_updates || {}).length === 0
							? {
									last_checked_at: '',
									summary: {
										total: 0,
										major: 0,
										minor: 0,
										patch: 0,
										security: 0,
									},
									packages: [],
								}
							: hostData.server_updates!
					"
				/>
			</template>
			<template #metrics>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span>{{ t('common.common.last_check') }}:</span>
						<span>
							{{ hostData.status_info?.last_checked_at ? d(hostData.status_info.last_checked_at, 'long') : '-' }}
						</span>
					</div>
					<UButton
						:label="t('common.actions.refresh')"
						:icon="ICONS.actions.refresh"
						variant="soft"
						:loading="isOperating"
						:disabled="disableHostMetrics"
						@click="checkMetrics"
					/>
				</div>
				<USeparator class="my-4" />
				<div class="grid grid-cols-3 gap-3">
					<div class="flex items-center justify-between rounded-lg">
						<span class="text-muted font-medium flex items-center gap-2">
							<UIcon name="i-tabler-cpu" /> {{ t('pages.hosts.manage.metrics.cpu_usage') }}
						</span>
						<span class="text-sm font-mono">
							{{ hostData.status_info?.cpu_usage ? n(Number(hostData.status_info.cpu_usage) / 100, 'percent') : '-' }}
						</span>
					</div>
					<div class="flex items-center justify-between rounded-lg">
						<span class="text-muted font-medium flex items-center gap-2">
							<UIcon name="i-tabler-device-sd-card" /> {{ t('pages.hosts.manage.metrics.ram_usage') }}
						</span>
						<span class="text-sm font-mono">
							{{ hostData.status_info?.ram_usage ? n(Number(hostData.status_info.ram_usage) / 100, 'percent') : '-' }}
						</span>
					</div>
					<div class="flex items-center justify-between rounded-lg">
						<span class="text-muted font-medium flex items-center gap-2">
							<UIcon name="i-tabler-device-floppy" /> {{ t('pages.hosts.manage.metrics.disk_usage') }}
						</span>
						<span class="text-sm font-mono">
							{{ hostData.status_info?.disk_usage ? n(Number(hostData.status_info.disk_usage) / 100, 'percent') : '-' }}
						</span>
					</div>
				</div>
			</template>
		</UTabs>
	</template>
	<StatusError v-else-if="status === 'error' && error?.message === 'not-found'" />
	<Loading v-else-if="isLoading" what="host" />
	<GeneralError v-else />
</template>
