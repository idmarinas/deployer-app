<script lang="ts">
import type { GlobalVariableScope } from '@/drizzle/lib/variables'
import type { OutputParser } from '@/utils/commands/types'
import type { InterpolationRoots, InterpolationSegment } from '@/utils/interpolation'

import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import SelectHost from '@/components/form/selects/SelectHost.vue'
import RemoteOutput from '@/components/remote/RemoteOutput.vue'
import { loadGlobalScopeMetadata } from '@/drizzle/lib/variables'
import { runCommand, runCustomCommand } from '@/utils/commands/runner'
import { ICONS } from '@/utils/icons'
import { findReferences, interpolateSegments, REDACTED_MARKER, validateTemplate } from '@/utils/interpolation'
</script>

<script setup lang="ts">
const emits = defineEmits<{
	close: [value: boolean]
}>()
const props = defineProps<{
	title?: string
	description?: string
	command: string
	parser?: OutputParser
	timeout?: number
	/**
	 * Si se pasa un key existente en BD, se ejecuta vía `runCommand` (la BD es
	 * la fuente de la definición). Si no, se ejecuta el comando ad-hoc del
	 * formulario (aún no guardado) vía `runCustomCommand`.
	 */
	commandKey?: string
}>()

const { t } = useI18n()

const hostId = ref<number | undefined>()
const isLoading = ref(false)
const output = ref('')
const lastExitCode = ref<number | null>(null)
const errorMessage = ref('')

const globalScope = ref<GlobalVariableScope>({})
const scopeLoaded = ref(false)
const scopeLoading = ref(true)

const interpolationRoots = computed<InterpolationRoots>(() => ({ global: globalScope.value }))

const issues = computed(() =>
	scopeLoaded.value ? validateTemplate(props.command ?? '', interpolationRoots.value) : [],
)
const errors = computed(() => issues.value.filter(issue => issue.severity === 'error'))
const warnings = computed(() => issues.value.filter(issue => issue.severity === 'warning'))

/**
 * Fragmento de la vista previa: texto literal o una expresión interpolada.
 * `secret` marca las expresiones de variables secretas (valor enmascarado).
 */
interface PreviewPart {
	text: string
	interpolated: boolean
	secret: boolean
}

const previewTab = ref('interpolated')

const previewTabs = computed(() => [
	{ label: t('dialogs.commands.test.preview.tabs.interpolated'), value: 'interpolated' },
	{ label: t('dialogs.commands.test.preview.tabs.original'), value: 'original' },
])

/**
 * Vista interpolada con las secretas enmascaradas. Solo se calcula si no hay
 * errores: con una referencia inválida no se puede resolver la plantilla.
 */
const interpolatedParts = computed<PreviewPart[]>(() => {
	if (!scopeLoaded.value || errors.value.length > 0) return []

	let segments: InterpolationSegment[]
	try {
		segments = interpolateSegments(props.command ?? '', interpolationRoots.value)
	} catch {
		return []
	}

	return segments.map(segment =>
		segment.kind === 'reference'
			? { text: segment.text, interpolated: true, secret: segment.isSecret }
			: { text: segment.text, interpolated: false, secret: false },
	)
})

/**
 * Vista original: la plantilla tal cual se guardó, resaltando las expresiones
 * que se van a interpolar.
 */
const originalParts = computed<PreviewPart[]>(() => {
	const template = props.command ?? ''
	const secretPaths = new Set(
		Object.values(globalScope.value)
			.filter(variable => variable.isSecret)
			.map(variable => `global.${variable.slug}`),
	)

	const parts: PreviewPart[] = []
	let cursor = 0

	for (const ref of findReferences(template)) {
		if (ref.start > cursor) {
			parts.push({ text: template.slice(cursor, ref.start), interpolated: false, secret: false })
		}

		parts.push({ text: ref.expression, interpolated: true, secret: secretPaths.has(ref.path) })
		cursor = ref.end
	}

	if (cursor < template.length) {
		parts.push({ text: template.slice(cursor), interpolated: false, secret: false })
	}

	return parts
})

const activeParts = computed(() => (previewTab.value === 'original' ? originalParts.value : interpolatedParts.value))
const hasReferences = computed(() => interpolatedParts.value.some(part => part.interpolated))

/** El texto se escapa: los valores resueltos son datos del usuario. */
function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`)
}

function partClass(part: PreviewPart): string {
	if (!part.interpolated) return ''
	if (part.secret) return 'rounded-sm bg-warning/10 px-0.5 text-warning'

	return 'rounded-sm bg-primary/10 px-0.5 text-primary'
}

const previewHtml = computed(() =>
	activeParts.value
		.map(part => {
			const classes = partClass(part)
			const text = escapeHtml(part.text)

			return classes ? `<span class="${classes}">${text}</span>` : text
		})
		.join(''),
)

const canRun = computed(
	() => Boolean(hostId.value) && scopeLoaded.value && errors.value.length === 0 && !isLoading.value,
)

async function run() {
	if (!hostId.value || errors.value.length > 0) return

	isLoading.value = true
	errorMessage.value = ''
	output.value = ''
	lastExitCode.value = null

	try {
		const result = props.commandKey
			? await runCommand(props.commandKey, hostId.value)
			: await runCustomCommand(
					{
						id: props.commandKey ?? 'ad-hoc',
						name: props.title ?? 'ad-hoc',
						command: props.command,
						parser: props.parser ?? { type: 'raw' },
						timeout_secs: props.timeout,
					},
					hostId.value,
				)

		output.value = result.raw_output
		lastExitCode.value = result.exit_code
	} catch (e) {
		errorMessage.value = String(e)
	} finally {
		isLoading.value = false
	}
}

function clearOutput() {
	output.value = ''
	lastExitCode.value = null
	errorMessage.value = ''
}

onMounted(async () => {
	try {
		globalScope.value = await loadGlobalScopeMetadata()
		scopeLoaded.value = true
	} finally {
		scopeLoading.value = false
	}
})
</script>

<template>
	<UModal
		:title="title ?? t('dialogs.commands.test.title')"
		:dismissible="false"
		:ui="{ content: 'max-w-3xl', footer: 'justify-end' }"
	>
		<template #body>
			<div class="flex flex-col gap-4">
				<div class="flex items-center gap-2">
					<UFormField
						name="host_id"
						:label="t('dialogs.commands.test.host.label')"
						:help="t('dialogs.commands.test.host.help')"
						class="flex-1"
						required
					>
						<SelectHost v-model="hostId" :only-enabled="true" />
					</UFormField>
					<UButton
						:label="t('dialogs.commands.test.run')"
						:icon="ICONS.actions.play"
						:loading="isLoading"
						:disabled="!canRun"
						variant="outline"
						color="primary"
						@click="run"
					/>
				</div>

				<div v-if="scopeLoading" class="flex items-center gap-2 text-xs text-muted">
					<UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
					{{ t('dialogs.commands.test.loading_variables') }}
				</div>
				<div v-else-if="!scopeLoaded" class="flex items-center gap-2 text-xs text-warning">
					<UIcon name="i-tabler-alert-triangle" class="size-4" />
					{{ t('dialogs.commands.test.load_error') }}
				</div>

				<div v-if="errors.length > 0" class="rounded-lg border border-error/40 bg-error/5 p-3">
					<p class="mb-1 flex items-center gap-1.5 text-sm font-medium text-error">
						<UIcon name="i-tabler-alert-circle" class="size-4 shrink-0" />
						{{ t('dialogs.commands.test.issues.errors') }}
					</p>
					<ul class="flex flex-col gap-1">
						<li v-for="issue in errors" :key="`${issue.start}-${issue.code}`" class="text-xs text-error">
							{{ t(issue.messageKey, issue.messageParams) }}
						</li>
					</ul>
				</div>

				<div v-if="previewHtml" class="flex flex-col gap-1">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<span class="text-xs font-medium text-muted">{{ t('dialogs.commands.test.preview.label') }}</span>
						<UTabs
							v-if="hasReferences"
							v-model="previewTab"
							:items="previewTabs"
							:content="false"
							variant="link"
							size="xs"
						/>
					</div>
					<pre
						class="max-h-48 overflow-auto rounded-md border border-default bg-elevated p-2 font-mono text-xs whitespace-pre-wrap break-words"
						v-html="previewHtml"
					/>
					<!-- Aviso de una línea: las secretas solo se resuelven al ejecutar. -->
					<i18n-t
						v-if="warnings.length > 0"
						keypath="dialogs.commands.test.preview.secrets"
						tag="span"
						scope="global"
						class="text-xs text-warning"
					>
						<template #marker>
							<span class="rounded-sm bg-warning/15 px-1 font-mono">{{ REDACTED_MARKER }}</span>
						</template>
					</i18n-t>
				</div>

				<RemoteOutput
					:last-exit-code="lastExitCode"
					:is-running="isLoading"
					:error-message="errorMessage"
					:output="output"
					:clear="clearOutput"
				/>
			</div>
		</template>
		<template #footer>
			<UButton
				:label="t('form.cancel')"
				:icon="ICONS.actions.cancel"
				color="neutral"
				variant="outline"
				@click="emits('close', false)"
			/>
		</template>
	</UModal>
</template>
