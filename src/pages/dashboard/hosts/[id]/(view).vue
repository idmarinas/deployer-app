<script lang="ts">
import type { PositionedButton } from '@/composables/usePositionedButtons'
import type { Host } from '@/types/entities'
import type { HostPackage, HostServerUpdates, HostStatusMetrics, HostSystemInfo } from '@/types/tauri-types'
import type { SystemInfoResult, SystemMetricsResult } from '@/utils/commands/results'
import type { Ref, VNode } from 'vue'

import { useQueryCache } from '@pinia/colada'
import { useCountdown } from '@vueuse/core'
import { eq } from 'drizzle-orm'
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { invalidateCacheQueries } from '@/composables/queries/shared'
import { db } from '@/drizzle/drizzle'
import { hosts as deployer_hosts } from '@/drizzle/schema'
import { runCommand } from '@/utils/commands/runner'
import { ICONS } from '@/utils/icons'

import { useToolbarButtons } from '@/composables/dashboard/toolbar/useToolbarButtons'
import { useToolbarContentTitle } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForHostsModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useHostQuery } from '@/composables/queries/hosts'
import useToaster from '@/composables/useToaster'
import { useHostById } from '@/loaders/hosts'

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
const cacheQuery = useQueryCache()

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

const btnInfoCount = ref(0)
const { remaining: btnInfoRemaining, start: btnInfoStart } = useCountdown(btnInfoCount, {
	onComplete: () => (btnInfoCount.value = 0),
})
const btnInfoDisable = computed(() => {
	if (!hostData.value?.system_info?.last_checked_at) return false

	const time = new Date(hostData.value.system_info.last_checked_at).getTime()
	const cooldown = 24 * 60 * 60 * 1000 // 24 horas - 1 día

	return calculateBtn(time, cooldown, btnInfoCount, btnInfoStart)
})

const btnMetricsCount = ref(0)
const { remaining: btnMetricsRemaining, start: btnMetricsStart } = useCountdown(btnMetricsCount, {
	onComplete: () => (btnMetricsCount.value = 0),
})
const btnMetrics = computed(() => {
	if (!hostData.value?.status_info?.last_checked_at) return false

	const cooldown = 1 * 60 * 1000 // 1 minuto
	const time = new Date(hostData.value.status_info.last_checked_at).getTime()

	return calculateBtn(time, cooldown, btnMetricsCount, btnMetricsStart)
})

const btnServerUpdatesCount = ref(0)
const { remaining: btnServerUpdatesRemaining, start: btnServerUpdatesStart } = useCountdown(btnServerUpdatesCount, {
	onComplete: () => (btnServerUpdatesCount.value = 0),
})
const btnServerUpdatesDisable = computed(() => {
	if (!hostData.value?.system_info?.package_manager) return true
	else if (!hostData.value?.server_updates?.last_checked_at) return false

	const time = new Date(hostData.value.server_updates.last_checked_at).getTime()
	const cooldown = 24 * 60 * 60 * 1000

	return calculateBtn(time, cooldown, btnServerUpdatesCount, btnServerUpdatesStart)
})

function calculateBtn(time: number, cooldown: number, count: Ref<number>, start: () => void): boolean {
	const now = Date.now()
	const wait = cooldown - (now - time)

	count.value = Math.max(0, Math.round(wait / 1000))
	if (count.value) {
		start()
	}

	return now - time <= cooldown
}

async function updateHostInfo() {
	if (!hostData.value) return

	isOperating.value = true

	const notice = toaster.warning(
		t('notifications.hosts.system_info.loading.title'),
		t('notifications.hosts.system_info.loading.description', { name: hostData.value.name }),
		{
			duration: 0,
		},
	)

	try {
		const { exit_code, parsed } = await runCommand<SystemInfoResult>('system-info', hostData.value.id)

		if (exit_code !== 0 || !parsed) {
			throw new Error(t('notifications.hosts.system_info.error.title'))
		}

		const system_info: HostSystemInfo = {
			package_manager: parsed.package_manager,
			package_manager_version: parsed.package_manager_version,
			kernel: parsed.kernel,
			arch: parsed.arch,
			distribution: parsed.distribution,
			cpu_cores: parsed.cores,
			memory_total: parsed.memory_total,
			disk_total: parsed.disk_total,
			os_release: parsed.os_release,
			last_checked_at: new Date().toISOString(),
		}

		hostData.value = {
			...hostData.value,
			system_info,
		} as Host

		await invalidateCacheQueries(cacheQuery, ['hosts'])

		toaster.toast.update(
			notice.id,
			toaster.success(
				t('notifications.hosts.system_info.success.title'),
				t('notifications.hosts.system_info.success.description', { name: hostData.value.name }),
				{ id: notice.id, duration: undefined },
			),
		)
	} catch (e) {
		toaster.toast.update(
			notice.id,
			toaster.error(t('overlays.toast.title.error'), String(e), { id: notice.id, duration: undefined }),
		)
	} finally {
		isOperating.value = false
	}
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

	try {
		const { exit_code, parsed } = await runCommand<SystemMetricsResult>('system-metrics', hostData.value.id)

		if (exit_code !== 0 || !parsed) {
			throw new Error(t('notifications.hosts.status_info.error.title'))
		}

		console.log(parsed)

		const status_info: HostStatusMetrics = {
			cpu_usage: parsed.cpu,
			ram_usage: parsed.ram,
			disk_usage: parsed.disk,
			last_checked_at: new Date().toISOString(),
		}

		hostData.value = {
			...hostData.value,
			status_info,
		} as Host

		await db.update(deployer_hosts).set({ status_info }).where(eq(deployer_hosts.id, hostData.value.id))
		await invalidateCacheQueries(cacheQuery, ['hosts'])

		toaster.toast.update(
			notice.id,
			toaster.success(
				t('notifications.hosts.status_info.success.title'),
				t('notifications.hosts.status_info.success.description', { name: hostData.value.name }),
				{ id: notice.id, duration: undefined },
			),
		)
	} catch (e) {
		toaster.toast.update(
			notice.id,
			toaster.error(t('overlays.toast.title.error'), String(e), { id: notice.id, duration: undefined }),
		)
	} finally {
		isOperating.value = false
	}
}

/** Normaliza un valor del parseador regex: la primera coincidencia es un string, las siguientes un array. */
function toArray(value: unknown): string[] {
	if (value === undefined || value === null) return []
	if (Array.isArray(value)) return value.map(item => String(item))
	return [String(value)]
}

/** Deduce el tipo de actualización comparando versiones actual y disponible. */
function computeUpdateType(current: string, available: string): string {
	if (!current || !available || current === available) return 'unknown'

	const parse = (version: string): number[] =>
		version
			.replace(/^[^0-9]*/, '')
			.split(/[^0-9]+/)
			.filter(Boolean)
			.map(Number)

	const [currentMajor, currentMinor, currentPatch] = parse(current)
	const [availableMajor, availableMinor, availablePatch] = parse(available)

	if (availableMajor !== currentMajor) return 'major'
	if (availableMinor !== currentMinor) return 'minor'
	if (availablePatch !== currentPatch) return 'patch'

	return 'unknown'
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

	try {
		const { exit_code, parsed } = await runCommand<{
			name?: unknown
			repo?: unknown
			current_version?: unknown
			available_version?: unknown
		}>('upgradable-packages', hostData.value.id)

		if (exit_code !== 0 || !parsed) {
			throw new Error(t('notifications.hosts.check_updates.error.title'))
		}

		const names = toArray(parsed.name)
		const repos = toArray(parsed.repo)
		const currents = toArray(parsed.current_version)
		const availables = toArray(parsed.available_version)

		const packages: HostPackage[] = names.map((name, i) => {
			const current_version = currents[i] || ''
			const available_version = availables[i] || ''
			const repo = repos[i] || ''
			const is_security = repo.toLowerCase().includes('security')
			const update_type = computeUpdateType(current_version, available_version)
			const priority = is_security ? 'high' : update_type === 'major' ? 'medium' : 'low'

			return { name, current_version, available_version, repo, update_type, is_security, priority }
		})

		const count = packages.length
		const server_updates: HostServerUpdates = {
			packages,
			summary: {
				total: count,
				security: packages.filter(pkg => pkg.is_security).length,
				major: packages.filter(pkg => pkg.update_type === 'major').length,
				minor: packages.filter(pkg => pkg.update_type === 'minor').length,
				patch: packages.filter(pkg => pkg.update_type === 'patch').length,
			},
			last_checked_at: new Date().toISOString(),
		}

		hostData.value = {
			...hostData.value,
			server_updates,
		} as Host

		await invalidateCacheQueries(cacheQuery, ['hosts'])

		toaster.toast.update(
			notice.id,
			toaster.success(
				t('notifications.hosts.check_updates.success.title', { count }),
				t('notifications.hosts.check_updates.success.description', { count, name: hostData.value.name }),
				{ id: notice.id, duration: undefined },
			),
		)
	} catch (e) {
		toaster.toast.update(
			notice.id,
			toaster.error(t('overlays.toast.title.error'), String(e), { id: notice.id, duration: undefined }),
		)
	} finally {
		isOperating.value = false
	}
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
						:label="btnInfoRemaining ? `Espera ${btnInfoRemaining} segs` : t('common.actions.refresh')"
						:icon="btnInfoRemaining ? 'i-tabler-clock-pause' : ICONS.actions.refresh"
						:loading="isOperating"
						variant="soft"
						:disabled="btnInfoDisable"
						@click="updateHostInfo"
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
						:label="
							btnServerUpdatesRemaining ? `Espera ${btnServerUpdatesRemaining} segs` : t('common.actions.refresh')
						"
						:icon="btnServerUpdatesRemaining ? 'i-tabler-clock-pause' : ICONS.actions.refresh"
						variant="soft"
						:loading="isOperating"
						:disabled="btnServerUpdatesDisable"
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
						:label="btnMetricsRemaining ? `Espera ${btnMetricsRemaining} segs` : t('common.actions.refresh')"
						:icon="btnMetricsRemaining ? 'i-tabler-clock-pause' : ICONS.actions.refresh"
						variant="soft"
						:loading="isOperating"
						:disabled="btnMetrics"
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
