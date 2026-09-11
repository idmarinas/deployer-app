<script lang="ts">
import { useI18n } from 'vue-i18n'

import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
const props = defineProps<{
	lastExitCode: number | null
	isRunning: boolean
	errorMessage: string
	output: string
	clear: () => void
}>()

const { t } = useI18n()
</script>

<template>
	<!-- Salida -->
	<section class="flex flex-col gap-2">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<h3 class="text-sm font-semibold text-muted uppercase tracking-wider">
					{{ t('components.console.console.title') }}
				</h3>
				<UBadge
					v-if="isRunning"
					color="info"
					variant="subtle"
					:icon="ICONS.status.loading"
					:label="t('components.console.console.running')"
				/>
				<UBadge
					v-else-if="lastExitCode !== null"
					:color="lastExitCode === 0 ? 'success' : 'error'"
					variant="subtle"
					:icon="lastExitCode === 0 ? ICONS.status.circleCheck : ICONS.status.circleX"
					:label="t('components.console.console.exit_code', { code: lastExitCode })"
				/>
			</div>
			<div class="flex items-center gap-2">
				<UButton
					v-if="output"
					:icon="ICONS.actions.reset"
					:label="t('components.console.console.clear')"
					variant="ghost"
					color="neutral"
					size="xs"
					@click="clear"
				/>
			</div>
		</div>

		<UCard :ui="{ root: 'bg-neutral-950 text-green-400' }">
			<pre v-if="output || errorMessage" class="font-mono text-xs whitespace-pre-wrap overflow-auto max-h-96">{{
				errorMessage ? `${output}${errorMessage}\n` : output
			}}</pre>
			<p v-else class="font-mono text-xs text-muted">{{ t('components.console.console.placeholder') }}</p>
		</UCard>
	</section>
</template>
