<script lang="ts">
import type { Passkey } from '@/types/entities'
import type { TableColumn } from '@nuxt/ui'

import { h, onMounted, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'

import { useCopyPasskeyToServer } from '@/composables/useDialog'
import { usePasskeysListAll } from '@/loaders/passkeys'
import { isEncryptedValue } from '@/utils/crypto'
import { ICONS } from '@/utils/icons'

import { useQuery } from '@/composables/useQuery'
import { useTableColumns } from '@/composables/useTableColumns'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-passkeys',
})

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const { t, locale } = useI18n()
const { data: items, isLoading, status, reload, refresh } = usePasskeysListAll()
const { passkeys: passkeyQuery } = useQuery()

const { tableColumnExpand, tableColumnActions } = useTableColumns<Passkey>({
	moduleName: 'passkeys',
	deleteFn: passkeyQuery.remove,
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
		header: t('pages.passkeys.table.columns.name'),
	},
	{
		accessorKey: 'key_type',
		header: t('pages.passkeys.table.columns.type'),
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
		header: t('pages.passkeys.table.columns.fingerprint'),
		cell: ({ row }) => row.original.fingerprint?.replace('SHA256:', '').slice(0, 20),
	},
	tableColumnActions(row => [
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
	<ListTable v-if="!isLoading && status === 'success' && items.length > 0" :columns="columns" :items="items">
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
	</ListTable>
	<EmptyList
		v-else-if="!isLoading && status === 'success' && items.length === 0"
		module="passkeys"
		:reload-fn="reload"
		:add-route="{ name: 'dashboard-passkeys-add' }"
	/>
	<Loading v-else-if="isLoading" what="passkey" plural />
	<GeneralError v-else />
</template>
