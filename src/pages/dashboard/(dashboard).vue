<script setup lang="ts">
import { useDashboardButton } from '@/composables/useNavigationMenu'
import { db } from '@/lib/db'
import { projects_docker_compose as composes, hosts, passkeys } from '@/lib/schema'
import { getModuleIcon } from '@/utils/icons'
import { count, desc, eq } from 'drizzle-orm'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, d } = useI18n()

definePage({
	name: 'dashboard-home',
})

const dashboardButton = useDashboardButton()

const isLoading = ref(true)

const hostCount = ref(0)
const hostEnabledCount = ref(0)
const passkeyCount = ref(0)
const composeCount = ref(0)
const composeEnabledCount = ref(0)

interface RecentHost {
	id: number
	name: string
	enabled: boolean
	createdAt: string
}

interface RecentPasskey {
	id: number
	name: string
	keyType: string | null
	createdAt: string
}

interface RecentDockerCompose {
	id: number
	name: string
	enabled: boolean
	hostName: string | null
	createdAt: string
}

const recentHosts = ref<RecentHost[]>([])
const recentPasskeys = ref<RecentPasskey[]>([])
const recentComposes = ref<RecentDockerCompose[]>([])

const totalItems = computed(() => hostCount.value + passkeyCount.value + composeCount.value)
const isEmpty = computed(() => !isLoading.value && totalItems.value === 0)

onMounted(async () => {
	try {
		const [hc, hec, pc, cc, cec, rh, rp, rc] = await Promise.all([
			db
				.select({ c: count() })
				.from(hosts)
				.then(r => Number(r[0]?.c ?? 0)),
			db
				.select({ c: count() })
				.from(hosts)
				.where(eq(hosts.enabled, true))
				.then(r => Number(r[0]?.c ?? 0)),
			db
				.select({ c: count() })
				.from(passkeys)
				.then(r => Number(r[0]?.c ?? 0)),
			db
				.select({ c: count() })
				.from(composes)
				.then(r => Number(r[0]?.c ?? 0)),
			db
				.select({ c: count() })
				.from(composes)
				.where(eq(composes.enabled, true))
				.then(r => Number(r[0]?.c ?? 0)),
			db
				.select({
					id: hosts.id,
					name: hosts.name,
					enabled: hosts.enabled,
					createdAt: hosts.created_at,
				})
				.from(hosts)
				.orderBy(desc(hosts.created_at))
				.limit(5),
			db
				.select({
					id: passkeys.id,
					name: passkeys.name,
					keyType: passkeys.key_type,
					createdAt: passkeys.created_at,
				})
				.from(passkeys)
				.orderBy(desc(passkeys.created_at))
				.limit(5),
			db
				.select({
					id: composes.id,
					name: composes.name,
					enabled: composes.enabled,
					hostName: hosts.name,
					createdAt: composes.created_at,
				})
				.from(composes)
				.leftJoin(hosts, eq(composes.host_id, hosts.id))
				.orderBy(desc(composes.created_at))
				.limit(5),
		])

		hostCount.value = hc
		hostEnabledCount.value = hec
		passkeyCount.value = pc
		composeCount.value = cc
		composeEnabledCount.value = cec
		recentHosts.value = rh as RecentHost[]
		recentPasskeys.value = rp as RecentPasskey[]
		recentComposes.value = rc as RecentDockerCompose[]
	} catch (e) {
		console.error('Error loading dashboard summary:', e)
	} finally {
		isLoading.value = false
	}
})
</script>

<template>
	<UDashboardPanel id="home">
		<template #header>
			<UDashboardNavbar icon="i-tabler-dashboard" :title="t('pages.home.title')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>

				<template #right>
					<UDropdownMenu :items="dashboardButton">
						<UButton icon="i-tabler-plus" square class="rounded-full" />
					</UDropdownMenu>
				</template>
			</UDashboardNavbar>

			<UDashboardToolbar />
		</template>

		<template #body>
			<!-- Loading -->
			<div v-if="isLoading" class="p-6 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<UCard v-for="i in 3" :key="i">
						<div class="flex items-center gap-4">
							<USkeleton class="size-12 rounded-full" />
							<div class="space-y-2">
								<USkeleton class="h-8 w-16" />
								<USkeleton class="h-4 w-24" />
							</div>
						</div>
					</UCard>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<UCard v-for="i in 3" :key="i">
						<template #header>
							<USkeleton class="h-5 w-32" />
						</template>
						<div class="space-y-3">
							<USkeleton v-for="j in 3" :key="j" class="h-8 w-full" />
						</div>
					</UCard>
				</div>
			</div>

			<!-- Empty state -->
			<div v-else-if="isEmpty" class="p-6 max-w-2xl mx-auto">
				<UCard>
					<div class="flex flex-col items-center text-center py-8 gap-6">
						<div class="size-16 rounded-full bg-(--ui-primary)/10 flex items-center justify-center">
							<UIcon :name="getModuleIcon('docker_composes')" class="size-8 text-primary" />
						</div>
						<div class="space-y-2">
							<h2 class="text-xl font-semibold">{{ t('pages.home.empty.title') }}</h2>
							<p class="text-sm text-dimmed">{{ t('pages.home.empty.description') }}</p>
						</div>
						<div class="flex flex-wrap gap-3 justify-center">
							<UButton
								:icon="getModuleIcon('hosts', 'singular')"
								:label="t('components.navigation.add.host.label')"
								to="/dashboard/hosts/add"
								color="primary"
								variant="solid"
							/>
							<UButton
								:icon="getModuleIcon('passkeys')"
								:label="t('components.navigation.add.passkey.label')"
								to="/dashboard/passkeys/add"
								color="primary"
								variant="outline"
							/>
							<UButton
								:icon="getModuleIcon('docker_composes')"
								:label="t('components.navigation.add.docker_compose.label')"
								to="/dashboard/docker_composes/add"
								color="primary"
								variant="outline"
							/>
						</div>
					</div>
				</UCard>
			</div>

			<!-- Dashboard content -->
			<div v-else class="p-6 space-y-6">
				<!-- Summary cards -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<UCard>
						<div class="flex items-center gap-4">
							<div class="flex size-12 items-center justify-center rounded-full bg-(--ui-primary)/10">
								<UIcon :name="getModuleIcon('hosts')" class="size-6 text-primary" />
							</div>
							<div>
								<div class="text-2xl font-bold">{{ hostCount }}</div>
								<div class="text-sm text-dimmed">{{ t('pages.home.summary.hosts') }}</div>
							</div>
						</div>
						<div v-if="hostCount > 0" class="mt-3 flex items-center gap-1.5 text-xs text-dimmed">
							<UIcon name="i-tabler-circle-check" class="size-3.5 text-success" />
							<span>{{ hostEnabledCount }} {{ t('pages.home.summary.enabled') }}</span>
						</div>
					</UCard>

					<UCard>
						<div class="flex items-center gap-4">
							<div class="flex size-12 items-center justify-center rounded-full bg-(--ui-warning)/10">
								<UIcon :name="getModuleIcon('passkeys')" class="size-6 text-warning" />
							</div>
							<div>
								<div class="text-2xl font-bold">{{ passkeyCount }}</div>
								<div class="text-sm text-dimmed">{{ t('pages.home.summary.passkeys') }}</div>
							</div>
						</div>
					</UCard>

					<UCard>
						<div class="flex items-center gap-4">
							<div class="flex size-12 items-center justify-center rounded-full bg-(--ui-info)/10">
								<UIcon :name="getModuleIcon('docker_composes')" class="size-6 text-info" />
							</div>
							<div>
								<div class="text-2xl font-bold">{{ composeCount }}</div>
								<div class="text-sm text-dimmed">{{ t('pages.home.summary.docker_composes') }}</div>
							</div>
						</div>
						<div v-if="composeCount > 0" class="mt-3 flex items-center gap-1.5 text-xs text-dimmed">
							<UIcon name="i-tabler-circle-check" class="size-3.5 text-success" />
							<span>{{ composeEnabledCount }} {{ t('pages.home.summary.enabled') }}</span>
						</div>
					</UCard>
				</div>

				<!-- Recent items -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<!-- Recent hosts -->
					<UCard>
						<template #header>
							<div class="flex items-center justify-between">
								<h3 class="font-semibold text-sm">{{ t('pages.home.recent.hosts') }}</h3>
								<UButton
									v-if="hostCount > 0"
									:label="t('pages.home.recent.view_all')"
									to="/dashboard/hosts"
									color="neutral"
									variant="ghost"
									size="xs"
									:icon="getModuleIcon('hosts')"
									trailing
								/>
							</div>
						</template>

						<div v-if="recentHosts.length === 0" class="py-6 text-center text-sm text-dimmed">
							{{ t('pages.home.recent.no_items') }}
						</div>

						<div v-else class="divide-y divide-default -mx-3">
							<router-link
								v-for="host in recentHosts"
								:key="host.id"
								:to="`/dashboard/hosts/${host.id}`"
								class="flex items-center justify-between px-3 py-2.5 hover:bg-(--ui-bg-elevated)/50 rounded-sm transition-colors"
							>
								<div class="flex items-center gap-2 min-w-0">
									<UIcon
										:name="host.enabled ? getModuleIcon('hosts', 'singular') : getModuleIcon('hosts', 'off')"
										class="size-4 shrink-0"
										:class="host.enabled ? 'text-primary' : 'text-dimmed'"
									/>
									<span class="text-sm truncate">{{ host.name }}</span>
								</div>
								<UBadge :color="host.enabled ? 'success' : 'neutral'" variant="subtle" size="xs" class="shrink-0">
									{{ host.enabled ? 'Activo' : 'Inactivo' }}
								</UBadge>
							</router-link>
						</div>

						<template #footer v-if="recentHosts.length > 0">
							<div class="text-xs text-dimmed pt-1">
								{{ d(recentHosts[recentHosts.length - 1].createdAt, 'short') }}
							</div>
						</template>
					</UCard>

					<!-- Recent passkeys -->
					<UCard>
						<template #header>
							<div class="flex items-center justify-between">
								<h3 class="font-semibold text-sm">{{ t('pages.home.recent.passkeys') }}</h3>
								<UButton
									v-if="passkeyCount > 0"
									:label="t('pages.home.recent.view_all')"
									to="/dashboard/passkeys"
									color="neutral"
									variant="ghost"
									size="xs"
									:icon="getModuleIcon('passkeys')"
									trailing
								/>
							</div>
						</template>

						<div v-if="recentPasskeys.length === 0" class="py-6 text-center text-sm text-dimmed">
							{{ t('pages.home.recent.no_items') }}
						</div>

						<div v-else class="divide-y divide-default -mx-3">
							<router-link
								v-for="key in recentPasskeys"
								:key="key.id"
								:to="{ name: 'dashboard-passkeys-id-edit', params: { id: key.id } }"
								class="flex items-center justify-between px-3 py-2.5 hover:bg-(--ui-bg-elevated)/50 rounded-sm transition-colors"
							>
								<div class="flex items-center gap-2 min-w-0">
									<UIcon :name="getModuleIcon('passkeys')" class="size-4 shrink-0 text-warning" />
									<span class="text-sm truncate">{{ key.name }}</span>
								</div>
								<UBadge v-if="key.keyType" variant="subtle" color="neutral" size="xs" class="shrink-0">
									{{ key.keyType }}
								</UBadge>
							</router-link>
						</div>
					</UCard>

					<!-- Recent docker composes -->
					<UCard>
						<template #header>
							<div class="flex items-center justify-between">
								<h3 class="font-semibold text-sm">{{ t('pages.home.recent.docker_composes') }}</h3>
								<UButton
									v-if="composeCount > 0"
									:label="t('pages.home.recent.view_all')"
									to="/dashboard/docker_composes"
									color="neutral"
									variant="ghost"
									size="xs"
									:icon="getModuleIcon('docker_composes')"
									trailing
								/>
							</div>
						</template>

						<div v-if="recentComposes.length === 0" class="py-6 text-center text-sm text-dimmed">
							{{ t('pages.home.recent.no_items') }}
						</div>

						<div v-else class="divide-y divide-default -mx-3">
							<router-link
								v-for="compose in recentComposes"
								:key="compose.id"
								:to="`/dashboard/docker_composes/${compose.id}`"
								class="flex items-center justify-between px-3 py-2.5 hover:bg-(--ui-bg-elevated)/50 rounded-sm transition-colors"
							>
								<div class="flex items-center gap-2 min-w-0">
									<UIcon
										:name="compose.enabled ? getModuleIcon('docker_composes') : getModuleIcon('docker_composes', 'off')"
										class="size-4 shrink-0"
										:class="compose.enabled ? 'text-info' : 'text-dimmed'"
									/>
									<div class="min-w-0">
										<span class="text-sm truncate block">{{ compose.name }}</span>
										<span v-if="compose.hostName" class="text-xs text-dimmed truncate block">
											{{ compose.hostName }}
										</span>
									</div>
								</div>
								<UBadge :color="compose.enabled ? 'success' : 'neutral'" variant="subtle" size="xs" class="shrink-0">
									{{ compose.enabled ? 'Activo' : 'Inactivo' }}
								</UBadge>
							</router-link>
						</div>
					</UCard>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
