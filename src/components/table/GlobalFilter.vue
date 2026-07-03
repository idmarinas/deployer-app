<script lang="ts">
import { useI18n } from 'vue-i18n'
</script>

<script lang="ts" setup>
const globalFilter = defineModel<string>()
const { t } = useI18n()
</script>

<template>
	<UInput v-model="globalFilter" :placeholder="t('common.actions.filter')" :ui="{ trailing: 'pe-1' }">
		<template v-if="globalFilter?.length" #trailing>
			<UButton
				color="neutral"
				variant="link"
				icon="i-tabler-circle-x"
				aria-label="Clear input"
				@click="
					() => {
						globalFilter = ''
					}
				"
			/>
		</template>
	</UInput>
</template>
