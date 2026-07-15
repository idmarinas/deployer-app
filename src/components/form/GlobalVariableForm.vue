<script lang="ts">
import { useI18n } from 'vue-i18n'

import { useGlobalVariableSchema } from '@/composables/schemas/global_variables'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
const state = defineModel<{
	name: string
	slug: string
	value: string
	is_secret: boolean
	data_type: 'string' | 'integer' | 'boolean' | 'json'
	description?: string
}>({ required: true })

const { t } = useI18n()
const { globalVariableSchema: schema } = useGlobalVariableSchema()
</script>

<template>
	<UFormField
		name="name"
		:label="t('form.global_variables.name.label')"
		:help="t('form.global_variables.name.help')"
		required
	>
		<UInput
			v-model="state.name"
			autocomplete="off"
			class="w-full font-mono"
			:ui="{ trailing: 'pointer-events-none' }"
			:maxlength="schema.shape.name.maxLength || undefined"
		>
			<template #trailing>
				<div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
					{{ state.name?.length ?? 0 }}/{{ schema.shape.name.maxLength || 0 }}
				</div>
			</template>
		</UInput>
	</UFormField>

	<UFormField
		name="slug"
		:label="t('form.global_variables.slug.label')"
		:help="t('form.global_variables.slug.help')"
		required
	>
		<SlugifyInput v-model="state.slug" :maxLength="schema.shape.slug.maxLength || 0" :name="state.name" />
	</UFormField>

	<UFormField
		name="description"
		:label="t('form.global_variables.description.label')"
		:help="t('form.global_variables.description.help')"
		:hint="t('form.shared.hint.optional')"
		class="md:col-span-2"
	>
		<DescriptionEditor v-model="state.description" />
	</UFormField>

	<div class="col-span-2 flex gap-6">
		<UFormField
			name="value"
			:label="t('form.global_variables.value.label')"
			:help="t('form.global_variables.value.help')"
			required
			class="w-full"
		>
			<UFieldGroup class="w-full">
				<UInput :type="state.is_secret ? 'password' : 'text'" v-model="state.value" autocomplete="off" class="w-full" />
				<UTooltip :text="t('form.global_variables.is_secret.label')">
					<UButton
						:icon="state.is_secret ? ICONS.misc.lock : ICONS.misc.lockOpen"
						@click="
							() => {
								state.is_secret = !state.is_secret
							}
						"
					/>
				</UTooltip>
			</UFieldGroup>
		</UFormField>

		<UFormField
			name="data_type"
			:label="t('form.global_variables.data_type.label')"
			:help="t('form.global_variables.data_type.help')"
			class="w-1/4"
		>
			<USelect v-model="state.data_type" :items="['string', 'integer', 'boolean', 'json']" />
		</UFormField>
	</div>
</template>
