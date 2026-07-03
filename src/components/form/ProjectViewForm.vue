<script lang="ts">
import { useI18n } from 'vue-i18n'

import { useProjectSchema } from '@/composables/schemas/projects'
</script>

<script setup lang="ts">
const state = defineModel<{
	id: number
	name: string
	description?: string | null
	git_url?: string | null
	framework: string
	local_working_dir?: string | null
	remote_working_dir?: string | null
}>({ required: true })

const { t } = useI18n()

const { projectSchema: schema } = useProjectSchema(state.value.id)
</script>

<template>
	<ViewInputField
		v-model="state.name"
		name="name"
		:label="t('form.projects.name.label')"
		:help="t('form.projects.name.help')"
		class="md:col-span-2"
		required
		:maxlength="schema.shape.name.maxLength || undefined"
		command="crud_update_project"
		:id="state.id"
		:invalidate-key="['projects']"
	/>

	<ViewInputField
		v-model="state.description"
		name="description"
		as="textarea"
		class="md:col-span-2"
		:label="t('form.projects.description.label')"
		:help="t('form.projects.description.help')"
		:hint="t('form.shared.hint.optional')"
		:maxlength="schema.shape.description.def.innerType.maxLength || undefined"
		command="crud_update_project"
		:id="state.id"
		:invalidate-key="['projects']"
	/>

	<ViewInputField
		v-model="state.git_url"
		name="git_url"
		as="url"
		:label="t('form.projects.git_url.label')"
		:help="t('form.projects.git_url.help')"
		required
		command="crud_update_project"
		:id="state.id"
		:invalidate-key="['projects']"
	/>

	<ViewInputField
		v-model="state.framework"
		name="framework"
		as="select_framework"
		:label="t('form.projects.framework.label')"
		:help="t('form.projects.framework.help')"
		required
		command="crud_update_project"
		:id="state.id"
		:invalidate-key="['projects']"
	/>

	<ViewInputField
		v-model="state.local_working_dir"
		name="local_working_dir"
		as="directory"
		:label="t('form.projects.local_working_dir.label')"
		:help="t('form.projects.local_working_dir.help')"
		required
		command="crud_update_project"
		:id="state.id"
		:invalidate-key="['projects']"
	/>

	<ViewInputField
		v-model="state.remote_working_dir"
		name="remote_working_dir"
		:label="t('form.projects.remote_working_dir.label')"
		:help="t('form.projects.remote_working_dir.help')"
		required
		command="crud_update_project"
		:id="state.id"
		:invalidate-key="['projects']"
	/>
</template>
