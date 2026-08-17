<script lang="ts">
import { onClickOutside, useDebounceFn } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { fetchDockerHubTags, searchDockerHub } from '@/lib/docker-compose/docker-hub'
</script>

<script setup lang="ts">
const model = defineModel<string | undefined>({ required: true })

const { t } = useI18n()

// ============================================================================
// Types
// ============================================================================

interface ImageResult {
	name: string
	description: string
	pull_count: number
	star_count: number
	official: boolean
}

interface ParsedTag {
	/** Full tag name as-is from Docker Hub */
	full: string
	/** Version part: `latest`, `lts`, `stable`, or semver like `1.31.3` */
	version: string
	/** Variant part after first `-`, or empty string */
	variant: string
}

interface VersionOption {
	/** The version string to display */
	version: string
	/** Whether this is a special version (latest, lts, stable) */
	special: boolean
	/** All parsed tags belonging to this version */
	tags: ParsedTag[]
	/** Number of selectable variants for this version (distinct variants + default) */
	variantCount: number
}

// ============================================================================
// Constants
// ============================================================================

const SPECIAL_VERSIONS = ['latest', 'lts', 'stable', 'edge', 'develop', 'nightly', 'canary']

// ============================================================================
// State
// ============================================================================

const imageInput = ref('')
const selectedImage = ref('')
const versionInput = ref('')
const selectedVersion = ref('')
const variantInput = ref('')
const selectedVariant = ref('')

const searchResults = ref<ImageResult[]>([])
const isSearching = ref(false)
const showImageDropdown = ref(false)

const parsedTags = ref<ParsedTag[]>([])
const isLoadingTags = ref(false)
const showVersionDropdown = ref(false)
const showVariantDropdown = ref(false)

const imageDropdownRef = ref<HTMLElement | null>(null)
const versionDropdownRef = ref<HTMLElement | null>(null)
const variantDropdownRef = ref<HTMLElement | null>(null)

// ============================================================================
// Tag parsing
// ============================================================================

function isSpecialVersion(v: string): boolean {
	return SPECIAL_VERSIONS.includes(v.toLowerCase())
}

function semverTuple(v: string): number[] {
	const parts = v.split('.')
	const nums: number[] = []
	for (const p of parts) {
		const n = Number.parseInt(p, 10)
		nums.push(Number.isNaN(n) ? 0 : n)
	}
	while (nums.length < 3) nums.push(0)
	return nums
}

function semverCompareDesc(a: string, b: string): number {
	const ta = semverTuple(a)
	const tb = semverTuple(b)
	for (let i = 0; i < 3; i++) {
		if (ta[i] !== tb[i]) return tb[i] - ta[i]
	}
	return 0
}

// ============================================================================
// Derived
// ============================================================================

const versionOptions = computed<VersionOption[]>(() => {
	const map = new Map<string, VersionOption>()
	for (const tag of parsedTags.value) {
		if (!map.has(tag.version)) {
			map.set(tag.version, {
				version: tag.version,
				special: isSpecialVersion(tag.version),
				tags: [],
				variantCount: 0,
			})
		}
		map.get(tag.version)!.tags.push(tag)
	}

	const arr = Array.from(map.values())
	for (const opt of arr) {
		const variants = new Set(opt.tags.filter(t => t.variant).map(t => t.variant))
		opt.variantCount = variants.size + (opt.tags.some(t => !t.variant) ? 1 : 0)
	}

	const specials = arr.filter(o => o.special).sort((a, b) => SPECIAL_VERSIONS.indexOf(a.version) - SPECIAL_VERSIONS.indexOf(b.version))
	const semvers = arr.filter(o => !o.special).sort((a, b) => semverCompareDesc(a.version, b.version))

	return [...specials, ...semvers]
})

const variantOptions = computed(() => {
	if (!selectedVersion.value) return []
	const version = versionOptions.value.find(o => o.version === selectedVersion.value)
	if (!version) return []

	const variants = new Map<string, ParsedTag>()
	for (const tag of version.tags) {
		if (tag.variant && !variants.has(tag.variant)) {
			variants.set(tag.variant, tag)
		}
	}

	const hasDefault = version.tags.some(t => !t.variant)
	const options: { label: string; value: string; fullTag: string }[] = []

	if (hasDefault) {
		options.push({ label: '(default)', value: '', fullTag: version.version })
	}

	for (const [v, tag] of variants) {
		options.push({ label: v, value: v, fullTag: tag.full })
	}

	return options
})

const filteredVersions = computed(() => {
	const q = versionInput.value.toLowerCase().trim()
	if (!q) return versionOptions.value
	return versionOptions.value.filter(o => o.version.toLowerCase().includes(q))
})

const filteredVariants = computed(() => {
	const q = variantInput.value.toLowerCase().trim()
	const opts = variantOptions.value
	if (!q) return opts
	return opts.filter(o => o.label.toLowerCase().includes(q))
})

// ============================================================================
// Compose model value
// ============================================================================

function composeModelValue() {
	if (!selectedImage.value || !selectedVersion.value) return
	const variant = selectedVariant.value
	model.value = variant
		? `${selectedImage.value}:${selectedVersion.value}-${variant}`
		: `${selectedImage.value}:${selectedVersion.value}`
}

function parseModelValue(val: string | undefined) {
	if (!val) return
	const colonIdx = val.indexOf(':')
	if (colonIdx <= 0) {
		if (val) {
			selectedImage.value = val
			imageInput.value = val
		}
		return
	}

	const img = val.substring(0, colonIdx)
	const tag = val.substring(colonIdx + 1)
	const dashIdx = tag.indexOf('-')

	if (dashIdx > 0) {
		selectedVersion.value = tag.substring(0, dashIdx)
		versionInput.value = selectedVersion.value
		selectedVariant.value = tag.substring(dashIdx + 1)
		variantInput.value = selectedVariant.value
	} else {
		selectedVersion.value = tag
		versionInput.value = tag
		selectedVariant.value = ''
		variantInput.value = ''
	}

	if (img !== selectedImage.value) {
		selectedImage.value = img
		imageInput.value = img
	}
}

// ============================================================================
// Image search
// ============================================================================

const doSearchImages = useDebounceFn(async (query: string) => {
	if (!query || query.length < 2) {
		searchResults.value = []
		showImageDropdown.value = false
		return
	}
	isSearching.value = true
	showImageDropdown.value = true
	try {
		searchResults.value = await searchDockerHub(query)
	} finally {
		isSearching.value = false
	}
}, 400)

watch(imageInput, val => {
	if (val !== selectedImage.value) {
		selectedImage.value = ''
		selectedVersion.value = ''
		versionInput.value = ''
		selectedVariant.value = ''
		variantInput.value = ''
		parsedTags.value = []
	}
	doSearchImages(val)
})

// ============================================================================
// Tag fetch
// ============================================================================

const doFetchTags = useDebounceFn(async () => {
	if (!selectedImage.value) return
	isLoadingTags.value = true
	try {
		const tags = await fetchDockerHubTags(selectedImage.value)
		parsedTags.value = tags.map(t => ({ full: t.name, version: t.version, variant: t.variant }))
	} finally {
		isLoadingTags.value = false
	}
}, 200)

// ============================================================================
// Init from model
// ============================================================================

watch(model, val => {
	parseModelValue(val)
}, { immediate: true })

// ============================================================================
// Selection
// ============================================================================

function selectImage(imageName: string) {
	selectedImage.value = imageName
	imageInput.value = imageName
	showImageDropdown.value = false
	selectedVersion.value = ''
	versionInput.value = ''
	selectedVariant.value = ''
	variantInput.value = ''
	parsedTags.value = []
	model.value = undefined
	nextTick(() => { doFetchTags() })
}

function selectVersion(version: string) {
	selectedVersion.value = version
	versionInput.value = version
	showVersionDropdown.value = false
	selectedVariant.value = ''
	variantInput.value = ''
	composeModelValue()
}

function selectVariant(variant: string) {
	selectedVariant.value = variant
	variantInput.value = variant
	showVariantDropdown.value = false
	composeModelValue()
}

function clearImage() {
	selectedImage.value = ''
	imageInput.value = ''
	selectedVersion.value = ''
	versionInput.value = ''
	selectedVariant.value = ''
	variantInput.value = ''
	parsedTags.value = []
	model.value = undefined
}

// ============================================================================
// Click outside
// ============================================================================

onClickOutside(imageDropdownRef, () => { showImageDropdown.value = false })
onClickOutside(versionDropdownRef, () => { showVersionDropdown.value = false })
onClickOutside(variantDropdownRef, () => { showVariantDropdown.value = false })
</script>

<template>
	<div class="flex flex-col gap-2">
		<!-- Image input -->
		<div ref="imageDropdownRef" class="relative">
			<div class="flex items-center gap-1">
				<UInput
					v-model="imageInput"
					class="flex-1 font-mono"
					:icon="isSearching ? 'i-tabler-loader-2' : 'i-tabler-search'"
					:loading="isSearching"
					:placeholder="t('form.docker_composes.service.image.placeholder')"
					autocomplete="off"
					@focus="() => { if (searchResults.length > 0) showImageDropdown = true }"
				/>
				<UButton v-if="selectedImage" icon="i-tabler-x" color="neutral" variant="ghost" size="sm" @click="clearImage" />
			</div>

			<div
				v-if="showImageDropdown && searchResults.length > 0"
				class="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-default bg-default shadow-lg"
			>
				<button
					v-for="(r, idx) in searchResults"
					:key="idx"
					class="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted/50 cursor-pointer"
					@click="selectImage(r.name)"
				>
					<span class="truncate font-mono font-medium">{{ r.name }}</span>
					<span v-if="r.official" class="shrink-0 text-xs text-primary font-semibold">official</span>
					<span class="ml-auto shrink-0 text-xs text-muted truncate max-w-40">{{ r.description }}</span>
				</button>
			</div>
		</div>

		<!-- Version + Variant row -->
		<div class="grid grid-cols-2 gap-2">
			<!-- Version input -->
			<div ref="versionDropdownRef" class="relative">
				<UInput
					v-model="versionInput"
					class="w-full font-mono"
					:icon="isLoadingTags ? 'i-tabler-loader-2' : 'i-tabler-tag'"
					:loading="isLoadingTags"
					:placeholder="selectedImage
						? t('form.docker_composes.service.image.version_placeholder')
						: t('form.docker_composes.service.image.version_disabled')"
					:disabled="!selectedImage"
					autocomplete="off"
					@focus="() => {
						if (parsedTags.length > 0) {
							showVersionDropdown = true
							if (!parsedTags.length) doFetchTags()
						}
					}"
					@input="() => { if (selectedImage && parsedTags.length === 0) doFetchTags() }"
				/>

				<div
					v-if="showVersionDropdown && filteredVersions.length > 0"
					class="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-default bg-default shadow-lg"
				>
					<button
						v-for="opt in filteredVersions"
						:key="opt.version"
						class="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted/50 cursor-pointer"
						@click="selectVersion(opt.version)"
					>
						<span class="font-mono text-sm">{{ opt.version }}</span>
					<span v-if="opt.special" class="shrink-0 text-xs text-primary font-semibold">{{ opt.version }}</span>
					<span class="ml-auto shrink-0 text-xs text-muted">{{ t('form.docker_composes.service.image.variant_count', { count: opt.variantCount }) }}</span>
					</button>
				</div>
			</div>

			<!-- Variant input -->
			<div ref="variantDropdownRef" class="relative">
				<UInput
					v-model="variantInput"
					class="w-full font-mono"
					icon="i-tabler-layer-slash"
					:placeholder="selectedVersion && filteredVariants.length > 0
						? t('form.docker_composes.service.image.variant_placeholder')
						: t('form.docker_composes.service.image.variant_empty')"
					:disabled="!selectedVersion || filteredVariants.length === 0"
					autocomplete="off"
					@focus="() => { if (filteredVariants.length > 0) showVariantDropdown = true }"
				/>

				<div
					v-if="showVariantDropdown && filteredVariants.length > 0"
					class="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-default bg-default shadow-lg"
				>
					<button
						v-for="opt in filteredVariants"
						:key="opt.value"
						class="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted/50 cursor-pointer"
						@click="selectVariant(opt.value)"
					>
						<span class="font-mono text-sm">{{ opt.label }}</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
