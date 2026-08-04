<script lang="ts">
import { useHostSchema } from '@/composables/schemas/hosts'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const state = defineModel<{
	name: string
	description?: string
	host: string
	port: number
	auth_type: 'password' | 'key'
	username: string
	password: string | null
	key_id: number | null
	enabled: boolean
}>({ required: true })

const props = defineProps<{
	isLoading: boolean
}>()

const { t } = useI18n()

const { authPasswordSchema, authKeySchema } = useHostSchema()
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
	>
		<DescriptionEditor v-model="state.description" />
	</UFormField>

	<UFormField name="host" :label="t('form.hosts.host.label')" :help="t('form.hosts.host.help')" required>
		<UInput v-model="state.host" autocomplete="on" class="w-full" />
	</UFormField>

	<UFormField name="port" :label="t('form.hosts.port.label')" :help="t('form.hosts.port.help')" required>
		<UInputNumber v-model="state.port" autocomplete="on" class="w-full" :min="0" :max="65535" />
	</UFormField>

	<UFormField name="username" :label="t('form.hosts.username.label')" :help="t('form.hosts.username.help')" required>
		<UInput v-model="state.username" autocomplete="on" class="w-full" />
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

		<UForm
			v-if="state.auth_type === 'password'"
			:disabled="isLoading"
			:schema="authPasswordSchema"
			class="space-y-4"
			nested
		>
			<PasswordInput
				name="password"
				v-model="state.password!"
				:label="t('form.hosts.password.label')"
				:help="t('form.hosts.password.help')"
				:required="state.auth_type === 'password'"
				:optional="state.auth_type !== 'password'"
			/>
		</UForm>
		<UForm v-else-if="state.auth_type === 'key'" :disabled="isLoading" :schema="authKeySchema" class="space-y-4" nested>
			<UFormField
				name="key_id"
				:label="t('form.hosts.key.label')"
				:help="t('form.hosts.key.help')"
				:required="state.auth_type === 'key'"
			>
				<SelectKeypass v-model="state.key_id" class="w-full" />
			</UFormField>
		</UForm>
	</div>
</template>
