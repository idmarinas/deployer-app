<!-- Componente para cambiar entre enabled/disabled. -->

<script lang="ts">
import type { CommandResponse } from '@/types/tauri-types'

import { useElementHover } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'

import { useI18n } from 'vue-i18n'

import useToaster from '@/composables/useToaster'

import { useQueryCache } from '@pinia/colada'
import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
const props = defineProps<{
	enabled: boolean
	command?: string
	id?: number
}>()

const emit = defineEmits(['updated'])
const toaster = useToaster()
const queryCache = useQueryCache()

const { t } = useI18n()

const badge = useTemplateRef('badge')
const isHovered = useElementHover(badge)

const canToggle = computed(() => props.command && props.command.length > 3 && props.id && props.id > 0)

const icon = computed(() => (inverse = false) => {
	const enabled = inverse ? !props.enabled : props.enabled

	return enabled ? 'i-tabler-check' : 'i-tabler-x'
})
const color = computed(() => (inverse = false) => {
	const enabled = inverse ? !props.enabled : props.enabled

	return enabled ? 'success' : 'error'
})
const label = computed(() => (inverse = false) => {
	const enabled = inverse ? !props.enabled : props.enabled

	if (enabled) {
		return t(inverse ? 'common.actions.enable' : 'common.status.active')
	}

	return t(inverse ? 'common.actions.disable' : 'common.status.inactive')
})
const isLoading = ref(false)

async function toggleEnable() {
	isLoading.value = true
	isHovered.value = false

	const response = await invoke<CommandResponse>(props.command as string, {
		input: { enabled: !props.enabled },
		id: props.id,
	})

	if (response.success) {
		await queryCache.invalidateQueries({ key: ['projects', 'list'] })
		emit('updated', !props.enabled)
	} else {
		toaster.error(t('overlays.toast.title.error'), t('overlays.toast.description.error'))
	}

	isLoading.value = false
}
</script>

<template>
	<UBadge
		v-if="isLoading"
		icon="i-tabler-loader-2"
		color="warning"
		label="Guardando"
		:ui="{ leadingIcon: 'animate-spin' }"
	/>
	<span ref="badge" v-else>
		<UBadge
			v-if="isHovered && canToggle"
			class="cursor-pointer"
			:label="label(true)"
			:color="color(true)"
			:icon="icon(true)"
			:loading="isLoading"
			:disabled="isLoading"
			@click="toggleEnable"
		/>
		<UBadge v-else :label="label()" :color="color()" :icon="icon()" :loading="isLoading" :disabled="isLoading" />
	</span>
</template>
