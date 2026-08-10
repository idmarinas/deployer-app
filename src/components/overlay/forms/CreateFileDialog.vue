<script lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const props = defineProps<{
	folder: string
	error?: string
}>()

const emits = defineEmits<{
	close: [value: string | false]
}>()

const { t } = useI18n()

const fileName = ref<string>('')
</script>

<template>
	<UModal :title="t('form.docker_composes.files.create_file_title')" :ui="{ footer: 'justify-end' }">
		<template #body>
			<UFormField
				name="new_file_name"
				:label="
					folder
						? t('form.docker_composes.files.file_path_in_folder', { folder: folder }, { escapeParameter: false })
						: t('form.docker_composes.files.file_path')
				"
			>
				<UInput
					v-model="fileName"
					class="w-full font-mono"
					:placeholder="t('form.docker_composes.files.new_file_placeholder')"
					@keydown.enter="emits('close', fileName)"
				/>
			</UFormField>
			<p v-if="error" class="text-sm text-error mt-2">{{ error }}</p>
		</template>
		<template #footer>
			<UButton
				:label="t('form.docker_composes.files.cancel')"
				variant="outline"
				size="sm"
				@click="emits('close', false)"
			/>
			<UButton
				:label="t('form.docker_composes.files.confirm')"
				color="primary"
				size="sm"
				@click="emits('close', fileName)"
			/>
		</template>
	</UModal>
</template>
