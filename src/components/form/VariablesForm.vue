<script lang="ts">
import type { JSONContent } from '@tiptap/vue-3'

import { useI18n } from 'vue-i18n'

import { useSchemaValidation } from '@/composables/useSchemaValidation'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
const state = defineModel<{
	name: string
	slug: string
	description: JSONContent
	value: string
	enabled: boolean
	is_secret: boolean
}>({ required: true })

const props = withDefaults(
	defineProps<{
		isEdit?: boolean
		isSecret?: boolean
	}>(),
	{
		isEdit: false,
		isSecret: false,
	},
)

const { t } = useI18n()
const { variables: schema } = useSchemaValidation()

const slugMaxLength = schema.insert.shape.slug.maxLength || 120
</script>

<template>
	<UFormField name="name" :label="t('form.variables.name.label')" :help="t('form.variables.name.help')" required>
		<UInput
			v-model="state.name"
			autocomplete="off"
			class="w-full font-mono"
			:ui="{ trailing: 'pointer-events-none' }"
			:maxlength="schema.insert.shape.name.maxLength || 0"
		>
			<template #trailing>
				<div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
					{{ state.name?.length ?? 0 }}/{{ schema.insert.shape.name.maxLength || 0 }}
				</div>
			</template>
		</UInput>
	</UFormField>

	<UFormField name="slug" :label="t('form.variables.slug.label')" :help="t('form.variables.slug.help')" required>
		<SlugifyInput v-model="state.slug" :maxLength="slugMaxLength" :name="state.name" :can-edit="!isEdit" />
	</UFormField>

	<UFormField
		name="description"
		:label="t('form.variables.description.label')"
		:help="t('form.variables.description.help')"
		:hint="t('form.shared.hint.optional')"
		class="md:col-span-2"
	>
		<DescriptionEditor v-model="state.description" />
	</UFormField>

	<div class="col-span-2 flex gap-6">
		<UFormField
			name="value"
			:label="t('form.variables.value.label')"
			:help="t('form.variables.value.help')"
			:required="state.enabled || state.is_secret"
			class="w-full"
		>
			<UFieldGroup class="w-full">
				<UInput :type="state.is_secret ? 'password' : 'text'" v-model="state.value" autocomplete="off" class="w-full" />
				<UTooltip :text="t('form.variables.is_secret.label')">
					<UButton
						:icon="state.is_secret ? ICONS.misc.lock : ICONS.misc.lockOpen"
						:disabled="props.isSecret"
						@click="state.is_secret = !state.is_secret"
					/>
				</UTooltip>
			</UFieldGroup>
		</UFormField>
	</div>
</template>
