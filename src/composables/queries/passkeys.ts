import type { Passkey } from '@/types/entities'
import type { CommandResponse, DerivePasskeyInfo, DerivePasskeyInfoInput } from '@/types/tauri-types'

import { useQueryCache } from '@pinia/colada'
import { invoke } from '@tauri-apps/api/core'
import { eq } from 'drizzle-orm'

import { createQueryNotifier, firstRow, invalidateCacheQueries } from '@/composables/queries/shared'
import useToaster from '@/composables/useToaster'
import { db } from '@/drizzle/drizzle'
import { passkeys } from '@/drizzle/schema'
import { i18n } from '@/i18n'

export function usePasskeyQuery() {
	const cacheQuery = useQueryCache()
	const toaster = useToaster()
	// Composer global: seguro fuera de setup (loaders, invalidateQueries)
	const { t } = i18n.global
	const notify = createQueryNotifier({ toaster, t })

	async function findAll(): Promise<Passkey[]> {
		return db.query.passkeys.findMany().catch(e => {
			notify.fail(e, {
				title: t('overlays.toast.title.error'),
				description: t('overlays.toast.description.error'),
			})
			return []
		})
	}

	async function find(id: number): Promise<Passkey | undefined> {
		return await db.query.passkeys.findFirst({ where: { id } }).catch(e => {
			notify.fail(e, {
				title: t('overlays.toast.title.error'),
				description: t('overlays.toast.description.error'),
			})
			return undefined
		})
	}

	async function create(data: Omit<Passkey, 'id'>): Promise<Passkey | undefined> {
		const input: DerivePasskeyInfoInput = {
			key_content: data.key_content,
			passphrase: data.passphrase ?? null,
		}

		const notice = notify.loading(
			t('notifications.passkeys.validation.loading.title'),
			t('notifications.passkeys.validation.loading.description'),
		)

		const response = await invoke<CommandResponse<DerivePasskeyInfo>>('derive_passkey_info', { input })

		if (!response.success || !response.data) {
			toaster.update(notice.id, 'error', t(response.message_key, response.message_params))
			throw new Error(response.message_key ?? 'derive_passkey_info failed')
		}

		notify.phase(
			notice.id,
			t('notifications.passkeys.create.loading.title'),
			t('notifications.passkeys.create.loading.description'),
		)
		const enriched = {
			...data,
			fingerprint: response.data.fingerprint || data.fingerprint?.trim(),
			key_type: response.data.key_type || data.key_type,
			updated_at: new Date().toISOString(),
			created_at: new Date().toISOString(),
		}
		return await db
			.insert(passkeys)
			.values(enriched)
			.returning()
			.then(async rows => {
				const row = firstRow(rows)
				if (!row) return undefined

				await invalidateCacheQueries(cacheQuery, ['passkeys'])

				notify.success(
					notice.id,
					t('notifications.passkeys.create.success.title'),
					t('notifications.passkeys.create.success.description', { id: row.id, name: row.name }),
				)

				return row
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.passkeys.create.error.title'),
						description: t('notifications.passkeys.create.error.description', { name: enriched.name, details: e }),
					},
					notice.id,
				)

				return undefined
			})
	}

	async function update(id: number, data: Partial<Omit<Passkey, 'created_at'>>): Promise<Passkey | undefined> {
		const notice = notify.loading(
			t('notifications.passkeys.update.loading.title'),
			t('notifications.passkeys.update.loading.description'),
		)

		data.updated_at = new Date().toISOString()

		return await db
			.update(passkeys)
			.set(data)
			.where(eq(passkeys.id, id))
			.returning()
			.then(async rows => {
				const row = firstRow(rows)
				if (!row) return undefined

				await invalidateCacheQueries(cacheQuery, ['passkeys'])

				notify.success(
					notice.id,
					t('notifications.passkeys.update.success.title'),
					t('notifications.passkeys.update.success.description', { name: row.name }),
				)

				return row
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.passkeys.update.error.title'),
						description: t('notifications.passkeys.update.error.description', { name: data.name, details: e }),
					},
					notice.id,
				)
				return undefined
			})
	}

	async function remove(id: number): Promise<boolean> {
		const notice = notify.loading(
			t('notifications.passkeys.delete.loading.title'),
			t('notifications.passkeys.delete.loading.description'),
		)

		return await db.query.passkeys
			.findFirst({ where: { id } })
			.then(async row => {
				if (!row) {
					return false
				}

				return await db
					.delete(passkeys)
					.where(eq(passkeys.id, id))
					.then(async () => {
						await invalidateCacheQueries(cacheQuery, ['passkeys'])

						notify.success(
							notice.id,
							t('notifications.passkeys.delete.success.title'),
							t('notifications.passkeys.delete.success.description', { name: row.name }),
						)

						return true
					})
					.catch(e => {
						notify.fail(
							e,
							{
								title: t('notifications.passkeys.delete.error.title'),
								description: t('notifications.passkeys.delete.error.description', { name: row.name, details: e }),
							},
							notice.id,
						)
						return false
					})
			})
			.catch(e => {
				// Igual que el original: este catch (findFirst vía API relacional) no pasa por toQueryRawError
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
