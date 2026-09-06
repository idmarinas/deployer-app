<script lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import useToaster from '@/composables/useToaster'
import { ENCRYPTED_FIELDS, getCurrentVersion, reencryptScope, rotateKey, scanAndReencrypt } from '@/lib/stronghold'
</script>

<script setup lang="ts">
const { t } = useI18n()
const toaster = useToaster()

const versions = reactive<Record<string, number>>({})
const isLoading = ref(true)
const rotatingScope = ref<string | null>(null)
const scanning = ref(false)

async function loadVersions() {
	isLoading.value = true
	try {
		for (const field of ENCRYPTED_FIELDS) {
			versions[field.scope] = await getCurrentVersion(field.scope)
		}
	} catch {
		toaster.error(t('pages.app.settings.sections.security.load_error'))
	} finally {
		isLoading.value = false
	}
}

async function onRotate(scope: string) {
	rotatingScope.value = scope
	try {
		const { version } = await rotateKey(scope)
		const result = await reencryptScope(scope)
		versions[scope] = version
		toaster.success(
			t('pages.app.settings.sections.security.rotate_success', {
				version,
				reencrypted: result.reencrypted,
				purged: result.purged_versions.length,
			}),
		)
	} catch {
		toaster.error(t('pages.app.settings.sections.security.rotate_error'))
	} finally {
		rotatingScope.value = null
	}
}

async function onScan() {
	scanning.value = true
	try {
		const result = await scanAndReencrypt()
		await loadVersions()
		toaster.success(
			t('pages.app.settings.sections.security.scan_success', {
				reencrypted: result.reencrypted,
				purged: result.purged_versions.length,
			}),
		)
	} catch {
		toaster.error(t('pages.app.settings.sections.security.scan_error'))
	} finally {
		scanning.value = false
	}
}

onMounted(loadVersions)
</script>

<template>
	<UCard v-if="!isLoading">
		<template #title>
			<div class="flex items-center justify-between gap-3">
				<h2 class="text-lg font-semibold">{{ t('pages.app.settings.sections.security.label') }}</h2>
				<UButton
					icon="i-tabler-refresh"
					color="primary"
					variant="soft"
					:loading="scanning"
					:label="t('pages.app.settings.sections.security.scan')"
					@click="onScan"
				/>
			</div>
		</template>

		<div class="flex flex-col gap-4">
			<p class="text-sm text-dimmed">
				{{ t('pages.app.settings.sections.security.warning') }}
			</p>
			<div v-if="ENCRYPTED_FIELDS.length > 0" class="flex flex-col divide-y">
				<div
					v-for="field in ENCRYPTED_FIELDS"
					:key="field.scope"
					class="flex items-center justify-between gap-3 py-2.5"
				>
					<div class="flex flex-col gap-0.5">
						<span class="text-sm font-medium font-mono">{{ field.label }}</span>
						<UBadge variant="subtle" color="neutral" size="sm">
							{{ t('pages.app.settings.sections.security.current_version') }}:
							{{ versions[field.scope] ?? '—' }}
						</UBadge>
					</div>

					<UButton
						icon="i-tabler-key"
						size="sm"
						color="warning"
						variant="soft"
						:disabled="rotatingScope === field.scope"
						:loading="rotatingScope === field.scope"
						:label="t('pages.app.settings.sections.security.rotate')"
						@click="onRotate(field.scope)"
					/>
				</div>
			</div>

			<p v-else class="text-sm text-dimmed">
				{{ t('pages.app.settings.sections.security.no_fields') }}
			</p>
		</div>
	</UCard>
	<Loading v-else-if="isLoading" />
</template>
