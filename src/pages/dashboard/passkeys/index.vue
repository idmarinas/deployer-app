<script lang="ts">
import type { Passkey } from '@/types/entities'
import type { TableColumn } from '@nuxt/ui'

import { computed, h, onMounted, ref, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useCopyPasskeyToServer } from '@/composables/useDialog'
import { usePasskeysListAll } from '@/loaders/passkeys'
import { usePasskeysTrash } from '@/loaders/trash'
import { isEncryptedValue } from '@/utils/crypto'
import { ICONS } from '@/utils/icons'

import { usePasskeyQuery } from '@/composables/queries/passkeys'
import { useTableColumns } from '@/composables/useTableColumns'
import { ModulesName } from '@/utils/deployer-app'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-passkeys',
})

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const router = useRouter()
const { t, locale } = useI18n()
const { data: items, isLoading, status, reload, refresh } = usePasskeysListAll()
const passkeyQuery = usePasskeyQuery()
const trash = usePasskeysTrash()

const trashCount = computed(() => trash.data.value?.length ?? 0)
const activeItems = computed(() => (items.value ?? []).filter(item => item.enabled))
const inactiveItems = computed(() => (items.value ?? []).filter(item => !item.enabled))

/** Pestaña seleccionada; el contenido se renderiza fuera de `UTabs` (ver `EntityListTab`). */
const tab = ref('active')
const isInactive = computed(() => tab.value === 'inactive')
const isTrash = computed(() => tab.value === 'trash')

const { tableColumnExpand, tableColumnEnabled, tableColumnActions } = useTableColumns<Passkey>({
	moduleName: ModulesName.Passkeys,
	deleteFn: passkeyQuery.remove,
	findReferences: passkeyQuery.findReferences,
	onReload: reload,
})

const columns: TableColumn<Passkey>[] = [
	tableColumnExpand,
	{
		accessorKey: 'id',
		header: '#',
	},
	{
		accessorKey: 'name',
		header: () => t('pages.passkeys.table.columns.name'),
	},
	{
		accessorKey: 'key_type',
		header: () => t('pages.passkeys.table.columns.type'),
		cell: ({ row }) =>
			h(UBadge, {
				color: 'info',
				variant: 'subtle',
				icon: ICONS.auth.key,
				label: row.original.key_type.toLocaleUpperCase(locale.value),
			}),
	},
	{
		accessorKey: 'fingerprint',
		header: () => t('pages.passkeys.table.columns.fingerprint'),
		cell: ({ row }) => row.original.fingerprint?.replace('SHA256:', '').slice(0, 20),
	},
	tableColumnEnabled,
	tableColumnActions(row => [
		{
			id: 'manage',
			action: 'before',
			targetId: 'edit',
			label: t('common.actions.view'),
			icon: ICONS.actions.view,
			tooltip: true,
			color: 'success',
			variant: 'ghost',
			onClick: () => router.push({ name: 'dashboard-passkeys-id', params: { id: row.original.id } }),
		},
		{
			id: 'copy-to-server',
			action: 'before',
			targetId: 'delete',
			vnode: () =>
				h(UButton, {
					icon: ICONS.server.serverCog,
					variant: 'ghost',
					color: 'neutral',
					async onClick() {
						const copyToServer = useCopyPasskeyToServer()
						await copyToServer({ passkey: row.original })
					},
				}),
		},
	]),
]

onMounted(() => {
	refresh()
})
</script>

<template>
	<UTabs
		v-model="tab"
		:content="false"
		:items="[
			{ label: t('common.tabs.active'), icon: ICONS.status.check, value: 'active' },
			{
				label: `${t('common.tabs.inactive')} ${inactiveItems.length > 0 ? `(${inactiveItems.length})` : ''}`,
				icon: ICONS.status.cross,
				value: 'inactive',
			},
			{
				label: `${t('common.tabs.trash')} ${trashCount > 0 ? `(${trashCount})` : ''}`,
				icon: ICONS.actions.trash,
				value: 'trash',
			},
		]"
	/>

	<TrashTable v-if="isTrash" :module="ModulesName.Passkeys" context="list" />

	<EntityListTab
		v-else
		:columns="columns"
		:items="isInactive ? inactiveItems : activeItems"
		:is-loading="isLoading"
		:status="status"
		:module="ModulesName.Passkeys"
		:reload-fn="reload"
		:add-route="{ name: 'dashboard-passkeys-add' }"
		:show-add="!isInactive"
		:title="isInactive ? t('components.empty_list.inactive.title') : undefined"
		:description="isInactive ? t('components.empty_list.inactive.description') : undefined"
		what="passkey"
	>
		<template #expanded="{ row }">
			<ItemCard
				:id="row.original.id"
				:name="row.original.name"
				:description="row.original.description"
				:updated_at="row.original.updated_at"
				:created_at="row.original.created_at"
			>
				<template #title-right>
					<UBadge
						color="info"
						variant="subtle"
						:icon="ICONS.auth.key"
						:label="row.original.key_type.toLocaleUpperCase(locale)"
					/>
				</template>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.passkey.key_content') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon :name="ICONS.auth.lock" class="text-muted size-4" />
							<span class="font-mono text-xs">
								••••••••••••••••••••••••••••<br />
								••••••••••••••••••••••••••••
							</span>
						</span>
					</div>

					<div class="flex flex-col gap-1 col-span-2">
						<span class="text-xs text-muted font-medium">{{ t('entity.passkey.fingerprint') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon :name="ICONS.auth.fingerprint" class="text-muted size-4" />
							{{ row.original.fingerprint }}
						</span>
					</div>

					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">
							{{ t('entity.passkey.passphrase') }}
						</span>
						<span class="text-sm text-foreground flex items-center gap-2">
							<template v-if="row.original.passphrase && isEncryptedValue(row.original.passphrase)">
								<UIcon :name="ICONS.auth.lock" class="text-muted size-4" />
								<UBadge variant="subtle" size="sm" color="success" class="font-mono">
									<span class="font-mono text-xs">•••••••••••</span>
								</UBadge>
							</template>
							<template v-else>
								<UIcon :name="ICONS.auth.lockOpen" class="text-muted size-4" />
								<UBadge variant="subtle" size="sm" color="warning" class="font-mono">
									<span class="font-mono text-xs">{{ t('common.empty.label') }}</span>
								</UBadge>
							</template>
						</span>
					</div>
				</div>
			</ItemCard>
		</template>
	</EntityListTab>
</template>
