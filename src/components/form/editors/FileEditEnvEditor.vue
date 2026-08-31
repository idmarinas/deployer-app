<script lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const model = defineModel<string | null>({ required: true })

const { t } = useI18n()

const envEntries = computed({
	get() {
		if (!model.value) return []
		return model.value
			.split('\n')
			.filter(line => line.trim() && !line.startsWith('#'))
			.map(line => {
				const idx = line.indexOf('=')
				if (idx === -1) return { key: line.trim(), value: '' }
				return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() }
			})
	},
	set(entries: Array<{ key: string; value: string }>) {
		model.value = entries
			.filter(e => e.key.trim())
			.map(e => `${e.key}=${e.value}`)
			.join('\n')
	},
})

function add() {
	envEntries.value = [...envEntries.value, { key: '', value: '' }]
}

function remove(index: number) {
	envEntries.value = envEntries.value.filter((_, i) => i !== index)
}

function updateKey(index: number, value: string) {
	const entries = [...envEntries.value]
	entries[index] = { ...entries[index], key: value }
	envEntries.value = entries
}

function updateValue(index: number, value: string) {
	const entries = [...envEntries.value]
	entries[index] = { ...entries[index], value }
	envEntries.value = entries
}
</script>

<template>
	<div class="flex flex-col gap-2">
		<div v-for="(entry, index) in envEntries" :key="index" class="flex items-center gap-2">
			<UInput
				:model-value="entry.key"
				class="w-1/3 font-mono"
				placeholder="KEY"
				@update:model-value="(v: string) => updateKey(index, v)"
			/>
			<span class="text-muted text-xs">=</span>
			<UInput
				:model-value="entry.value"
				class="flex-1 font-mono"
				placeholder="value"
				@update:model-value="(v: string) => updateValue(index, v)"
			/>
			<UButton icon="i-tabler-trash" color="error" variant="ghost" size="xs" @click="remove(index)" />
		</div>
		<UButton
			icon="i-tabler-plus"
			variant="outline"
			size="xs"
			:label="t('form.projects.docker.compose.files.env_add')"
			@click="add"
		/>
	</div>
</template>
