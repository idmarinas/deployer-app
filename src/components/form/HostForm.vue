<script lang="ts">
import type { JSONContent } from '@tiptap/vue-3'

import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
import { ref } from 'vue'

import { useHostFingerprint } from '@/composables/dashboard/hosts/useHostFingerprint'
import { ICONS } from '@/utils/icons'

const state = defineModel<{
	id?: number | null
	name: string
	description: JSONContent
	host: string
	default_remote_path: string | null
	port: number
	auth_type: 'password' | 'key'
	username: string
	password: string | null
	key_id: number | null
	host_key_fingerprint?: string | null
	enabled: boolean
}>({ required: true })

const props = defineProps<{
	isLoading: boolean
	hostId?: number | null
}>()

const { t } = useI18n()
const isChecking = ref(false)
const { checkAndConfirm } = useHostFingerprint()

async function checkFingerprint() {
	if (!props.hostId) return

	const fingerprint = await checkAndConfirm(
		{
			id: props.hostId,
			name: state.value.name,
			host_key_fingerprint: state.value.host_key_fingerprint,
		},
		isChecking,
	)

	if (fingerprint !== undefined) {
		state.value.host_key_fingerprint = fingerprint
	}
}
</script>

<template>
	<UFormField name="name" :label="t('form.hosts.name.label')" :help="t('form.hosts.name.help')" required>
		<UInput
			v-model="state.name"
			autocomplete="off"
			class="w-full"
			:ui="{ trailing: 'pointer-events-none' }"
			maxlength="120"
		>
			<template #trailing>
				<div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
					{{ state.name?.length ?? 0 }}/120
				</div>
			</template>
		</UInput>
	</UFormField>

	<UFormField
		name="description"
		:label="t('form.hosts.description.label')"
		:help="t('form.hosts.description.help')"
		:hint="t('form.shared.hint.optional')"
    class="row-span-2"
	>
		<DescriptionEditor v-model="state.description" />
	</UFormField>

	<UFormField name="host" :label="t('form.hosts.host.label')" :help="t('form.hosts.host.help')" required>
		<UInput v-model="state.host" autocomplete="on" class="w-full" />
	</UFormField>

	<UFormField
		name="default_remote_path"
		:label="t('form.hosts.default_remote_path.label')"
		:help="t('form.hosts.default_remote_path.help')"
		:hint="t('form.shared.hint.optional')"
	>
		<UInput
			v-model="state.default_remote_path!"
			autocomplete="off"
			:placeholder="t('form.hosts.default_remote_path.placeholder')"
			class="w-full font-mono"
		/>
	</UFormField>

	<UFormField name="port" :label="t('form.hosts.port.label')" :help="t('form.hosts.port.help')" required>
		<UInputNumber v-model="state.port" autocomplete="on" class="w-full" :min="0" :max="65535" />
	</UFormField>

	<UFormField name="username" :label="t('form.hosts.username.label')" :help="t('form.hosts.username.help')" required>
		<UInput v-model="state.username" autocomplete="on" class="w-full" />
	</UFormField>

	<UFormField
		name="host_key_fingerprint"
		:label="t('form.hosts.host_key_fingerprint.label')"
		:help="t('form.hosts.host_key_fingerprint.help')"
	>
		<div class="flex gap-2">
			<UInput
				:model-value="state.host_key_fingerprint ?? ''"
				:placeholder="t('form.hosts.host_key_fingerprint.empty')"
				readonly
				class="flex-1 font-mono"
			/>
			<UButton
				:label="t('form.hosts.host_key_fingerprint.check')"
				:icon="ICONS.actions.refresh"
				variant="soft"
				:loading="isChecking"
				:disabled="!props.hostId || props.isLoading || isChecking"
				@click="checkFingerprint"
			/>
		</div>
	</UFormField>

	<div class="flex flex-col gap-3">
		<UFormField
			name="auth_type"
			:label="t('form.hosts.auth_type.label')"
			:help="t('form.hosts.auth_type.help')"
			required
		>
			<USelect
				v-model="state.auth_type"
				value-key="id"
				:items="[
					{ label: t('form.hosts.auth_type.select.password'), id: 'password' },
					{ label: t('form.hosts.auth_type.select.key'), id: 'key' },
				]"
				autocomplete="on"
				class="w-full"
				@update:model-value="
					(value: string) => {
						if (value === 'password') {
							state.password = ''
							state.key_id = null
						} else if (value === 'key') {
							state.password = null
							state.key_id = null
						}
					}
				"
			/>
		</UFormField>

		<PasswordInput
			v-if="state.auth_type === 'password'"
			name="password"
			v-model="state.password!"
			:label="t('form.hosts.password.label')"
			:help="t('form.hosts.password.help')"
			:required="state.auth_type === 'password'"
			:optional="state.auth_type !== 'password'"
		/>

		<UFormField
			v-else-if="state.auth_type === 'key'"
			name="key_id"
			:label="t('form.hosts.key.label')"
			:help="t('form.hosts.key.help')"
			:required="state.auth_type === 'key'"
		>
			<SelectKeypass v-model="state.key_id as number" class="w-full" />
		</UFormField>
	</div>
</template>
