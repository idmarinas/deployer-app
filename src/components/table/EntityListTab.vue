<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import type { RouteLocationRaw } from 'vue-router'

import type { ModulesName } from '@/utils/deployer-app'

/**
 * Contenido compartido de las pestañas de un listado (Activos / Inactivos).
 *
 * Centraliza los cuatro estados de la vista: lista, vacío, cargando y error.
 * El contenido expandido de cada fila se pasa por el slot `expanded`, por lo
 * que cada entidad conserva su propia tarjeta de detalle.
 */
withDefaults(
	defineProps<{
		columns: TableColumn<any>[]
		items: object[]
		isLoading: boolean
		status: string
		module: ModulesName
		reloadFn: () => void
		addRoute?: RouteLocationRaw
		/** Título del estado vacío; si se omite, usa el de `EmptyList` para el módulo. */
		title?: string
		/** Descripción del estado vacío; si se omite, usa la de `EmptyList` para el módulo. */
		description?: string
		/** Oculta el botón de alta en el estado vacío (p. ej. pestaña Inactivos). */
		showAdd?: boolean
		/** Entidad para el texto de carga (`host`, `variable`, `command`, `passkey`). */
		what?: string
	}>(),
	{
		showAdd: true,
	},
)
</script>

<template>
	<ListTable v-if="!isLoading && status === 'success' && items.length > 0" :columns="columns" :items="items">
		<template #expanded="slotProps">
			<slot name="expanded" v-bind="slotProps" />
		</template>
	</ListTable>

	<EmptyList
		v-else-if="!isLoading && status === 'success' && items.length === 0"
		:module="module"
		:reload-fn="reloadFn"
		:add-route="addRoute"
		:title="title"
		:description="description"
		:show-add="showAdd"
	/>

	<Loading v-else-if="isLoading" :what="what" plural />
	<GeneralError v-else />
</template>
