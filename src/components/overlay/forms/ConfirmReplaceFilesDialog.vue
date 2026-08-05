<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

defineProps<{
	files: string[]
	includesCompose: boolean
}>()

const emits = defineEmits<{
	close: [value: boolean]
}>()

const { t } = useI18n()
</script>

<template>
	<UModal
		:title="t('overlays.dialog.files_replace.title')"
		:description="t('overlays.dialog.files_replace.description')"
		:ui="{ footer: 'justify-end' }"
		:close="false"
		:dismissible="false"
	>
		<template #body>
			<ul v-if="files.length > 0" class="flex flex-col gap-1 list-disc pl-5">
				<li v-for="path of files" :key="path" class="text-sm font-mono text-muted">{{ path }}</li>
			</ul>
			<p v-if="includesCompose" class="text-sm text-warning mt-3">
				{{ t('overlays.dialog.files_replace.compose_note') }}
			</p>
		</template>
		<template #footer>
			<UButton
				:label="t('overlays.dialog.files_replace.cancel')"
				color="neutral"
				variant="outline"
				icon="i-tabler-cancel"
				@click="emits('close', false)"
			/>
			<UButton
				:label="t('overlays.dialog.files_replace.confirm')"
				color="primary"
				icon="i-tabler-upload"
				@click="emits('close', true)"
			/>
		</template>
	</UModal>
</template>
