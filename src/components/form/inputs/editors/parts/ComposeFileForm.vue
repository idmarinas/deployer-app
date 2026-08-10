<script lang="ts">
import type { ComposeFile, ComposeNetwork, ComposeVolume } from '@/lib/docker-compose/types'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const model = defineModel<ComposeFile>({ required: true })

const { t } = useI18n()

const volumesMap = computed<Record<string, ComposeVolume>>({
	get: () => model.value.volumes ?? {},
	set: (val: Record<string, ComposeVolume>) => {
		model.value = { ...model.value, volumes: Object.keys(val).length > 0 ? val : undefined }
	},
})

const networksMap = computed<Record<string, ComposeNetwork>>({
	get: () => model.value.networks ?? {},
	set: (val: Record<string, ComposeNetwork>) => {
		model.value = { ...model.value, networks: Object.keys(val).length > 0 ? val : undefined }
	},
})
</script>

<template>
	<UFormField label="Project name" help="Nombre del proyecto docker compose (campo 'name')">
		<UInput v-model="model.name" class="w-full font-mono" placeholder="mi-proyecto" />
	</UFormField>

	<USeparator class="my-4" />

	<UTabs
		:items="[
			{
				label: t('form.docker_composes.services.label'),
				icon: 'i-tabler-box',
				slot: 'services',
			},
			{
				label: t('form.docker_composes.volumes.label'),
				icon: 'i-tabler-database',
				slot: 'volumes',
			},
			{
				label: t('form.docker_composes.networks.label'),
				icon: 'i-tabler-network',
				slot: 'networks',
			},
		]"
	>
		<template #services>
			<ComposeServicesSection v-model="model.services" />
		</template>
		<template #volumes>
			<ComposeTopLevelSection type="volumes" v-model="volumesMap" />
		</template>
		<template #networks>
			<ComposeTopLevelSection type="networks" v-model="networksMap" />
		</template>
	</UTabs>
</template>
