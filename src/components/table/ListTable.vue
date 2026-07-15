<script lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { ref, useTemplateRef } from 'vue'
</script>

<script setup lang="ts">
const props = defineProps<{
	columns: TableColumn<any>[]
	items: object[]
}>()

const table = useTemplateRef('table')
const columnVisibility = ref({})
const globalFilter = ref('')
const expanded = ref({})
</script>

<template>
	<div class="flex py-3.5 justify-between">
		<GlobalFilter v-model="globalFilter" />
		<ToogleColumVisibility :table-api="table?.tableApi" />
	</div>

	<UTable
		ref="table"
		sticky
		:expanded="expanded"
		:global-filter="globalFilter"
		:column-visibility="columnVisibility"
		:data="items"
		:columns="columns"
		:ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
	>
		<template #expanded="{ row }">
			<slot name="expanded" :row="row" />
		</template>
	</UTable>
</template>
