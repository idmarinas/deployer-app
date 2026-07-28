<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { ConfirmDialogOptions } from '@/composables/useDialog'
import { ICONS } from '@/utils/icons'
import { computed } from 'vue'

const props = defineProps<ConfirmDialogOptions>()

const { t } = useI18n()

const confirmColor = computed(() => {
	if (props.type === 'cancel_delete') {
		return 'error'
	} else if (props.type === 'cancel_confirm') {
		return 'warning'
	}

	return 'primary'
})

const confirmIcon = computed(() => {
	if (props.type === 'cancel_delete') {
		return ICONS.actions.delete
	} else if (props.type === 'cancel_confirm') {
		return ICONS.actions.submit
	} else if (props.type === 'cancel_update') {
		return 'i-tabler-download'
	}

	return undefined
})

const emits = defineEmits<{
	close: [value: boolean]
}>()
</script>

<template>
	<UModal :title="title" :description="description" :dismissible="false" :ui="{ footer: 'justify-end' }">
		<template #footer>
			<UButton
				:label="t(`overlays.dialog.${type}.cancel`)"
				color="neutral"
				variant="outline"
				icon="i-tabler-cancel"
				@click="emits('close', false)"
			/>
			<UButton
				:label="t(`overlays.dialog.${type}.confirm`)"
				:color="confirmColor"
				:icon="confirmIcon"
				@click="emits('close', true)"
			/>
		</template>
	</UModal>
</template>
