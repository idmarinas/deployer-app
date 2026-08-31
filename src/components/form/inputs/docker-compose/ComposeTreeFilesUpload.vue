<script lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { isMainComposeFile } from '@/lib/docker-compose/files'
import { isComposeFile, isEnvFile, isImageEntry, type ManagedFile } from '@/lib/files'
import FileEditComposeEditor from '../../editors/FileEditComposeEditor.vue'
import FileEditEnvEditor from '../../editors/FileEditEnvEditor.vue'
import FileContentEditor from '../../files/FileContentEditor.vue'
import TreeFiles from '../../files/TreeFiles.vue'
import ComposeMissingAlert from './ComposeMissingAlert.vue'
</script>

<script setup lang="ts">
const model = defineModel<ManagedFile[]>({ required: true })

const props = withDefaults(
	defineProps<{
		class?: string
		canUpload?: boolean
		canEdit?: boolean
		canCreateFile?: boolean
	}>(),
	{
		class: '',
		canUpload: false,
		canEdit: false,
		canCreateFile: false,
	},
)

const { t } = useI18n()

const hasMainCompose = computed(() => model.value.some(f => isMainComposeFile(f.file_path)))

function createMainComposeFile() {
	if (hasMainCompose.value) return
	model.value = [
		...model.value,
		{
			file_path: 'compose.yaml',
			name: 'compose.yaml',
			content: '',
			is_binary: false,
			mime_type: 'application/yaml',
			size: 0,
		},
	]
}

function isProtectedFile(entry: ManagedFile): boolean {
	return isMainComposeFile(entry.file_path)
}

function onBeforeCreate(path: string): string | undefined {
	if (isMainComposeFile(path)) return t('form.projects.docker.compose.files.create.compose_already_exists')
}
</script>

<template>
	<TreeFiles
		v-model="model"
		:class="props.class"
		:can-upload="props.canUpload"
		:can-edit="props.canEdit"
		:can-create-file="canCreateFile"
		:is-protected-file="isProtectedFile"
		:on-before-create="onBeforeCreate"
	>
		<template #actions>
			<UTooltip v-if="canCreateFile && !hasMainCompose" :text="t('form.projects.docker.compose.files.create_compose')">
				<UButton icon="i-tabler-brand-docker" variant="ghost" size="xs" @click.stop="createMainComposeFile" />
			</UTooltip>
		</template>

		<template #tree-badges="{ item }">
			<UBadge
				v-if="item.type === 'file' && isComposeFile(item.label ?? '')"
				size="xs"
				variant="subtle"
				:color="isMainComposeFile(item.key) ? 'primary' : 'info'"
				:label="
					isMainComposeFile(item.key)
						? t('form.projects.docker.compose.files.principal')
						: t('form.projects.docker.compose.files.secondary')
				"
			/>
		</template>

		<template #badges="{ entry }">
			<template v-if="isComposeFile(entry.name)">
				<UBadge
					:color="isMainComposeFile(entry.file_path) ? 'primary' : 'info'"
					variant="subtle"
					:label="t('form.projects.docker.compose.files.compose_label')"
				/>
				<UBadge
					color="neutral"
					variant="subtle"
					:label="
						isMainComposeFile(entry.file_path)
							? t('form.projects.docker.compose.files.principal')
							: t('form.projects.docker.compose.files.secondary')
					"
				/>
			</template>
			<UBadge v-else-if="isImageEntry(entry)" color="info" variant="subtle" :label="t('form.files.image_label')" />
			<UBadge v-else-if="entry.is_binary" color="warning" variant="subtle" :label="t('form.files.binary')" />
			<UBadge
				v-else-if="isEnvFile(entry.name)"
				color="info"
				variant="subtle"
				:label="t('form.projects.docker.compose.files.env_label')"
			/>
		</template>

		<template #editor="{ entry, content, updateContent }">
			<ComposeMissingAlert v-if="canCreateFile && !hasMainCompose" />
			<FileEditComposeEditor
				v-if="isComposeFile(entry.name)"
				:model-value="content"
				@update:model-value="updateContent"
			/>
			<FileEditEnvEditor v-else-if="isEnvFile(entry.name)" :model-value="content" @update:model-value="updateContent" />
			<FileContentEditor v-else :entry="entry" :model-value="content" @update:model-value="updateContent" />
		</template>

		<template #empty="{ hint }">
			<ComposeMissingAlert v-if="canCreateFile && !hasMainCompose" />
			<p v-else class="text-sm text-muted">{{ hint }}</p>
		</template>
	</TreeFiles>
</template>
