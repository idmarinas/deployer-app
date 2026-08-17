<script setup lang="ts">
import type { SchemaNode } from 'json-schema-library'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { ICONS } from '@/utils/icons'
import { classifyNode, isContainerNode, resolveNode } from '@/utils/schema-form/jsl'
import { useSchemaToFormContext } from './context'

const OBJECT_COLLAPSE_THRESHOLD = 10

const props = withDefaults(
	defineProps<{
		node: SchemaNode
		path: string
		icon?: (name: string, node: SchemaNode) => string | undefined
	}>(),
	{ icon: undefined },
)

const { t } = useI18n()
const form = useSchemaToFormContext()

const children = computed(() => {
	const propsMap = props.node.properties ?? {}
	return Object.entries(propsMap).map(([name, childNode]) => ({
		name,
		node: childNode,
		required: (props.node.required ?? []).includes(name),
	}))
})

const simpleChildren = computed(() => children.value.filter(c => !isContainerNode(c.node)))
const containerChildren = computed(() => children.value.filter(c => isContainerNode(c.node)))

const requiredNames = computed(() => new Set(props.node.required ?? []))
const simpleRequired = computed(() => simpleChildren.value.filter(c => requiredNames.value.has(c.name)))
const simpleOptional = computed(() => simpleChildren.value.filter(c => !requiredNames.value.has(c.name)))

const collapseOptional = computed(() => simpleOptional.value.length > OBJECT_COLLAPSE_THRESHOLD)

function childPath(name: string): string {
	return props.path ? `${props.path}.${name}` : name
}

function kindOf(node: SchemaNode) {
	return classifyNode(resolveNode(node)).kind
}

function tabIcon(name: string, node: SchemaNode): string {
	const custom = props.icon?.(name, node)
	if (custom) return custom
	const icon = ICONS.schemaForm[kindOf(node) as keyof typeof ICONS.schemaForm]
	return icon ?? 'i-tabler-file'
}

function labelOf(name: string, node: SchemaNode): string {
	const schema = resolveNode(node).schema as Record<string, unknown>
	return (
		form.resolveTitle(childPath(name), schema) ??
		(typeof schema.title === 'string' ? schema.title : undefined) ??
		pretty(name)
	)
}

function pretty(raw: string): string {
	const out = raw.replace(/[_]+/g, ' ').trim()
	return out ? out.charAt(0).toUpperCase() + out.slice(1) : out
}

const tabs = computed(() =>
	containerChildren.value.map(c => ({
		...c,
		path: childPath(c.name),
		label: labelOf(c.name, c.node),
		icon: tabIcon(c.name, c.node),
	})),
)

const active = ref(0)

watch(
	() => tabs.value.map(tb => tb.name).join('\u0000'),
	() => {
		active.value = 0
	},
)

function tabHasError(tabPath: string): boolean {
	return Object.keys(form.errors.value ?? {}).some(
		p => p === tabPath || p.startsWith(`${tabPath}.`) || p.startsWith(`${tabPath}[`),
	)
}

function tabHasWarning(tabPath: string): boolean {
	return Object.keys(form.warnings.value ?? {}).some(
		p => p === tabPath || p.startsWith(`${tabPath}.`) || p.startsWith(`${tabPath}[`),
	)
}
</script>

<template>
	<div class="flex flex-col gap-3">
		<div v-if="simpleRequired.length || simpleOptional.length" class="flex flex-col gap-1">
			<div v-if="simpleRequired.length" class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
				<SchemaField
					v-for="child in simpleRequired"
					:key="child.name"
					:node="child.node"
					:path="childPath(child.name)"
					required
				/>
			</div>
			<UCollapsible v-if="collapseOptional">
				<UButton block color="neutral" variant="ghost" :label="t('form.schema_form.show_fields')" />
				<template #content>
					<div class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
						<SchemaField
							v-for="child in simpleOptional"
							:key="child.name"
							:node="child.node"
							:path="childPath(child.name)"
						/>
					</div>
				</template>
			</UCollapsible>
			<div v-else class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
				<SchemaField
					v-for="child in simpleOptional"
					:key="child.name"
					:node="child.node"
					:path="childPath(child.name)"
				/>
			</div>
		</div>

		<div v-if="tabs.length > 0" class="flex flex-col gap-2">
			<div class="flex flex-wrap gap-1">
				<UButton
					v-for="(tab, index) in tabs"
					:key="tab.name"
					size="sm"
					:variant="index === active ? 'solid' : 'ghost'"
					color="neutral"
					@click="active = index"
				>
					<UIcon :name="tab.icon" />
					<span class="truncate">{{ tab.label }}</span>
					<span v-if="tabHasError(tab.path)" class="h-1.5 w-1.5 shrink-0 rounded-full bg-error" />
					<span v-else-if="tabHasWarning(tab.path)" class="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
				</UButton>
			</div>
			<div v-if="tabs[active]">
				<SchemaField :node="tabs[active].node" :path="tabs[active].path" :required="tabs[active].required" />
			</div>
		</div>
	</div>
</template>
