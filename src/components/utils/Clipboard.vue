<script lang="ts">
import { ICONS } from '@/utils/icons'
import { useClipboard } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		source: string
		onlyIcon?: boolean
	}>(),
	{
		onlyIcon: false,
	},
)

const { t } = useI18n()
const { copy, copied, isSupported } = useClipboard()

const label = computed(() => {
	if (props.onlyIcon) return

	return copied.value ? t('common.status.copied') : t('common.actions.copy')
})
const open = computed(() => {
	if (!props.onlyIcon) return false

	return copied.value
})
</script>

<template>
	<UTooltip :text="t('common.status.copied')" v-model:open="open" disable-hoverable-content>
		<UButton
			v-if="isSupported"
			@click.prevent="copy(source)"
			:icon="ICONS.actions.copy"
			variant="soft"
			:color="copied ? 'success' : 'primary'"
			:label="label"
		/>
	</UTooltip>
</template>
