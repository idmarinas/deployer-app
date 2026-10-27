import { and, eq, ne } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import * as z from 'zod'

import { db } from '@/drizzle/drizzle'
import { commands } from '@/drizzle/schema'
import { i18n } from '@/i18n'
import type { OutputParser } from '@/utils/commands/types'

export function useCommandValidation(key?: string) {
	const { t } = i18n.global

	const select = createSelectSchema(commands)

	const insert = createInsertSchema(commands, {
		key: z =>
			z
				.trim()
				.nonempty(t('validation.commands.key.required'))
				.regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, t('validation.commands.key.format'))
				.min(3, t('validation.commands.key.min'))
				.max(64, t('validation.commands.key.max'))
				.refine(async value => {
					if (!value) return false

					return (await db.$count(commands, eq(commands.key, value))) <= 0
				}, t('validation.commands.key.not_unique')),
		name: z =>
			z
				.normalize()
				.min(3, t('validation.commands.name.min'))
				.max(120, t('validation.commands.name.max'))
				.refine(async value => {
					if (!value) return false

					return (await db.$count(commands, eq(commands.name, value))) <= 0
				}, t('validation.commands.name.not_unique')),
		command: z.string().nonempty(t('validation.commands.command.required')),
		parser: z => z.default({ type: 'raw' } satisfies OutputParser),
		timeout: z =>
			z
				.min(1, t('validation.commands.timeout.min'))
				.max(3600, t('validation.commands.timeout.max'))
				.default(300),
		enabled: z => z.default(false),
		updated_at: z => z,
		created_at: z => z,
		deleted_at: z => z.nullable(),
	})

	const update = createUpdateSchema(commands, {
		key: z =>
			z
				.normalize()
				.min(3, t('validation.commands.key.min'))
				.max(64, t('validation.commands.key.max'))
				.regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, t('validation.commands.key.format'))
				.optional(),
		name: z =>
			z
				.normalize()
				.min(3, t('validation.commands.name.min'))
				.max(120, t('validation.commands.name.max'))
				.refine(async value => {
					if (!value) return false

					let where = eq(commands.name, value)
					if (key) {
						where = and(where, ne(commands.key, key))!
					}

					return (await db.$count(commands, where as any)) <= 0
				}, t('validation.commands.name.not_unique'))
				.optional(),
		command: z.string(),
		parser: z => z.default({ type: 'raw' } satisfies OutputParser).optional(),
		timeout: z =>
			z
				.min(1, t('validation.commands.timeout.min'))
				.max(3600, t('validation.commands.timeout.max'))
				.default(300)
				.optional(),
		enabled: z => z.default(false).optional(),
		updated_at: z => z,
		created_at: z => z,
		deleted_at: z => z.nullish(),
	})

	return {
		select,
		insert,
		update,
	}
}

export type CommandValidationInsertType = z.output<ReturnType<typeof useCommandValidation>['insert']>

export type CommandValidationUpdateType = z.output<ReturnType<typeof useCommandValidation>['update']>