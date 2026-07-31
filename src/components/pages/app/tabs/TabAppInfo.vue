<script lang="ts">
import logoSrc from '@/assets/logos/deployerapp.png'
import { useDeployerAppInfo } from '@/loaders/deployerApp'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const { t } = useI18n()

const { data: componentData, isLoading, status } = useDeployerAppInfo()
</script>

<template>
	<!-- Información de la aplicación -->
	<UCard
		v-if="!isLoading && status === 'success'"
		:ui="{ title: 'flex flex-col gap-3', body: 'flex items-center gap-5' }"
	>
		<template #title>
			<div class="flex items-center justify-between">
				<span>{{ componentData.name }}</span>
				<UBadge variant="subtle" color="primary">{{ componentData.version }}</UBadge>
			</div>
			<div class="flex items-center gap-5 font-normal text-dimmed">
				<UBadge variant="subtle" color="neutral" class="lowercase">{{ componentData.identifier }}</UBadge>
				<div class="flex items-center justify-between grow">
					<div class="flex items-center gap-3">
						{{ t('pages.app.settings.sections.information.publisher') }}
						<UBadge variant="subtle" color="secondary">{{ componentData.publisher }}</UBadge>
					</div>
					<span>{{ componentData.copyright }}</span>
				</div>
			</div>
		</template>
		<template #default>
			<img :src="logoSrc" class="max-w-sm" />

			<div class="flex flex-col items-center gap-5 grow">
				<div class="text-2xl text-highlighted">Backend</div>
				<div class="flex flex-col items-center gap-2 divide-y w-full">
					<div class="flex items-center justify-between pt-1 pb-3 w-full">
						<span class="text-dimmed">{{ t('pages.app.settings.sections.information.tauri_version') }}</span>
						<UBadge variant="subtle" color="neutral">
							{{ componentData.tauri_version }}
						</UBadge>
					</div>

					<div class="flex items-center justify-between pt-1 pb-3 w-full">
						<span class="text-dimmed">{{ t('pages.app.settings.sections.information.platform') }}</span>
						<UBadge variant="subtle" color="neutral">
							{{ componentData.platform }}
						</UBadge>
					</div>

					<div class="flex items-center justify-between pt-1 pb-3 w-full">
						<span class="text-dimmed">{{ t('pages.app.settings.sections.information.architecture') }}</span>
						<UBadge variant="subtle" color="neutral">
							{{ componentData.architecture }}
						</UBadge>
					</div>
				</div>

				<div class="text-2xl text-highlighted">Frontend</div>
				<div class="flex flex-col items-center gap-2 divide-y w-full">
					<div class="flex items-center justify-between pt-1 pb-3 w-full">
						<span class="text-dimmed">{{ t('pages.app.settings.sections.information.vue_version') }}</span>
						<UBadge variant="subtle" color="neutral">
							{{ componentData.vue_version }}
						</UBadge>
					</div>

					<div class="flex items-center justify-between pt-1 pb-3 w-full">
						<span class="text-dimmed">{{ t('pages.app.settings.sections.information.nuxt_ui_version') }}</span>
						<UBadge variant="subtle" color="neutral">
							{{ componentData.nuxt_ui_version }}
						</UBadge>
					</div>
				</div>
			</div>
		</template>
	</UCard>
	<Loading v-else-if="isLoading" />
	<GeneralError v-else-if="!isLoading && status === 'error'" />
</template>
