import { and, eq, ne } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import * as z from 'zod'

import { i18n } from '@/i18n'
import { db } from '@/lib/db'
import { passkeys } from '@/lib/schema'

export function usePasskeyValidation(id?: number) {
	const { t } = i18n.global

	const select = createSelectSchema(passkeys)

	const insert = createInsertSchema(passkeys, {
		name: z =>
			z
				.normalize()
				.min(3, t('validation.passkeys.name.min'))
				.max(120, t('validation.passkeys.name.max'))
				.refine(
					async value => (await db.$count(passkeys, eq(passkeys.name, value))) <= 0,
					t('validation.passkeys.name.not_unique'),
				),
		key_content: z.string().nonempty(t('validation.passkeys.key_content.required')),
		passphrase: z.string().nullable().default(null),
		fingerprint: z => z,
		enabled: z => z.default(false),
		key_type: z => z.default('ed25519'),
		updated_at: z => z,
		created_at: z => z,
		deleted_at: z => z.nullable(),
	})

	const update = createUpdateSchema(passkeys, {
		name: z =>
			z
				.normalize()
				.min(3, t('validation.passkeys.name.min'))
				.max(120, t('validation.passkeys.name.max'))
				.refine(async value => {
					let where = eq(passkeys.name, value)
					if (id) {
						where = and(where, ne(passkeys.id, id))!
					}

					return (await db.$count(passkeys, where)) <= 0
				}, t('validation.passkeys.name.not_unique'))
				.optional(),
		key_content: z.string(),
		passphrase: z.string().nullish().default(null),
		fingerprint: z => z.optional(),
		enabled: z => z.default(false).optional(),
		key_type: z => z.default('ed25519').optional(),
		updated_at: z => z,
		created_at: z => z,
		deleted_at: z => z.nullish(),
	})

	return {
		insert,
		select,
		update,
	}
}

export type PasskeyValidationInsertType = z.output<ReturnType<typeof usePasskeyValidation>['insert']>

export type PasskeyValidationUpdateType = z.output<ReturnType<typeof usePasskeyValidation>['update']>
