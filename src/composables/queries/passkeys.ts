import type { Passkey } from '@/types/entities'
import type { CommandResponse, DerivePasskeyInfo, DerivePasskeyInfoInput } from '@/types/tauri-types'

import { useQueryCache } from '@pinia/colada'
import { invoke } from '@tauri-apps/api/core'
import { eq } from 'drizzle-orm'

import { toQueryRawError } from '@/composables/queries/shared'
import useToaster from '@/composables/useToaster'
import { PasskeyValidationInsertType, usePasskeyValidation } from '@/composables/validation/usePasskeyValidation'
import { i18n } from '@/i18n'
import { db } from '@/lib/db'
import { passkeys } from '@/lib/schema'

export function usePasskeyQuery() {
	const cacheQuery = useQueryCache()
	const validation = usePasskeyValidation()
	const toaster = useToaster()
	// Composer global: seguro fuera de setup (loaders, invalidateQueries)
	const { t } = i18n.global

	async function findAll(): Promise<Passkey[]> {
		return db
			.select()
			.from(passkeys)
			.then(rows => rows.map(row => row as unknown as Passkey))
			.catch(e => {
				const queryError = toQueryRawError(e)

				if (queryError) {
					toaster.error(t(queryError.message_key, queryError.message_params))
				} else {
					toaster.error(t('overlays.toast.title.error'), t('overlays.toast.description.error'))
				}
				return []
			})
	}

	async function find(id: number): Promise<Passkey | undefined> {
		return await db
			.select()
			.from(passkeys)
			.where(eq(passkeys.id, id))
			.then(rows => {
				const row = rows[0]
				if (!row) return undefined
				return row as unknown as Passkey
			})
			.catch(e => {
				const queryError = toQueryRawError(e)

				if (queryError) {
					toaster.error(t(queryError.message_key, queryError.message_params))
				} else {
					toaster.error(t('overlays.toast.title.error'), t('overlays.toast.description.error'))
				}
				return undefined
			})
	}

	async function create(data: Omit<Passkey, 'id' | 'created_at' | 'updated_at'>): Promise<Passkey | undefined> {
		const parsed: PasskeyValidationInsertType = validation.insert.parse(data)

		const input: DerivePasskeyInfoInput = {
			key_content: parsed.key_content,
			passphrase: parsed.passphrase ?? null,
		}

		const notice = toaster.warning(
			t('notifications.passkeys.validation.loading.title'),
			t('notifications.passkeys.validation.loading.description'),
			{ duration: 0 },
		)

		const response = await invoke<CommandResponse<DerivePasskeyInfo>>('derive_passkey_info', { input })

		if (!response.success || !response.data) {
			toaster.update(notice.id, 'error', t(response.message_key, response.message_params))
			throw new Error(response.message_key ?? 'derive_passkey_info failed')
		}

		toaster.update(
			notice.id,
			'warning',
			t('notifications.passkeys.create.loading.title'),
			t('notifications.passkeys.create.loading.description'),
			{ duration: 0 },
		)
		const enriched = {
			...parsed,
			fingerprint: response.data.fingerprint || parsed.fingerprint?.trim(),
			key_type: response.data.key_type || parsed.key_type,
		}
		return await db
			.insert(passkeys)
			.values(enriched)
			.returning()
			.then(async rows => {
				const row = rows[0]
				if (!row) return undefined

				await cacheQuery.invalidateQueries({ key: ['passkeys'] }, 'all')

				toaster.update(
					notice.id,
					'success',
					t('notifications.passkeys.create.success.title'),
					t('notifications.passkeys.create.success.description', { id: row.id, name: row.name }),
				)

				return row
			})
			.catch(e => {
				const queryError = toQueryRawError(e)

				if (queryError) {
					toaster.update(notice.id, 'error', t(queryError.message_key, queryError.message_params))
				} else {
					toaster.update(
						notice.id,
						'error',
						t('notifications.passkeys.create.error.title'),
						t('notifications.passkeys.create.error.description', { name: enriched.name, details: e }),
					)
				}

				return undefined
			})
	}

	async function update(
		id: number,
		data: Partial<Omit<Passkey, 'id' | 'created_at' | 'updated_at'>>,
	): Promise<Passkey | undefined> {
		const notice = toaster.warning(
			t('notifications.passkeys.update.loading.title'),
			t('notifications.passkeys.update.loading.description'),
			{ duration: 0 },
		)

		return await db
			.update(passkeys)
			.set(data)
			.where(eq(passkeys.id, id))
			.returning()
			.then(async rows => {
				const row = rows[0]
				if (!row) return undefined

				await cacheQuery.invalidateQueries({ key: ['passkeys'] }, 'all')

				toaster.update(
					notice.id,
					'success',
					t('notifications.passkeys.update.success.title'),
					t('notifications.passkeys.update.success.description', { name: row.name }),
				)

				return row
			})
			.catch(e => {
				const queryError = toQueryRawError(e)

				if (queryError) {
					toaster.update(notice.id, 'error', t(queryError.message_key, queryError.message_params))
				} else {
					toaster.update(
						notice.id,
						'error',
						t('notifications.passkeys.update.error.title'),
						t('notifications.passkeys.update.error.description', { name: data.name, details: e }),
					)
				}
				return undefined
			})
	}

	async function remove(id: number): Promise<boolean> {
		const notice = toaster.warning(
			t('notifications.passkeys.delete.loading.title'),
			t('notifications.passkeys.delete.loading.description'),
			{ duration: 0 },
		)

		return await db.query.passkeys
			.findFirst({ where: { id: id } })
			.then(async row => {
				if (!row) {
					return false
				}

				return await db
					.delete(passkeys)
					.where(eq(passkeys.id, id))
					.then(async () => {
						await cacheQuery.invalidateQueries({ key: ['passkeys'] }, 'all')

						toaster.update(
							notice.id,
							'success',
							t('notifications.passkeys.delete.success.title'),
							t('notifications.passkeys.delete.success.description', { name: row.name }),
						)

						return true
					})
					.catch(e => {
						const queryError = toQueryRawError(e)

						if (queryError) {
							toaster.update(notice.id, 'error', t(queryError.message_key, queryError.message_params))
						} else {
							toaster.update(
								notice.id,
								'error',
								t('notifications.passkeys.delete.error.title'),
								t('notifications.passkeys.delete.error.description', { name: row.name, details: e }),
							)
						}
						return false
					})
			})
			.catch(e => {
				toaster.update(
					notice.id,
					'error',
					t('notifications.passkeys.delete.error.title'),
					t('notifications.passkeys.delete.error.description', { details: e }),
				)
				return false
			})
	}

	return { findAll, find, create, update, remove }
}
