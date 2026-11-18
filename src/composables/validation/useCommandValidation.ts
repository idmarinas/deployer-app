import { and, eq, ne } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import * as z from 'zod'

import { db } from '@/drizzle/drizzle'
import { loadGlobalScopeMetadata } from '@/drizzle/lib/variables'
import type { GlobalVariableScope } from '@/drizzle/lib/variables'
import { commands } from '@/drizzle/schema'
import { i18n } from '@/i18n'
import type { OutputParser } from '@/utils/commands/types'
import { createInputFieldsSchema, resolveInputDefaults } from '@/utils/inputs'
import type { InputFieldDefinition } from '@/utils/inputs'

/**
 * Resuelve los `default` con variables globales contra el ámbito actual.
 *
 * Solo se ejecuta si algún default usa una expresión; si los metadatos no se
 * pueden cargar, se omite para no bloquear el guardado (queda la validación
 * estática de `createInputFieldsSchema`).
 */
async function refineInputDefaults(fields: InputFieldDefinition[], ctx: z.RefinementCtx) {
	if (!fields.some(field => typeof field.default === 'string' && field.default.includes('{{'))) return

	let scope: GlobalVariableScope

	try {
		scope = await loadGlobalScopeMetadata()
	} catch {
		return
	}

	const { t } = i18n.global
	const { issues } = resolveInputDefaults(fields, scope)
	const issue = issues[0]

	if (!issue) return

	const index = fields.findIndex(field => field.key === issue.key)

	ctx.addIssue({
		code: 'custom',
		path: [index < 0 ? 0 : index, 'default'],
		message: t(issue.messageKey, issue.messageParams),
	})
}

export function useCommandValidation(key?: string) {
	const { t } = i18n.global

	const select = createSelectSchema(commands)

	// Unicidad: las filas soft-deleted siguen ocupando los índices UNIQUE de la BD
	// (`key`, `name`), así que `$count` NO filtra por `deleted_at` (si lo hiciera,
	// el INSERT fallaría).
	const insert = createInsertSchema(commands, {
		key: z =>
			z
				.trim()
				.nonempty(t('validation.commands.key.required'))
				.regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, t('validation.commands.key.format'))
				.min(3, t('validation.commands.key.min'))
				.max(120, t('validation.commands.key.max'))
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
		inputs: () => createInputFieldsSchema().superRefine(refineInputDefaults).default([]),
		timeout: z =>
			z.min(1, t('validation.commands.timeout.min')).max(3600, t('validation.commands.timeout.max')).default(300),
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
		inputs: () => createInputFieldsSchema().superRefine(refineInputDefaults).optional(),
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
