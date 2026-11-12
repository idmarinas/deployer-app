import type { Passkey } from '@/types/entities'
import type { CommandResponse, DerivePasskeyInfo, DerivePasskeyInfoInput } from '@/types/tauri-types'

import { invoke } from '@tauri-apps/api/core'

import { createCrudQuery } from '@/composables/queries/crud'
import { withTimestamps } from '@/composables/queries/shared'
import { QueryRawError } from '@/drizzle/drizzle'
import { passkeys } from '@/drizzle/schema'

/**
 * CRUD de passkeys.
 *
 * Antes de insertar, deriva la clave pública, el fingerprint y el tipo real
 * desde `key_content` mediante el comando Rust `derive_passkey_info`. El toast
 * persistente arranca en la fase de validación y pasa a "creando" tras derivar.
 */
export function usePasskeyQuery() {
	return createCrudQuery<typeof passkeys, number, Omit<Passkey, 'id'>, Partial<Omit<Passkey, 'created_at'>>>({
		table: passkeys,
		primaryKey: passkeys.id,
		cacheKey: 'passkeys',
		i18nPrefix: 'notifications.passkeys',
		createLoadingKey: 'notifications.passkeys.validation.loading',
		nameOf: row => row.name,
		toInsert: async (data, ctx) => {
			const input: DerivePasskeyInfoInput = {
				key_content: data.key_content,
				passphrase: data.passphrase ?? null,
			}

			const response = await invoke<CommandResponse<DerivePasskeyInfo>>('derive_passkey_info', { input })

			if (!response.success || !response.data) {
				// `notify.fail` reconoce QueryRawError y muestra su clave i18n
				// estructurada en el mismo toast persistente de la operación.
				throw new QueryRawError(response.message_key ?? 'derive_passkey_info failed', response.message_params)
			}

			ctx.notify.phase(
				ctx.noticeId,
				ctx.t('notifications.passkeys.create.loading.title'),
				ctx.t('notifications.passkeys.create.loading.description'),
			)

			return withTimestamps({
				...data,
				fingerprint: response.data.fingerprint || data.fingerprint?.trim(),
				key_type: response.data.key_type || data.key_type,
				public_key: response.data.public_key || '',
			})
		},
		softDelete: {
			deletedAt: passkeys.deleted_at,
			updatedAt: passkeys.updated_at,
		},
	})
}
