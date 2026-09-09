<script lang="ts">
import { computed, onBeforeMount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useToolbarButtons } from '@/composables/dashboard/toolbar/useToolbarButtons'
import { useToolbarContentTitle } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForPasskeysModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { usePasskeyQuery } from '@/composables/queries/passkeys'
import { PositionedButton } from '@/composables/usePositionedButtons'
import { usePasskeyById } from '@/loaders/passkeys'
import { isEncryptedValue } from '@/utils/crypto'
import { ModulesName } from '@/utils/deployer-app'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/passkeys/:id(\\d+)',
	name: 'dashboard-passkeys-id',
	params: {
		path: {
			id: 'int',
		},
	},
})

const { t } = useI18n()
const { toolbar } = useToolbarForPasskeysModule()
const passkeysQuery = usePasskeyQuery()

const { data: itemData, isLoading, status, error } = usePasskeyById()

const isOperating = ref(false)

const isLoadingOrOperating = computed(() => isLoading.value || isOperating.value)
const pageTitle = computed(() => itemData.value?.name || '')

const { useViewButtons } = useToolbarButtons(ModulesName.Passkeys, isLoadingOrOperating, passkeysQuery.remove)

const buttons: PositionedButton[] = [
	{ id: 'cancel', action: 'remove' },
	{ id: 'edit', action: 'update', tooltip: false, class: 'mr-5' },
]
const toolbarButtons = computed(() => useViewButtons(itemData, buttons, true))
useToolbarContentTitle(pageTitle, toolbar, toolbarButtons)

onMounted(() => {
	toolbar?.clearContent()
})

onBeforeMount(() => {
	toolbar?.clearContent()
})

watch([isLoading, pageTitle], ([newLoading, newTitle]) => {
	if (newLoading) {
		toolbar?.clearContent()
	} else {
		if (newTitle) {
			toolbar?.updateToolbar()
		}
	}
})
</script>

<template>
	<template v-if="!isLoading && status === 'success' && itemData">
		<ViewCard
			:id="itemData.id"
			:description="itemData.description"
			:enabled="itemData.enabled"
			:created_at="itemData.created_at"
			:updated_at="itemData.created_at"
		>
			<template #title-right>
				<UBadge color="info" variant="subtle" :icon="ICONS.auth.key" :label="itemData.key_type" />
			</template>
		</ViewCard>

		<USeparator class="my-4" />

		<UPageList divide>
			<UPageCard variant="ghost">
				<UUser
					:name="t('entity.passkey.fingerprint')"
					:description="itemData.fingerprint || undefined"
					:avatar="{ icon: ICONS.auth.fingerprint }"
				/>
			</UPageCard>
			<UPageCard variant="ghost">
				<UUser :name="t('entity.passkey.passphrase')" :avatar="{ icon: ICONS.auth.key }">
					<template #description>
						<span class="text-sm text-foreground flex items-center gap-2">
							<template v-if="itemData.passphrase && !isEncryptedValue(itemData.passphrase)">
								<UBadge variant="outline" size="sm" color="success" label="•••••••••••" />
							</template>
							<template v-else>
								<UBadge variant="outline" size="sm" color="warning" :label="t('common.empty.passphrase')" />
							</template>
						</span>
					</template>
				</UUser>
			</UPageCard>
			<UPageCard variant="ghost">
				<UUser :name="t('entity.passkey.key_content')" description="clave publica" :avatar="{ icon: ICONS.auth.lock }">
					<template #description>
						<span class="font-mono text-xs">
							••••••••••••••••••••••••••••<br />
							••••••••••••••••••••••••••••<br />
							••••••••••••••••••••••••••••<br />
							••••••••••••••••••••••••••••
						</span>
					</template>
				</UUser>
			</UPageCard>
			<UPageCard variant="ghost">
				<UUser
					:name="t('entity.passkey.key_public')"
					:description="itemData.public_key || undefined"
					:avatar="{ icon: ICONS.auth.lockOpen }"
				/>
			</UPageCard>
		</UPageList>
	</template>
	<StatusError v-else-if="status === 'error' && error?.message === 'not-found'" />
	<Loading v-else-if="isLoading" what="passkey" />
	<GeneralError v-else />
</template>
