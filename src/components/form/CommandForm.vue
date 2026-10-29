<script lang="ts">
import type { LineRule, OutputParser, RegexPattern } from '@/utils/commands/types'
import type { JSONContent } from '@tiptap/vue-3'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSchemaValidation } from '@/composables/useSchemaValidation'

type ParserType = OutputParser['type']
</script>

<script setup lang="ts">
const state = defineModel<{
	key: string
	name: string
	description: JSONContent
	command: string
	parser: OutputParser
	timeout: number
	enabled: boolean
}>({ required: true })

const props = withDefaults(
	defineProps<{
		isEdit?: boolean
	}>(),
	{
		isEdit: false,
	},
)

const { commands: schema } = useSchemaValidation()
const { t, n } = useI18n()

function createDefaultLineRule(): LineRule {
	return { match: '', key: '', transform: 'string' }
}

function createDefaultRegexPattern(): RegexPattern {
	return { pattern: '', flags: 'gm', groups: {} }
}

function tryMigrateParser(currentParser: OutputParser, newType: ParserType): OutputParser {
	if (newType === 'raw') {
		return { type: 'raw' }
	}
	if (newType === 'json') {
		return { type: 'json' }
	}

	if (newType === 'line-based') {
		if (currentParser.type === 'line-based') {
			if (currentParser.rules?.length) {
				return currentParser
			}
			return { type: 'line-based', rules: [createDefaultLineRule()] }
		}
		if (currentParser.type === 'regex' && currentParser.patterns?.length) {
			const rules: LineRule[] = currentParser.patterns.map(pattern => {
				const firstGroupKey = Object.keys(pattern.groups || {})[0] || ''
				return {
					match: pattern.pattern || '',
					key: firstGroupKey,
					transform: 'string',
				}
			})
			return { type: 'line-based', rules: rules.length ? rules : [createDefaultLineRule()] }
		}
		return { type: 'line-based', rules: [createDefaultLineRule()] }
	}

	if (newType === 'regex') {
		if (currentParser.type === 'regex') {
			if (currentParser.patterns?.length) {
				return currentParser
			}
			return { type: 'regex', patterns: [createDefaultRegexPattern()] }
		}
		if (currentParser.type === 'line-based' && currentParser.rules?.length) {
			const patterns: RegexPattern[] = currentParser.rules.map(rule => ({
				pattern: rule.match || '',
				flags: 'gm',
				groups: rule.key ? { [rule.key]: 1 } : {},
			}))
			return { type: 'regex', patterns: patterns.length ? patterns : [createDefaultRegexPattern()] }
		}
		return { type: 'regex', patterns: [createDefaultRegexPattern()] }
	}

	return { type: 'raw' }
}

const parserType = computed({
	get: () => state.value.parser?.type ?? 'raw',
	set: (type: ParserType) => {
		const currentParser = state.value.parser ?? { type: 'raw' }
		if (currentParser.type === type) {
			return
		}
		state.value.parser = tryMigrateParser(currentParser, type)
	},
})

function addLineRule() {
	if (state.value.parser?.type !== 'line-based') return
	if (!state.value.parser.rules) {
		state.value.parser = { ...state.value.parser, rules: [] }
	}
	state.value.parser.rules.push(createDefaultLineRule())
}

function removeLineRule(index: number) {
	if (state.value.parser?.type !== 'line-based') return
	if (!state.value.parser.rules) return
	state.value.parser.rules.splice(index, 1)
	if (state.value.parser.rules.length === 0) {
		state.value.parser.rules.push(createDefaultLineRule())
	}
}

function addRegexPattern() {
	if (state.value.parser?.type !== 'regex') return
	if (!state.value.parser.patterns) {
		state.value.parser = { ...state.value.parser, patterns: [] }
	}
	state.value.parser.patterns.push(createDefaultRegexPattern())
}

function removeRegexPattern(index: number) {
	if (state.value.parser?.type !== 'regex') return
	if (!state.value.parser.patterns) return
	state.value.parser.patterns.splice(index, 1)
	if (state.value.parser.patterns.length === 0) {
		state.value.parser.patterns.push(createDefaultRegexPattern())
	}
}

const regexFlagOptions = [
	{ label: 'g - Global', value: 'g' },
	{ label: 'i - Case insensitive', value: 'i' },
	{ label: 'm - Multiline', value: 'm' },
	{ label: 's - Dotall', value: 's' },
	{ label: 'u - Unicode', value: 'u' },
	{ label: 'y - Sticky', value: 'y' },
]

function getRegexFlagsArray(flags: string | undefined): string[] {
	if (!flags) return []
	const result: string[] = []
	for (const f of regexFlagOptions) {
		if (flags.includes(f.value)) {
			result.push(f.value)
		}
	}
	return result
}

function setRegexFlagsArray(pattern: RegexPattern, flags: string[]) {
	const ordered: string[] = []
	for (const f of regexFlagOptions) {
		if (flags.includes(f.value)) {
			ordered.push(f.value)
		}
	}
	pattern.flags = ordered.length ? ordered.join('') : undefined
}

function ensureRegexGroups(patternIndex: number) {
	if (state.value.parser?.type !== 'regex') return
	if (!state.value.parser.patterns?.[patternIndex]) return
	if (!state.value.parser.patterns[patternIndex].groups) {
		state.value.parser.patterns[patternIndex].groups = {}
	}
}

function addRegexGroup(patternIndex: number) {
	if (state.value.parser?.type !== 'regex') return
	if (!state.value.parser.patterns?.[patternIndex]) return
	ensureRegexGroups(patternIndex)
	const groups = state.value.parser.patterns[patternIndex].groups
	let baseKey = 'group'
	let counter = Object.keys(groups).length + 1
	while (groups[baseKey + counter]) {
		counter++
	}
	groups[baseKey + counter] = 1
}

function removeRegexGroupKey(patternIndex: number, key: string) {
	if (state.value.parser?.type !== 'regex') return
	if (!state.value.parser.patterns?.[patternIndex]) return
	if (!state.value.parser.patterns[patternIndex].groups) return
	delete state.value.parser.patterns[patternIndex].groups[key]
}

function renameRegexGroupKey(patternIndex: number, oldKey: string, newKey: string) {
	if (state.value.parser?.type !== 'regex') return
	if (!state.value.parser.patterns?.[patternIndex]) return
	ensureRegexGroups(patternIndex)
	const groups = state.value.parser.patterns[patternIndex].groups
	if (!newKey || newKey === oldKey) return
	if (groups[newKey]) return
	groups[newKey] = groups[oldKey]
	delete groups[oldKey]
}

function updateRegexGroupValue(patternIndex: number, key: string, value: number) {
	if (state.value.parser?.type !== 'regex') return
	if (!state.value.parser.patterns?.[patternIndex]) return
	ensureRegexGroups(patternIndex)
	if (value >= 1) {
		state.value.parser.patterns[patternIndex].groups[key] = value
	}
}

function extractRegexGroups(patternIndex: number) {
	if (state.value.parser?.type !== 'regex') return
	if (!state.value.parser.patterns?.[patternIndex]) return
	const pattern = state.value.parser.patterns[patternIndex]
	const regexStr = pattern.pattern || ''
	if (!regexStr) return

	ensureRegexGroups(patternIndex)
	const groups = pattern.groups
	const extracted: Array<{ key: string; index: number }> = []

	let i = 0
	let groupIndex = 0
	const len = regexStr.length
	while (i < len) {
		const ch = regexStr[i]
		if (ch === '\\') {
			i += 2
			continue
		}
		if (ch === '[') {
			i++
			while (i < len && regexStr[i] !== ']') {
				if (regexStr[i] === '\\') {
					i += 2
					continue
				}
				i++
			}
			i++
			continue
		}
		if (ch === '(') {
			if (regexStr[i + 1] === '?') {
				if (regexStr[i + 2] === '<' && regexStr[i + 3] !== '=') {
					// named group (?<name>...)
					const nameStart = i + 3
					let j = nameStart
					while (j < len && regexStr[j] !== '>') {
						j++
					}
					if (j > nameStart) {
						const name = regexStr.slice(nameStart, j)
						groupIndex++
						extracted.push({ key: name, index: groupIndex })
					} else {
						groupIndex++
					}
					i++
					continue
				}
				// non-capturing or lookaround
				i++
				continue
			}
			groupIndex++
			extracted.push({ key: `group${groupIndex}`, index: groupIndex })
			i++
			continue
		}
		i++
	}

	const existingKeys = new Set(Object.keys(groups))
	const existingValues = new Set(Object.values(groups))
	for (const ex of extracted) {
		if (!existingKeys.has(ex.key) && !existingValues.has(ex.index)) {
			groups[ex.key] = ex.index
			existingKeys.add(ex.key)
			existingValues.add(ex.index)
		}
	}
}

const transformOptions = computed(() => [
	{ label: t('form.commands.parser.transform.string'), value: 'string' },
	{ label: t('form.commands.parser.transform.number'), value: 'number' },
	{ label: t('form.commands.parser.transform.boolean'), value: 'boolean' },
])

const keyMaxLength = schema.select.shape.key.maxLength || 64
const nameMaxLength = schema.select.shape.name.maxLength || 120
</script>

<template>
	<UFormField name="name" :label="t('form.commands.name.label')" :help="t('form.commands.name.help')" required>
		<UInput
			v-model="state.name"
			autocomplete="off"
			class="w-full"
			:ui="{ trailing: 'pointer-events-none' }"
			:maxlength="nameMaxLength"
		>
			<template #trailing>
				<div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
					{{ n(state.name?.length ?? 0, 'n') }}/{{ n(nameMaxLength, 'n') }}
				</div>
			</template>
		</UInput>
	</UFormField>

	<UFormField name="key" :label="t('form.commands.key.label')" :help="t('form.commands.key.help')" required>
		<SlugifyInput v-model="state.key" :name="state.name" :max-length="keyMaxLength" :can-edit="!isEdit" />
		<p class="text-xs text-muted mt-1">{{ t('form.commands.key.hint') }}</p>
	</UFormField>

	<UFormField
		name="description"
		:label="t('form.commands.description.label')"
		:help="t('form.commands.description.help')"
		:hint="t('form.shared.hint.optional')"
	>
		<DescriptionEditor v-model="state.description" />
	</UFormField>

	<UFormField
		name="timeout"
		:label="t('form.commands.timeout.label')"
		:help="t('form.commands.timeout.help')"
		:hint="t('form.shared.hint.optional')"
	>
		<UInputNumber v-model="state.timeout" class="w-full" :min="1" :max="3600" :step="5" :disable-wheel-change="true" />
	</UFormField>

	<UFormField
		name="command"
		:label="t('form.commands.command.label')"
		:help="t('form.commands.command.help')"
		class="md:col-span-2"
		required
	>
		<CodeEditor v-model="state.command" :languages="['bash']" :placeholder="t('form.commands.command.placeholder')" />
	</UFormField>

	<UFormField
		name="parser"
		:label="t('form.commands.parser.label')"
		:help="t('form.commands.parser.help')"
		class="md:col-span-2"
	>
		<div class="w-full flex flex-col gap-2">
			<USelect
				v-model="parserType"
				value-key="id"
				:items="[
					{
						label: t('form.commands.parser.select.raw.label'),
						description: t('form.commands.parser.select.raw.description'),
						id: 'raw',
					},
					{
						label: t('form.commands.parser.select.json.label'),
						description: t('form.commands.parser.select.json.description'),
						id: 'json',
					},
					{
						label: t('form.commands.parser.select.line_based.label'),
						description: t('form.commands.parser.select.line_based.description'),
						id: 'line-based',
					},
					{
						label: t('form.commands.parser.select.regex.label'),
						description: t('form.commands.parser.select.regex.description'),
						id: 'regex',
					},
				]"
				:ui="{ itemDescription: 'whitespace-normal leading-snug' }"
				class="w-full"
			/>

			<div v-if="state.parser?.type === 'line-based'" class="flex flex-col gap-3 rounded-lg border border-default p-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium">{{ t('form.commands.parser.line_based.title') }}</p>
					<UButton size="xs" variant="soft" icon="i-tabler-plus" @click="addLineRule">
						{{ t('form.commands.parser.line_based.add_rule') }}
					</UButton>
				</div>

				<div
					v-for="(rule, index) in state.parser.rules"
					:key="index"
					class="flex flex-col gap-2 rounded-md border border-default/70 p-2"
				>
					<div class="flex items-center justify-between">
						<p class="text-xs text-muted">{{ t('form.commands.parser.rule') }} #{{ index + 1 }}</p>
						<UButton
							size="xs"
							variant="ghost"
							color="error"
							icon="i-tabler-trash"
							:disabled="(state.parser.rules?.length || 0) <= 1"
							@click="removeLineRule(index)"
						>
							{{ t('form.commands.parser.remove') }}
						</UButton>
					</div>

					<div class="grid grid-cols-1 gap-2 md:grid-cols-12">
						<UFormField :label="t('form.commands.parser.line_based.match')" class="md:col-span-6">
							<UInput
								v-model="rule.match"
								class="w-full font-mono"
								:placeholder="t('form.commands.parser.line_based.match_placeholder')"
							/>
						</UFormField>
						<UFormField :label="t('form.commands.parser.line_based.key')" class="md:col-span-4">
							<UInput
								v-model="rule.key"
								class="w-full"
								:placeholder="t('form.commands.parser.line_based.key_placeholder')"
							/>
						</UFormField>
						<UFormField :label="t('form.commands.parser.line_based.transform')" class="md:col-span-2">
							<USelect v-model="rule.transform" :items="transformOptions" value-key="value" class="w-full" />
						</UFormField>
					</div>
				</div>
			</div>

			<div v-if="state.parser?.type === 'regex'" class="flex flex-col gap-3 rounded-lg border border-default p-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium">{{ t('form.commands.parser.regex.title') }}</p>
					<UButton size="xs" variant="soft" icon="i-tabler-plus" @click="addRegexPattern">
						{{ t('form.commands.parser.regex.add_pattern') }}
					</UButton>
				</div>

				<div
					v-for="(pattern, patternIndex) in state.parser.patterns"
					:key="patternIndex"
					class="flex flex-col gap-2 rounded-md border border-default/70 p-2"
				>
					<div class="flex items-center justify-between">
						<p class="text-xs text-muted">{{ t('form.commands.parser.pattern') }} #{{ patternIndex + 1 }}</p>
						<UButton
							size="xs"
							variant="ghost"
							color="error"
							icon="i-tabler-trash"
							:disabled="(state.parser.patterns?.length || 0) <= 1"
							@click="removeRegexPattern(patternIndex)"
						>
							{{ t('form.commands.parser.remove') }}
						</UButton>
					</div>

					<div class="flex flex-col gap-2">
						<UFormField :label="t('form.commands.parser.regex.pattern')">
							<div class="flex items-stretch w-full">
								<span
									class="flex items-center px-2 text-muted font-mono select-none border border-default border-r-0 rounded-l-md bg-elevated/50"
									>/</span
								>
								<UInput
									v-model="pattern.pattern"
									class="flex-1 min-w-0 font-mono"
									:placeholder="t('form.commands.parser.regex.pattern_placeholder')"
									:ui="{ base: 'rounded-none', trailing: 'pr-0' }"
								/>
								<div class="flex items-center border border-default border-l-0 rounded-r-md bg-elevated/50">
									<span class="flex items-center pl-1 pr-0.5 text-muted font-mono select-none">/</span>
									<USelect
										:model-value="getRegexFlagsArray(pattern.flags)"
										@update:model-value="
											val => setRegexFlagsArray(pattern, Array.isArray(val) ? val : val ? [val] : [])
										"
										:items="regexFlagOptions"
										value-key="value"
										multiple
										:ui="{
											content: 'min-w-fit',
											base: 'border-0 shadow-none bg-transparent font-mono px-1 py-0 h-8',
											trailing: 'pr-1',
										}"
										class="w-auto"
									>
										<template #default>
											<span class="font-mono text-sm">{{ pattern.flags || '' }}</span>
										</template>
									</USelect>
								</div>
							</div>
						</UFormField>
					</div>

					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<p class="text-xs font-medium">{{ t('form.commands.parser.regex.groups_title') }}</p>
							<div class="flex items-center gap-1">
								<UButton size="xs" variant="ghost" icon="i-tabler-wand" @click="extractRegexGroups(patternIndex)">
									{{ t('form.commands.parser.regex.extract_groups') }}
								</UButton>
								<UButton size="xs" variant="ghost" icon="i-tabler-plus" @click="addRegexGroup(patternIndex)">
									{{ t('form.commands.parser.regex.add_group') }}
								</UButton>
							</div>
						</div>
						<p class="text-xs text-muted">{{ t('form.commands.parser.regex.groups_help') }}</p>

						<div
							v-for="([groupKey, groupValue], groupIndex) in Object.entries(pattern.groups || {}).sort(
								(a, b) => Number(a[1]) - Number(b[1]),
							)"
							:key="groupKey + '-' + groupIndex"
							class="grid grid-cols-1 items-end gap-2 md:grid-cols-12"
						>
							<UFormField :label="t('form.commands.parser.regex.group_key')" class="md:col-span-6">
								<UInput
									:model-value="groupKey as string"
									@update:model-value="val => renameRegexGroupKey(patternIndex, groupKey as string, val as string)"
									class="w-full"
								/>
							</UFormField>
							<UFormField :label="t('form.commands.parser.regex.group_index')" class="md:col-span-4">
								<UInputNumber
									:model-value="Number(groupValue)"
									@update:model-value="val => updateRegexGroupValue(patternIndex, groupKey as string, Number(val))"
									class="w-full"
									:min="1"
									:step="1"
								/>
							</UFormField>
							<div class="md:col-span-2">
								<UButton
									size="xs"
									variant="ghost"
									color="error"
									icon="i-tabler-trash"
									@click="removeRegexGroupKey(patternIndex, groupKey as string)"
								>
									{{ t('form.commands.parser.remove') }}
								</UButton>
							</div>
						</div>
						<p v-if="!pattern.groups || Object.keys(pattern.groups).length === 0" class="text-xs text-muted">
							{{ t('form.commands.parser.regex.groups_empty') }}
						</p>
					</div>
				</div>
			</div>
		</div>
	</UFormField>
</template>
