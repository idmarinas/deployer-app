<script lang="ts">
import type { Column, Table } from '@tanstack/vue-table'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const props = defineProps<{ tableApi: Table<any> | undefined }>()

const { t } = useI18n()
</script>

<template>
	<UDropdownMenu
		:items="
			tableApi
				?.getAllColumns()
				.filter((column: Column<any>) => column.getCanHide())
				.map((column: Column<any>) => ({
					label: column.columnDef.header as string,
					type: 'checkbox' as const,
					checked: column.getIsVisible(),
					onUpdateChecked(checked: boolean) {
						tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
					},
					onSelect(e: Event) {
						e.preventDefault()
					},
				}))
		"
		:content="{ align: 'end' }"
	>
		<UButton
			:label="t('common.table.columns')"
			color="neutral"
			variant="outline"
			trailing-icon="i-tabler-chevron-down"
		/>
	</UDropdownMenu>
</template>
