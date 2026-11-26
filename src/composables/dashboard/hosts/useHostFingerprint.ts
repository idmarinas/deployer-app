import type { CommandResponse } from '@/types/tauri-types'
import type { Ref } from 'vue'

import { eq } from 'drizzle-orm'
import { useQueryCache } from '@pinia/colada'
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from 'vue-i18n'

import { invalidateCacheQueries, nowIso } from '@/composables/queries/shared'
import { db } from '@/drizzle/drizzle'
import { hosts as deployer_hosts } from '@/drizzle/schema'
import { useConfirmDialog } from '@/composables/useDialog'
import useToaster from '@/composables/useToaster'
import { ICONS } from '@/utils/icons'

/** Host mínimo necesario para comprobar y guardar su huella. */
export interface HostFingerprintTarget {
	id: number
	name: string
	host_key_fingerprint?: string | null
}

/**
 * Comprueba la conexión de un host y, si el servidor presenta una huella nueva
 * o distinta, pide confirmación al usuario y la guarda con Drizzle.
 *
 * Devuelve:
 * - la huella confirmada cuando se acepta una nueva;
 * - `null` cuando la conexión ya era válida con la huella guardada;
 * - `undefined` cuando falló la conexión o el usuario canceló.
 */
export function useHostFingerprint() {
	const { t } = useI18n()
	const toaster = useToaster()
	const cacheQuery = useQueryCache()
	const confirm = useConfirmDialog()

	async function checkAndConfirm(
		host: HostFingerprintTarget,
		loading?: Ref<boolean>,
	): Promise<string | null | undefined> {
		if (loading) loading.value = true

		const notice = toaster.warning(
			t('notifications.hosts.test_connection.loading.title'),
			t('notifications.hosts.test_connection.loading.description', { name: host.name }),
			{ icon: ICONS.server.plug, duration: 0 },
		)

		try {
			const result = await invoke<CommandResponse<null>>('test_connection', { hostId: host.id })

			if (result.success) {
				toaster.update(
					notice.id,
					'success',
					t('notifications.hosts.test_connection.success.title'),
					t('notifications.hosts.test_connection.success.description', { name: host.name }),
					{ duration: undefined },
				)
				return host.host_key_fingerprint ?? null
			}

			const fingerprint = result.message_params.fingerprint
			const isUnknown = result.message_key === 'tauri.ssh.errors.host_key_unknown'
			const isMismatch = result.message_key === 'tauri.ssh.errors.host_key_mismatch'

			if (!fingerprint || (!isUnknown && !isMismatch)) {
				const reason = result.message_params.reason || t(result.message_key, result.message_params)
				toaster.update(
					notice.id,
					'error',
					t('notifications.hosts.test_connection.error.title'),
					t('notifications.hosts.test_connection.error.description', { name: host.name, reason }),
					{ duration: undefined },
				)
				return undefined
			}

			const prefix = isUnknown ? 'fingerprint' : 'fingerprint_changed'
			const accepted = await confirm({
				title: t(`notifications.hosts.test_connection.${prefix}.title`),
				description: t(`notifications.hosts.test_connection.${prefix}.description`, {
					name: host.name,
					fingerprint,
					current: host.host_key_fingerprint || '-',
				}),
				type: isUnknown ? 'yes_no' : 'cancel_confirm',
			})

			if (!accepted) {
				toaster.update(
					notice.id,
					'warning',
					t('notifications.hosts.test_connection.cancelled.title'),
					t('notifications.hosts.test_connection.cancelled.description', { name: host.name }),
					{ duration: undefined },
				)
				return undefined
			}

			await db
				.update(deployer_hosts)
				.set({ host_key_fingerprint: fingerprint, updated_at: nowIso() })
				.where(eq(deployer_hosts.id, host.id))
			await invalidateCacheQueries(cacheQuery, ['hosts'])

			toaster.update(
				notice.id,
				'success',
				t(`notifications.hosts.test_connection.${prefix}.success.title`),
				t(`notifications.hosts.test_connection.${prefix}.success.description`, { name: host.name }),
				{ duration: undefined },
			)

			return fingerprint
		} catch (e) {
			toaster.update(
				notice.id,
				'error',
				t('notifications.hosts.test_connection.error.title'),
				t('notifications.hosts.test_connection.error.description', { name: host.name, reason: String(e) }),
				{ duration: undefined },
			)
			return undefined
		} finally {
			if (loading) loading.value = false
		}
	}

	return { checkAndConfirm }
}
