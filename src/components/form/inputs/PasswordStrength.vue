<script lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
</script>
<script setup lang="ts">
const { t } = useI18n()

const password = defineModel<string>({ required: true })
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

const show = ref(false)

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

const strength = computed(() => checkStrength(password.value))
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
</script>

<template>
	<div>
		<UFormField :name="props.name" :label="props.label" :help="props.help" :required="!optional">
			<UInput
				v-model="password"
				:placeholder="t('form.shared.placeholder.password.input')"
				autocomplete="off"
				:color="color"
				:type="show ? 'text' : 'password'"
				:aria-invalid="score < 4"
				aria-describedby="password-strength"
				class="w-full"
				:ui="{ trailing: 'pe-1' }"
				:disabled="disabled"
			>
				<template #trailing>
					<UButton
						color="neutral"
						variant="link"
						size="sm"
						:icon="show ? 'i-tabler-eye-off' : 'i-tabler-eye'"
						:aria-label="show ? t('form.shared.hide.password') : t('form.shared.show.password')"
						:aria-pressed="show"
						aria-controls="password"
						:disabled="disabled"
						@click="show = !show"
					/>
				</template>
			</UInput>
		</UFormField>

		<div
			v-if="
				((props.checkStrength && props.optional && password.length > 0) || !props.optional) &&
				!password.startsWith('ENC:')
			"
			class="mt-1 space-y-2"
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
								req.met
									? t('form.shared.password.strength.req.meet')
									: t('form.shared.password.strength.req.not_meet')
							}}
						</span>
					</span>
				</li>
			</ul>
		</div>
	</div>
</template>
