<script lang="ts">
import slugify from 'slugify'
import { onMounted, ref, watch } from 'vue'
</script>

<script setup lang="ts">
const state = defineModel<string>()

const props = withDefaults(
	defineProps<{
		maxLength: number
		name: string
		canEdit?: boolean
	}>(),
	{
		canEdit: true,
	},
)

const generateSlug = () =>
	slugify(props.name || '', {
		replacement: '_',
		lower: true,
		trim: true,
		strict: true,
	})

const readonly = ref(true)
const slug = ref(false)
const customized = ref(false)

onMounted(() => {
	if (state.value && state.value.length > 0) {
		slug.value = true
	}
})

watch(
	() => props.name,
	() => {
		if (!slug.value && !customized.value && props.canEdit) {
			state.value = generateSlug()
		}
	},
)
</script>

<template>
	<UFieldGroup class="w-full">
		<UInput
			v-model="state"
			autocomplete="off"
			class="w-full"
			:maxlength="maxLength"
			:readonly="readonly"
			@update:model-value="() => (customized = true)"
		>
			<template #trailing>
				<div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
					{{ state?.length ?? 0 }}/{{ maxLength }}
				</div>
			</template>
		</UInput>
		<UButton
			:icon="readonly ? 'i-tabler-pencil-off' : 'i-tabler-pencil'"
			:variant="readonly ? 'solid' : 'subtle'"
			:disabled="!canEdit"
			@click="() => (readonly = !readonly)"
		/>
	</UFieldGroup>
</template>
