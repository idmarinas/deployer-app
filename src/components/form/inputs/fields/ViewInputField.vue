<!--
	Campo genérico con dos modos de edición, pensado para pantallas "ver + editar":

	1. Modo edición global (isEditMode = true, inyectado por el padre): se comporta
	   como un campo de formulario normal, enlazado por v-model al `state` del
	   UForm del padre. La validación la hace el schema del UForm contenedor.

	2. Modo vista con edición inline puntual (isEditMode = false): muestra el valor
	   como texto. Al pulsar el lápiz se activa edición SOLO de este campo, y al
	   guardar (Enter / botón) se persiste con una llamada `invoke(command, ...)`
	   independiente, enviando únicamente esta clave (compatible con el patrón
	   Patch<T> del backend: el resto de campos no se tocan).

	Requiere `isEditMode` inyectado (ref<boolean>) por el componente padre.
-->
<script lang="ts">
import type { CommandResponse } from '@/types/tauri-types'
import type { Ref } from 'vue'

import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import useToaster from '@/composables/useToaster'
import { ICONS } from '@/utils/icons'

import { useQueryCache } from '@pinia/colada'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

interface SelectItem {
	label: string
	value: string
	description?: string
}
</script>

<script lang="ts" setup>
const props = withDefaults(
	defineProps<{
		/** Clave del campo en la entidad (usada como nombre del `UFormField` y como clave del patch enviado). */
		name: string
		label: string
		help?: string
		hint?: string
		required?: boolean
		/** Tipo de control a renderizar. */
		as?: 'input' | 'textarea' | 'select' | 'select_framework' | 'directory' | 'url' | 'editor'
		/** Opciones para `as="select"`. */
		items?: SelectItem[]
		maxlength?: number
		/** Comando Tauri a invocar para el guardado inline (ej. `crud_update_project`). Si falta, no se ofrece edición inline. */
		command?: string
		/** ID de la entidad a actualizar en el guardado inline. */
		id?: number
		/** Clave de invalidación de `pinia-colada` a refrescar tras guardar (ej. `['projects']`). */
		invalidateKey?: string[]
	}>(),
	{ as: 'input' },
)

const value = defineModel<any>({ required: true })

const { t } = useI18n()
const toaster = useToaster()
const queryCache = useQueryCache()

const isEditMode = inject<Ref<boolean>>('isEditMode')
// `project` (y otras entidades leídas por un loader de pinia-colada) se
// exponen como shallowRef: `value.value = draft.value` actualiza este propio
// componente (defineModel tiene su propio fallback local), pero NO se
// propaga como cambio reactivo al objeto padre si este es una mutación
// anidada. Recargar desde la BD tras guardar garantiza que toda la vista
// (listados, otras tabs, etc.) queda consistente.
const reloadProject = inject<(() => Promise<unknown>) | undefined>('reloadProject')

const editingLocal = ref(false)
const isSaving = ref(false)
const draft = ref(value.value)

watch(value, newValue => {
	if (!editingLocal.value) draft.value = newValue
})

// Proxy de escritura: en modo edición global escribe directamente sobre el
// v-model (lo gestiona el UForm padre); en edición inline puntual escribe
// sobre el borrador local hasta que se confirme el guardado.
const activeValue = computed<any>({
	get: () => (isEditMode?.value ? value.value : draft.value),
	set(newValue) {
		if (isEditMode?.value) {
			value.value = newValue
		} else {
			draft.value = newValue
		}
	},
})

const canInlineEdit = computed(() => !!props.command && !!props.id)

const displayValue = computed(() => {
	if (props.as === 'select' && props.items) {
		return props.items.find(item => item.value === value.value)?.label
	} else if (props.as === 'select_framework') {
		return t(`form.shared.select.framework.${value.value}.label`)
	}

	return value.value
})

function startLocalEdit() {
	if (!canInlineEdit.value) return
	draft.value = value.value
	editingLocal.value = true
}

function cancelLocalEdit() {
	draft.value = value.value
	editingLocal.value = false
}

async function saveLocalEdit() {
	if (draft.value === value.value) {
		editingLocal.value = false
		return
	}

	isSaving.value = true

	try {
		const result = await invoke<CommandResponse>(props.command as string, {
			id: props.id,
			input: { [props.name]: draft.value },
		})

		if (result.success) {
			value.value = draft.value

			if (props.invalidateKey) {
				await queryCache.invalidateQueries({ key: props.invalidateKey }, 'all')
			}

			await reloadProject?.()

			toaster.success(t('overlays.toast.title.success'), t('overlays.toast.description.success'))
			editingLocal.value = false
		} else {
			toaster.error(
				t('overlays.toast.title.error'),
				result.message_key
					? t(result.message_key as any, result.message_params)
					: t('overlays.toast.description.error'),
			)
		}
	} finally {
		isSaving.value = false
	}
}
</script>

<template>
	<UFormField
		:name="name"
		:label="label"
		:help="isEditMode ? help : undefined"
		:hint="isEditMode ? hint : undefined"
		:required="required && isEditMode"
	>
		<!-- Vista de solo lectura -->
		<div v-if="!isEditMode && !editingLocal" class="group flex min-h-8 items-center gap-2">
			<DescriptionViewer v-if="as == 'editor'" :value="value" :placeholder="t('common.empty.description')" />
			<span v-else class="truncate text-sm" :class="{ 'text-muted italic': !displayValue }">
				{{ displayValue || t('common.empty.label') }}
			</span>
			<UButton
				v-if="canInlineEdit"
				:icon="ICONS.actions.edit"
				size="sm"
				color="neutral"
				variant="ghost"
				class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
				@click="startLocalEdit"
			/>
		</div>

		<!-- Campo editable: modo edición global (isEditMode) o edición inline puntual -->
		<div v-else class="flex items-center gap-2">
			<UTextarea
				v-if="as === 'textarea'"
				v-model="activeValue"
				class="w-full"
				:maxlength="maxlength"
				autofocus
				@keyup.esc="cancelLocalEdit"
			>
				<template v-if="maxlength" #trailing>
					<div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
						{{ activeValue?.length ?? 0 }}/{{ maxlength }}
					</div>
				</template>
			</UTextarea>
			<DescriptionEditor v-if="as === 'editor'" v-model="activeValue" />
			<SelectFramework v-else-if="as === 'select_framework'" v-model="activeValue" class="w-full" />
			<USelect v-else-if="as === 'select'" v-model="activeValue" :items="items" value-key="value" class="w-full" />
			<UFieldGroup v-else-if="as === 'directory'" class="w-full">
				<UInput v-model="activeValue" class="w-full" autocomplete="off" />
				<UButton
					:icon="ICONS.actions.folder"
					@click="
						async () => {
							activeValue = (await open({ multiple: false, directory: true })) || ''
						}
					"
				/>
			</UFieldGroup>
			<UInput
				v-else
				v-model="activeValue"
				:type="as === 'url' ? 'url' : 'text'"
				class="w-full"
				autocomplete="off"
				:maxlength="maxlength"
				autofocus
				@keyup.enter="editingLocal && saveLocalEdit()"
				@keyup.esc="cancelLocalEdit"
			/>

			<template v-if="editingLocal">
				<UButton :icon="ICONS.actions.save" color="primary" :loading="isSaving" @click="saveLocalEdit" />
				<UButton
					:icon="ICONS.actions.close"
					color="neutral"
					variant="ghost"
					:disabled="isSaving"
					@click="cancelLocalEdit"
				/>
			</template>
		</div>
	</UFormField>
</template>
