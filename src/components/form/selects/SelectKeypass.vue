<script lang="ts">
import type { SelectMenuItem } from '@nuxt/ui'

import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useSelectPasskeys } from '@/loaders/passkeys'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
const state = defineModel<number | null>()

const { t } = useI18n()
const router = useRouter()
const { data: items, isLoading } = useSelectPasskeys()
</script>

<template>
	<UFieldGroup>
		<USelectMenu
			v-model="state"
			value-key="id"
			:items="items as SelectMenuItem[]"
			:loading="isLoading"
			:disabled="isLoading"
			:placeholder="t('form.shared.placeholder.passkeys.select')"
			class="w-full"
		/>
		<UTooltip :text="t('form.passkeys.title.add')" :delay-duration="0">
			<UButton
				:loading="isLoading"
				:disabled="isLoading"
				:icon="ICONS.actions.add"
				@click="router.push({ name: 'dashboard-passkeys-add' })"
			/>
		</UTooltip>
	</UFieldGroup>
</template>
