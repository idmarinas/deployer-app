<script lang="ts">
import type { DirEntry } from '@tauri-apps/plugin-fs'
import type { CommandResponse, RemoteEntry, RemoteListing } from '@/types/tauri-types'
import type { FileEntry, FileManagerListingSnapshot } from '@/types/fileManager'

import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { readDir, stat } from '@tauri-apps/plugin-fs'

import FileTree from './FileTree.vue'

import { listingScope, useFileManagerListings } from '@/stores/useFileManagerListings'
import { useFileManagerPreferences } from '@/stores/useFileManagerPreferences'
import { sortFileEntries } from '@/utils/fileEntries'
import { ICONS } from '@/utils/icons'
import { normalizeRemotePath } from '@/utils/paths'

interface Crumb {
	label: string
	path: string
}

/**
 * `target_kind` se añade en Rust y se regenera en `tauri-types.d.ts`.
 * Mientras el usuario no ejecuta el generador, se tolera su ausencia.
 */
type RemoteEntryWithTargetKind = RemoteEntry & {
	target_kind?: 'dir' | 'file' | null
}

const MAX_LIST_ENTRIES = 1000
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		origin: 'local' | 'remote'
		hostId?: number
		/** Ruta sugerida por la preferencia del host; la instantánea manda si existe. */
		initialPath?: string
	}>(),
	{
		hostId: undefined,
		initialPath: undefined,
	},
)

const emit = defineEmits<{
	'update:path': [path: string]
	'update:selected': [entries: FileEntry[]]
	/** Nivel listado en el panel remoto; permite validar las marcas de descarga. */
	'list-loaded': [entries: FileEntry[]]
}>()

const { t, locale } = useI18n()
const listings = useFileManagerListings()
const preferences = useFileManagerPreferences()

const isLocal = computed(() => props.origin === 'local')
const hasRoot = computed(() => (isLocal.value ? !!currentPath.value : !!props.hostId))
const title = computed(() =>
	t(isLocal.value ? 'components.file_manager.panel.local' : 'components.file_manager.panel.remote'),
)
const hint = computed(() =>
	t(isLocal.value ? 'components.file_manager.root.local_hint' : 'components.file_manager.root.remote_hint'),
)

const currentPath = ref(isLocal.value ? (props.initialPath ?? '') : normalizeRemotePath(props.initialPath))
const entries = ref<FileEntry[]>([])
const childrenByKey = ref<Record<string, FileEntry[]>>({})
const loadedKeys = ref<Set<string>>(new Set())
const loadingKeys = ref<string[]>([])
const expandedKeys = ref<string[]>([])
const selection = ref<FileEntry[]>([])
const truncated = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const treeRef = ref<InstanceType<typeof FileTree> | null>(null)

// Índice interno: no se renderiza, así que basta con reconstruirlo al reemplazar
// `entries` o `childrenByKey`, sin envolverlo en una ref reactiva.
let entryIndex = new Map<string, FileEntry>()

function rebuildEntryIndex() {
	const index = new Map<string, FileEntry>()
	for (const entry of entries.value) index.set(entry.key, entry)
	for (const children of Object.values(childrenByKey.value)) {
		for (const child of children) index.set(child.key, child)
	}
	entryIndex = index
}

const scopeKey = computed(() => listingScope(props.origin, currentPath.value, props.hostId))
const initialSelectedKeys = computed(() => selection.value.map(entry => entry.key))

const breadcrumbs = computed<Crumb[]>(() =>
	isLocal.value ? localBreadcrumbs(currentPath.value) : remoteBreadcrumbs(currentPath.value),
)

function localSeparator(path: string): string {
	return path.includes('\\') && !path.includes('/') ? '\\' : '/'
}

function joinLocal(base: string, name: string): string {
	if (!base) return name
	const sep = localSeparator(base)
	return `${base.replace(/[\\/]+$/, '')}${sep}${name}`
}

function localBreadcrumbs(path: string): Crumb[] {
	if (!path) return []
	const sep = localSeparator(path)
	const parts = path.split(/[\\/]/).filter(Boolean)
	const crumbs: Crumb[] = []
	let accumulated = ''

	parts.forEach((part, index) => {
		if (index === 0 && /^[A-Za-z]:$/.test(part)) {
			accumulated = `${part}${sep}`
		} else {
			accumulated = accumulated ? joinLocal(accumulated, part) : part
		}
		crumbs.push({ label: part, path: accumulated })
	})

	return crumbs
}

function remoteBreadcrumbs(path: string): Crumb[] {
	const parts = path.split('/').filter(Boolean)
	const crumbs: Crumb[] = [{ label: '/', path: '/' }]
	let accumulated = ''

	for (const part of parts) {
		accumulated = `${accumulated}/${part}`
		crumbs.push({ label: part, path: accumulated })
	}

	return crumbs
}

async function buildLocalEntries(items: DirEntry[], base: string): Promise<FileEntry[]> {
	return Promise.all(
		items.map(async item => {
			const path = joinLocal(base, item.name)
			let size = 0
			let modified: number | null = null
			let targetKind: FileEntry['targetKind'] = null

			try {
				const info = await stat(path)
				size = info.size
				modified = info.mtime ? Math.floor(info.mtime.getTime() / 1000) : null
				// `stat` sigue el enlace: sin permiso o roto, se deja como `null`.
				if (item.isSymlink) targetKind = info.isDirectory ? 'dir' : 'file'
			} catch {
				// Enlaces rotos o archivos sin permiso: se muestra la entrada sin metadatos.
			}

			return {
				key: path,
				path,
				name: item.name,
				kind: (item.isDirectory ? 'dir' : item.isSymlink ? 'symlink' : 'file') as FileEntry['kind'],
				size,
				modified,
				permissions: null,
				target: null,
				targetKind,
			}
		}),
	)
}

function localReadError(path: string, error: unknown): string {
	const reason = error instanceof Error ? error.message : String(error)
	return t('components.file_manager.errors.read_local', { path, reason })
}

async function listDirectory(path: string): Promise<FileEntry[] | null> {
	errorMessage.value = ''
	loading.value = true

	try {
		if (isLocal.value) {
			const listed = sortFileEntries(await buildLocalEntries(await readDir(path), path), locale.value)
			// Exactamente `MAX_LIST_ENTRIES` entradas no implica que falten más.
			truncated.value = listed.length > MAX_LIST_ENTRIES
			return listed
		}

		if (!props.hostId) return null

		const response = await invoke<CommandResponse<RemoteListing>>('ssh_list_remote_dir', {
			input: {
				host_id: props.hostId,
				path,
				ssh_reconnect_attempts: 3,
				max_entries: MAX_LIST_ENTRIES,
			},
		})

		if (!response.success || !response.data) {
			errorMessage.value = t(response.message_key, response.message_params)
			return null
		}

		const listed: FileEntry[] = sortFileEntries(
			(response.data.entries as RemoteEntryWithTargetKind[]).map(entry => ({
				key: entry.path,
				path: entry.path,
				name: entry.name,
				kind: entry.kind as FileEntry['kind'],
				size: entry.size,
				modified: entry.modified,
				permissions: entry.permissions,
				target: entry.target,
				targetKind:
					entry.target_kind === 'dir' ? 'dir' : entry.target_kind === 'file' ? 'file' : null,
			})),
			locale.value,
		)
		truncated.value = response.data.truncated
		emit('list-loaded', listed)
		return listed
	} catch (error) {
		errorMessage.value = isLocal.value
			? localReadError(path, error)
			: t('components.file_manager.errors.load')
		return null
	} finally {
		loading.value = false
	}
}

// ---------------------------------------------------------------------------
// Instantáneas persistentes (stale-while-revalidate)
// ---------------------------------------------------------------------------

function snapshot(): FileManagerListingSnapshot {
	return {
		path: currentPath.value,
		entries: [...entries.value],
		childrenByKey: { ...childrenByKey.value },
		loadedKeys: [...loadedKeys.value],
		expandedKeys: [...expandedKeys.value],
		selection: [...selection.value],
		truncated: truncated.value,
	}
}

function persist(key = scopeKey.value, snap = snapshot()) {
	void listings.save(key, props.origin, snap.path, props.hostId, snap)
}

async function hydrateFrom(key: string, fallbackPath: string): Promise<boolean> {
	const snap = await listings.load(key)
	if (!snap) return false

	currentPath.value = isLocal.value ? (snap.path || fallbackPath) : normalizeRemotePath(snap.path || fallbackPath)
	// Las instantáneas escritas antes del comparador se normalizan al hidratar.
	entries.value = sortFileEntries(snap.entries ?? [], locale.value)
	const hydratedChildren: Record<string, FileEntry[]> = {}
	for (const [key, children] of Object.entries(snap.childrenByKey ?? {})) {
		hydratedChildren[key] = sortFileEntries(children, locale.value)
	}
	childrenByKey.value = hydratedChildren
	rebuildEntryIndex()
	loadedKeys.value = new Set(snap.loadedKeys ?? [])
	expandedKeys.value = [...(snap.expandedKeys ?? [])]
	selection.value = [...(snap.selection ?? [])]
	truncated.value = !!snap.truncated
	return true
}

function knownKeys(): Set<string> {
	return new Set(entryIndex.keys())
}

async function refresh(options: { preserve?: boolean } = {}) {
	if (!hasRoot.value) return

	if (!options.preserve) {
		childrenByKey.value = {}
		rebuildEntryIndex()
		loadedKeys.value = new Set()
		loadingKeys.value = []
		expandedKeys.value = []
		treeRef.value?.reset()
	}

	const listed = await listDirectory(currentPath.value)
	if (!listed) return

	entries.value = listed
	rebuildEntryIndex()
	const valid = knownKeys()
	selection.value = selection.value.filter(entry => valid.has(entry.key))
	persist()
}

let initializing = false
async function initialize(pathHint: string) {
	if (initializing) return
	initializing = true

	try {
		const key = listingScope(props.origin, pathHint, props.hostId)
		const restored = await hydrateFrom(key, pathHint)
		if (!restored) {
			currentPath.value = isLocal.value ? pathHint : normalizeRemotePath(pathHint || '/')
		}
		emit('update:path', currentPath.value)
		await refresh({ preserve: restored })
	} finally {
		initializing = false
	}
}

// ---------------------------------------------------------------------------
// Navegación y árbol
// ---------------------------------------------------------------------------

function findEntry(key: string): FileEntry | undefined {
	return entryIndex.get(key)
}

async function loadChildren(key: string): Promise<void> {
	const entry = findEntry(key)
	if (!entry || entry.kind !== 'dir') return
	if (loadedKeys.value.has(key) || loadingKeys.value.includes(key)) return

	loadingKeys.value = [...loadingKeys.value, key]
	const listed = await listDirectory(entry.path)
	if (listed) {
		childrenByKey.value = { ...childrenByKey.value, [key]: listed }
		rebuildEntryIndex()
		loadedKeys.value = new Set([...loadedKeys.value, key])
		const valid = knownKeys()
		selection.value = selection.value.filter(entry => valid.has(entry.key))
	}
	loadingKeys.value = loadingKeys.value.filter(item => item !== key)
	persist()
}

async function navigate(path: string, options: { discard?: boolean } = {}) {
	const next = isLocal.value ? path : normalizeRemotePath(path)
	if (next === currentPath.value) return

	if (!options.discard) persist()
	currentPath.value = next
	emit('update:path', next)
	await initialize(next)
}

function activate(entry: FileEntry) {
	if (entry.kind === 'dir') void navigate(entry.path)
}

function onSelected(list: FileEntry[]) {
	if (list.length === selection.value.length && list.every((entry, i) => entry.key === selection.value[i]?.key)) {
		return
	}
	selection.value = list
	emit('update:selected', list)
	persist()
}

function onExpanded(keys: string[]) {
	if (keys.length === expandedKeys.value.length && keys.every((key, i) => key === expandedKeys.value[i])) return
	expandedKeys.value = keys
	persist()
}

function onChildrenLoaded() {
	persist()
}

function onLimitReached() {
	truncated.value = true
	persist()
}

async function chooseLocalRoot() {
	const selected = await open({
		directory: true,
		multiple: false,
		// Sin `recursive`, plugin-dialog solo autoriza el directorio y sus hijos
		// directos: `readDir` de un subdirectorio falla con "forbidden path".
		recursive: true,
		title: t('components.file_manager.root.select'),
	})
	if (typeof selected !== 'string') return
	await navigate(selected)
}

async function resetRemotePath() {
	if (props.hostId === undefined) return
	preferences.resetRemotePath(props.hostId)
	const key = listingScope('remote', currentPath.value, props.hostId)
	listings.remove(key)
	const path = normalizeRemotePath(await preferences.getInitialRemotePath(props.hostId))
	// No guardamos la instantánea anterior: es justo la que acabamos de borrar.
	await navigate(path, { discard: true })
}

watch(
	() => props.hostId,
	async hostId => {
		if (props.origin !== 'remote') return
		const pathHint = hostId ? await preferences.getInitialRemotePath(hostId) : '/'
		await initialize(pathHint)
	},
	{ immediate: true },
)

watch(
	() => props.initialPath,
	async path => {
		if (props.origin !== 'local') return
		await initialize(path ?? '')
	},
	{ immediate: true },
)

onBeforeUnmount(() => persist())
</script>

<template>
	<section class="flex flex-col h-full min-h-0 rounded-lg border border-default bg-default/30">
		<header class="flex items-center justify-between gap-2 p-3 border-b border-default">
			<div class="flex items-center gap-2 font-medium">
				<UIcon :name="isLocal ? ICONS.server.deviceDesktop : ICONS.server.server" class="size-4" />
				{{ title }}
			</div>
			<div class="flex items-center gap-1">
				<slot name="header-actions" />
				<UButton
					v-if="!isLocal && hostId"
					:icon="ICONS.actions.reset"
					:label="t('components.file_manager.root.reset')"
					:title="t('components.file_manager.root.reset_hint')"
					color="neutral"
					variant="ghost"
					size="xs"
					:disabled="loading"
					@click="resetRemotePath"
				/>
				<UButton
					v-if="isLocal"
					:icon="ICONS.actions.folder"
					:label="t('components.file_manager.root.select')"
					color="neutral"
					variant="ghost"
					size="xs"
					@click="chooseLocalRoot"
				/>
				<UButton
					:icon="ICONS.actions.refresh"
					:title="t('components.file_manager.refresh')"
					color="neutral"
					variant="ghost"
					size="xs"
					:disabled="!hasRoot || loading"
					@click="refresh()"
				/>
			</div>
		</header>

		<div class="px-3 py-2 border-b border-default min-h-10">
			<UBreadcrumb v-if="breadcrumbs.length" :items="breadcrumbs">
				<template #item="{ item }">
					<UButton
						:label="(item as Crumb).label"
						color="neutral"
						variant="link"
						size="xs"
						@click="navigate((item as Crumb).path)"
					/>
				</template>
			</UBreadcrumb>
			<p v-else class="text-sm text-muted">{{ hint }}</p>
		</div>

		<p v-if="errorMessage" class="mx-3 mt-2 text-sm text-error">{{ errorMessage }}</p>

		<div class="flex-1 min-h-0 overflow-y-auto p-2">
			<div v-if="!hasRoot" class="flex items-center gap-2 text-sm text-muted p-3">
				<UIcon :name="ICONS.misc.infoCircle" class="size-4" />
				{{ hint }}
			</div>
			<div v-else-if="loading && !entries.length" class="flex items-center gap-2 text-sm text-muted p-3">
				<UIcon :name="ICONS.status.loading" class="size-4 animate-spin" />
				{{ t('components.file_manager.loading') }}
			</div>
			<div v-else-if="!entries.length" class="text-sm text-muted p-3">
				{{ t('components.file_manager.empty') }}
			</div>
			<FileTree
				v-else
				ref="treeRef"
				:entries="entries"
				:children-by-key="childrenByKey"
				:loading-keys="loadingKeys"
				:initial-selected="initialSelectedKeys"
				:initial-expanded="expandedKeys"
				:truncated="truncated"
				:empty-label="t('components.file_manager.empty')"
				:load-children="loadChildren"
				@update:selected="onSelected"
				@update:expanded="onExpanded"
				@children-loaded="onChildrenLoaded"
				@limit-reached="onLimitReached"
				@activate="activate"
			>
				<template #node-actions="{ entry }">
					<slot name="node-actions" :entry="entry" />
				</template>
				<template #node-status="{ entry }">
					<slot name="node-status" :entry="entry" />
				</template>
				<template #node-progress="{ entry }">
					<slot name="node-progress" :entry="entry" />
				</template>
			</FileTree>
		</div>
	</section>
</template>
