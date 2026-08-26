<script lang="ts">
import { isEncryptedValue } from '@/utils/crypto'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const password = defineModel<string | null | undefined>({ required: true })
const props = withDefaults(
	defineProps<{
		name: string
		label: string
		description?: string
		help?: string
		optional?: boolean
		checkStrength?: boolean
		disabled?: boolean
	}>(),
	{
		optional: false,
		checkStrength: true,
		disabled: false,
	},
)

const { t } = useI18n()

const passwordToAnalyze = computed((): string => (!password.value ? '' : (password.value as unknown as string)))
const showPassword = ref(false)
const showPasswordConfig = ref(false)
const passConfig = ref({
	length: 16,
	useUpper: true,
	useNumbers: true,
	useSpecial: true,
})

function checkStrength(str: string) {
	if (!props.checkStrength || (props.optional && str.length === 0)) return []

	const requirements = [
		{ regex: /.{8,}/, text: t('form.shared.password.strength.req.length') },
		{ regex: /\d/, text: t('form.shared.password.strength.req.number') },
		{ regex: /[a-z]/, text: t('form.shared.password.strength.req.lower') },
		{ regex: /[A-Z]/, text: t('form.shared.password.strength.req.upper') },
	]

	return requirements.map(req => ({ met: req.regex.test(str), text: req.text }))
}

const strength = computed(() => checkStrength(passwordToAnalyze.value))
const score = computed(() => strength.value.filter(req => req.met).length)

const color = computed(() => {
	if (score.value === 0) return 'neutral'
	if (score.value <= 1) return 'error'
	if (score.value <= 2) return 'warning'
	if (score.value === 3) return 'warning'
	return 'success'
})

const text = computed(() => {
	if (score.value === 0) return t('form.shared.password.strength.score._0')
	if (score.value <= 2) return t('form.shared.password.strength.score._2')
	if (score.value === 3) return t('form.shared.password.strength.score._3')
	return t('form.shared.password.strength.score._4')
})

function generatePassword(length: number, useUpper: boolean, useNumbers: boolean, useSpecial: boolean) {
	const lower = 'abcdefghijklmnopqrstuvwxyz'
	const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	const numbers = '0123456789'
	const special = '!@#$%^&*()-_=+[]{}|;:,.<>?'
	let charset = lower
	if (useUpper) charset += upper
	if (useNumbers) charset += numbers
	if (useSpecial) charset += special

	const array = new Uint32Array(length)
	window.crypto.getRandomValues(array)

	return Array.from(array, x => charset[x % charset.length]).join('')
}
</script>

<template>
	<div>
		<UFormField :name="props.name" :label="props.label" :help="props.help" :required="!optional">
			<UInput
				v-model="password as string"
				:placeholder="t('form.shared.placeholder.password.input')"
				autocomplete="off"
				:color="color"
				:type="showPassword ? 'text' : 'password'"
				:aria-invalid="score < 4"
				aria-describedby="password-strength"
				class="w-full"
				:ui="{ trailing: 'pe-1 pointer-events-auto' }"
				:disabled="disabled"
			>
				<template #trailing>
					<UButton
						color="neutral"
						variant="link"
						size="sm"
						:icon="showPassword ? 'i-tabler-eye-off' : 'i-tabler-eye'"
						:aria-label="showPassword ? t('form.shared.hide.password') : t('form.shared.show.password')"
						:aria-pressed="showPassword"
						aria-controls="password"
						:disabled="disabled"
						@click="showPassword = !showPassword"
					/>
					<UButton
						icon="i-tabler-sparkles"
						variant="link"
						size="sm"
						:disabled="disabled"
						:aria-label="t('form.shared.password.generate.label')"
						aria-controls="generate-password"
						@click="
							password = generatePassword(
								passConfig.length,
								passConfig.useUpper,
								passConfig.useNumbers,
								passConfig.useSpecial,
							)
						"
					/>
					<UButton
						:icon="showPasswordConfig ? 'i-tabler-settings-off' : 'i-tabler-settings'"
						variant="link"
						size="sm"
						color="secondary"
						:disabled="disabled"
						:aria-label="t('form.shared.password.generate.config')"
						aria-controls="generate-password-config"
						@click="showPasswordConfig = !showPasswordConfig"
					/>
				</template>
			</UInput>
		</UFormField>

		<div v-if="showPasswordConfig" class="grid grid-cols-2 gap-2 mt-2 border-y border-primary py-2">
			<div class="col-span-2">{{ t('form.shared.password.generate.title_config') }}</div>
			<UInputNumber v-model="passConfig.length" :min="8" />
			<USwitch v-model="passConfig.useUpper" :label="t('form.shared.password.generate.use_upper')" />
			<USwitch v-model="passConfig.useNumbers" :label="t('form.shared.password.generate.use_numbers')" />
			<USwitch v-model="passConfig.useSpecial" :label="t('form.shared.password.generate.use_special')" />
		</div>

		<div
			v-if="
				((props.checkStrength && props.optional && passwordToAnalyze.length > 0) || !props.optional) &&
				!isEncryptedValue(passwordToAnalyze)
			"
			class="mt-2 space-y-2"
		>
			<UProgress :color="color" :indicator="text" :model-value="score" :max="4" />

			<p id="password-strength" class="text-sm font-medium">
				<em>{{ text }}</em
				>. {{ t('form.shared.password.strength.label') }}:
			</p>

			<ul class="space-y-1" aria-label="Password requirements">
				<li
					v-for="(req, index) in strength"
					:key="index"
					class="flex items-center gap-0.5"
					:class="req.met ? 'text-success' : 'text-muted'"
				>
					<UIcon :name="req.met ? 'i-tabler-circle-check' : 'i-tabler-circle-x'" class="size-4 shrink-0" />

					<span class="text-xs font-light">
						{{ req.text }}
						<span class="sr-only">
							-
							{{
								req.met ? t('form.shared.password.strength.req.meet') : t('form.shared.password.strength.req.not_meet')
							}}
						</span>
					</span>
				</li>
			</ul>
		</div>
	</div>
</template>
