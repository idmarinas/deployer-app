<script lang="ts">
import { useI18n } from 'vue-i18n'

import { useProjectSchema } from '@/composables/schemas/projects'

import { open } from '@tauri-apps/plugin-dialog'
</script>

<script setup lang="ts">
const state = defineModel<{
	name: string
	description?: string
	git_url: string
	framework: string
	local_working_dir: string
	remote_working_dir: string
}>({ required: true })

const { t } = useI18n()

const { projectSchema: schema } = useProjectSchema()
</script>

<template>
	<UFormField
		name="name"
		:label="t('form.projects.name.label')"
		:help="t('form.projects.name.help')"
		required
	>
		<UInput
			v-model="state.name"
			autocomplete="off"
			class="w-full"
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
		name="description"
		:label="t('form.projects.description.label')"
		:help="t('form.projects.description.help')"
		:hint="t('form.shared.hint.optional')"
	>
		<UTextarea
			v-model="state.description"
			class="w-full"
			:ui="{ trailing: 'pointer-events-none' }"
			:maxlength="schema.shape.description.def.innerType.maxLength || undefined"
		>
			<template #trailing>
				<div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
					{{ state.description?.length ?? 0 }}/{{ schema.shape.description.def.innerType.maxLength || 0 }}
				</div>
			</template>
		</UTextarea>
	</UFormField>

	<UFormField
		name="git_url"
		:label="t('form.projects.git_url.label')"
		:description="t('form.projects.git_url.description')"
		:help="t('form.projects.git_url.help')"
		required
	>
		<UInput type="url" v-model="state.git_url" class="w-full" autocomplete="off" />
	</UFormField>
	<UFormField
		name="framework"
		:label="t('form.projects.framework.label')"
		:help="t('form.projects.framework.help')"
		required
	>
		<USelect
			v-model="state.framework"
			:items="[
				{
					label: t('form.projects.framework.select.symfony.label'),
					description: t('form.projects.framework.select.symfony.description'),
					value: 'symfony',
				},
				{
					label: t('form.projects.framework.select.laravel.label'),
					description: t('form.projects.framework.select.laravel.description'),
					value: 'laravel',
				},
				{
					label: t('form.projects.framework.select.nextjs.label'),
					description: t('form.projects.framework.select.nextjs.description'),
					value: 'nextjs',
				},
				{
					label: t('form.projects.framework.select.generic.label'),
					description: t('form.projects.framework.select.generic.description'),
					value: 'generic',
				},
			]"
			value-key="value"
			class="w-full"
		/>
	</UFormField>

	<UFormField
		name="local_working_dir"
		:label="t('form.projects.local_working_dir.label')"
		:help="t('form.projects.local_working_dir.help')"
		required
	>
		<UFieldGroup class="w-full">
			<UInput v-model="state.local_working_dir" class="w-full" autocomplete="off" />
			<UButton
				icon="i-tabler-folder"
				@click="
					async () => {
						state.local_working_dir = (await open({ multiple: false, directory: true })) || ''
					}
				"
			/>
		</UFieldGroup>
	</UFormField>

	<UFormField
		name="remote_working_dir"
		:label="t('form.projects.remote_working_dir.label')"
		:help="t('form.projects.remote_working_dir.help')"
		required
	>
		<UInput v-model="state.remote_working_dir" class="w-full" autocomplete="off" />
	</UFormField>
</template>
