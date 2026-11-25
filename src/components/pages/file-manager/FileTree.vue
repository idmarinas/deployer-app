<script lang="ts">
import type { TreeItem } from '@nuxt/ui'

import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { FileEntry } from '@/types/fileManager'

import { sortFileEntries } from '@/utils/fileEntries'
import { formatBytes } from '@/utils/format'
import { getEntryIcon, ICONS } from '@/utils/icons'

export type { FileEntry } from '@/types/fileManager'

interface FileTreeNode extends TreeItem {
	key: string
	entry: FileEntry
	children?: FileTreeNode[]
	/** Icono calculado; no se asigna `icon` para no dibujarlo dos veces. */
	fileIcon: string
}

/** Subconjunto del evento `select` de Reka que necesitamos cancelar. */
interface TreeSelectEvent {
	detail?: { originalEvent?: { type?: string }; isExpanded?: boolean }
	preventDefault: () => void
}

const MAX_SELECT_DEPTH = 5
const MAX_SELECT_ENTRIES = 500
const MAX_SELECT_NODES = 5000
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		/** Entradas del nivel actual. */
		entries: FileEntry[]
		/** Hijos ya cargados, indexados por la clave de su directorio. */
		childrenByKey: Record<string, FileEntry[]>
		/** Directorios cuyo nivel hijo se está cargando. */
		loadingKeys?: string[]
		emptyLabel: string
		/** Carga un nivel; debe actualizar `childrenByKey` antes de resolverse. */
		loadChildren?: (key: string) => Promise<void>
		/** Selección y expansión restauradas desde la instantánea persistida. */
		initialSelected?: string[]
		initialExpanded?: string[]
		/** Vista de transferencias: nodos siempre abiertos y sin selección. */
		alwaysExpanded?: boolean
		readOnly?: boolean
		truncated?: boolean
	}>(),
	{
		loadingKeys: () => [],
		loadChildren: undefined,
		initialSelected: () => [],
		initialExpanded: () => [],
		alwaysExpanded: false,
		readOnly: false,
		truncated: false,
	},
)

const emit = defineEmits<{
	'update:selected': [entries: FileEntry[]]
	'update:expanded': [keys: string[]]
	/** Un nivel se ha cargado: el panel puede persistir la instantánea. */
	'children-loaded': []
	activate: [entry: FileEntry]
	'limit-reached': []
}>()

const { t, locale } = useI18n()

// shallowRef evita el UnwrapRef profundo de `FileTreeNode` (children recursivos).
const selected = shallowRef<FileTreeNode[]>([])
const expanded = ref<string[]>([])
const limitReached = ref(false)

const dateFormatters = new Map<string, Intl.DateTimeFormat>()

function dateFormatter(activeLocale: string): Intl.DateTimeFormat {
	let formatter = dateFormatters.get(activeLocale)
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(activeLocale, { dateStyle: 'short', timeStyle: 'short' })
		dateFormatters.set(activeLocale, formatter)
	}
	return formatter
}

const treeItems = computed<FileTreeNode[]>(() => sortFileEntries(props.entries, locale.value).map(buildNode))

function nodeOf(item: TreeItem): FileTreeNode {
	return item as FileTreeNode
}

function buildNode(entry: FileEntry): FileTreeNode {
	const loadedChildren = props.childrenByKey[entry.key]

	return {
		key: entry.key,
		entry,
		label: entry.kind === 'dir' ? `${entry.name}/` : entry.name,
		fileIcon: getEntryIcon(entry, expanded.value.includes(entry.key)),
		defaultExpanded: props.alwaysExpanded || undefined,
		// Un array vacío mantiene el nodo expandible aunque sus hijos aún no se hayan pedido.
		children: entry.kind === 'dir' ? sortFileEntries(loadedChildren ?? [], locale.value).map(buildNode) : undefined,
	}
}

function formatModified(seconds: number | null): string {
	if (!seconds) return '—'
	return dateFormatter(locale.value).format(new Date(seconds * 1000))
}

function notifySelection(nodes: FileTreeNode[]) {
	const selectedEntries: FileEntry[] = nodes.map(node => node.entry)
	;(emit as unknown as (event: 'update:selected', entries: FileEntry[]) => void)('update:selected', selectedEntries)
}

watch(selected, notifySelection)
watch(expanded, keys => emit('update:expanded', [...keys]))

// ---------------------------------------------------------------------------
// Restauración de la instantánea
// ---------------------------------------------------------------------------

function collectNodes(nodes: FileTreeNode[], keys: string[], result: FileTreeNode[]) {
	for (const node of nodes) {
		if (keys.includes(node.key)) result.push(node)
		if (node.children?.length) collectNodes(node.children, keys, result)
	}
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every(key => b.includes(key))
}

function applyInitialSelection(keys: string[]) {
	if (props.readOnly || !keys.length) {
		if (selected.value.length) selected.value = []
		return
	}
	if (
		sameKeys(
			selected.value.map(node => node.key),
			keys,
		)
	)
		return

	const found: FileTreeNode[] = []
	collectNodes(treeItems.value, keys, found)
	selected.value = found
}

watch(
	() => props.initialSelected,
	keys => applyInitialSelection(keys),
	{ immediate: true },
)

watch(
	() => props.initialExpanded,
	keys => {
		if (!sameKeys(expanded.value, keys)) expanded.value = [...keys]
	},
	{ immediate: true },
)

function collectDirKeys(nodes: FileTreeNode[], result: string[]) {
	for (const node of nodes) {
		if (node.entry.kind === 'dir') {
			result.push(node.key)
			if (node.children?.length) collectDirKeys(node.children, result)
		}
	}
}

function syncAlwaysExpanded() {
	if (!props.alwaysExpanded) return
	const keys: string[] = []
	collectDirKeys(treeItems.value, keys)
	if (!sameKeys(expanded.value, keys)) expanded.value = keys
}

watch(treeItems, syncAlwaysExpanded, { immediate: true })

function reset() {
	selected.value = []
	expanded.value = []
	limitReached.value = false
}

function setSnapshot(expandedKeys: string[], selectedKeys: string[]) {
	expanded.value = [...expandedKeys]
	applyInitialSelection(selectedKeys)
}

defineExpose({ reset, setSnapshot })

// ---------------------------------------------------------------------------
// Carga de niveles y selección desde el icono
// ---------------------------------------------------------------------------

function onLimit() {
	limitReached.value = true
	emit('limit-reached')
}

async function loadNode(entry: FileEntry): Promise<void> {
	if (entry.kind !== 'dir' || !props.loadChildren) return
	if (props.childrenByKey[entry.key]) return

	await props.loadChildren(entry.key)
	// La prop se actualiza en el siguiente render del panel.
	await nextTick()
	emit('children-loaded')
}

/** Carga todas las ramas antes de marcar un directorio. */
async function ensureLoadedRecursively(
	entry: FileEntry,
	depth = 0,
	counter: { value: number } = { value: 0 },
): Promise<boolean> {
	if (entry.kind !== 'dir') return true
	if (depth > MAX_SELECT_DEPTH) {
		onLimit()
		return false
	}

	await loadNode(entry)
	const children = props.childrenByKey[entry.key]
	if (!children?.length) return true
	if (children.length > MAX_SELECT_ENTRIES) {
		onLimit()
		return false
	}

	for (const child of children) {
		counter.value += 1
		if (counter.value > MAX_SELECT_NODES) {
			onLimit()
			return false
		}
		if (child.kind === 'dir' && !(await ensureLoadedRecursively(child, depth + 1, counter))) {
			return false
		}
	}

	return true
}

async function onIconClick(node: FileTreeNode, handleSelect: () => void) {
	if (props.readOnly) return

	if (node.entry.kind === 'dir' && !selected.value.some(item => item.key === node.key)) {
		await ensureLoadedRecursively(node.entry)
	}
	handleSelect()
}

function selectionIcon(node: FileTreeNode, isSelected: boolean, indeterminate: boolean): string {
	if (indeterminate) return ICONS.status.circleMinus
	if (isSelected) return ICONS.status.circleCheck
	return getEntryIcon(node.entry, expanded.value.includes(node.key))
}

/** El clic en la fila nunca cambia la selección: solo el icono es el control. */
function onSelect(event: TreeSelectEvent) {
	if (event.detail?.originalEvent?.type === 'click') event.preventDefault()
}

function handleToggle(event: TreeSelectEvent, node: FileTreeNode) {
	if (props.alwaysExpanded) {
		event.preventDefault()
		return
	}
	// `isExpanded` puede corresponder al estado anterior o al nuevo según la
	// versión de Reka; cargar en cualquier toggle idempotente es más seguro.
	if (node.entry.kind === 'dir') void loadNode(node.entry)
}
</script>

<template>
	<div>
		<p v-if="truncated || limitReached" class="mb-1 flex items-center gap-1.5 text-xs text-warning">
			<UIcon :name="ICONS.status.alertTriangle" class="size-3.5" />
			{{ t('components.file_manager.entry.partial') }}
		</p>
		<p v-if="limitReached" class="mb-1 text-xs text-muted">
			{{ t('components.file_manager.entry.limit_reached') }}
		</p>

		<p v-if="!treeItems.length" class="text-sm text-muted p-3">{{ emptyLabel }}</p>
		<UTree
			v-else
			v-model="selected"
			v-model:expanded="expanded"
			:items="treeItems"
			:get-key="node => (node as FileTreeNode).key"
			:as="{ link: 'div' }"
			multiple
			selection-behavior="toggle"
			propagate-select
			bubble-select
			@select="onSelect"
			@toggle="handleToggle"
		>
			<template #item="{ item, selected: isSelected, indeterminate, handleSelect }">
				<div class="w-full flex min-w-0 flex-wrap items-center gap-2">
					<button
						type="button"
						class="inline-flex flex-none"
						:title="
							t(
								isSelected && !indeterminate
									? 'components.file_manager.entry.deselect'
									: 'components.file_manager.entry.select',
							)
						"
						:disabled="readOnly || loadingKeys.includes(nodeOf(item).key)"
						@click.stop="onIconClick(nodeOf(item), handleSelect as () => void)"
					>
						<UIcon
							v-if="loadingKeys.includes(nodeOf(item).key)"
							:name="ICONS.status.loading"
							class="size-4 animate-spin"
						/>
						<UIcon v-else :name="selectionIcon(nodeOf(item), isSelected, !!indeterminate)" class="size-4" />
					</button>

					<slot name="node-leading-info" :entry="nodeOf(item).entry" />

					<span class="shrink-0 grow flex items-center gap-1" :title="nodeOf(item).label">
						<span class="shrink-0">{{ nodeOf(item).label }}</span>

						<span
							v-if="nodeOf(item).entry.target"
							class="truncate grow flex items-center gap-1 text-xs text-muted"
							:title="nodeOf(item).entry.target!"
						>
							<UIcon name="i-tabler-arrow-narrow-right" />
							{{ nodeOf(item).entry.target }}
						</span>
					</span>

					<div class="flex items-center gap-2 shrink-0 text-xs text-muted">
						<span v-if="nodeOf(item).entry.kind !== 'dir'">
							{{ formatBytes(nodeOf(item).entry.size) }}
						</span>
						<span>{{ formatModified(nodeOf(item).entry.modified) }}</span>
						<span v-if="nodeOf(item).entry.permissions" class="font-mono">
							{{ nodeOf(item).entry.permissions }}
						</span>
						<slot name="node-status" :entry="nodeOf(item).entry" />
						<slot name="node-progress" :entry="nodeOf(item).entry" />
						<slot name="node-actions" :entry="nodeOf(item).entry" />
						<UButton
							:disabled="!(nodeOf(item).entry.kind === 'dir') && !readOnly"
							:icon="ICONS.actions.arrowRight"
							color="neutral"
							variant="ghost"
							size="xs"
							:title="t('components.file_manager.entry.open')"
							@click.stop="emit('activate', nodeOf(item).entry)"
						/>
					</div>

					<div v-if="$slots['node-details']" class="w-full min-w-0 pl-6">
						<slot name="node-details" :entry="nodeOf(item).entry" />
					</div>
				</div>
			</template>
		</UTree>
	</div>
</template>
