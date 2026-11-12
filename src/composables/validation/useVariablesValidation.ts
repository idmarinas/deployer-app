import { and, eq, ne } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import * as z from 'zod'

import { db } from '@/drizzle/drizzle'
import { variables } from '@/drizzle/schema'
import { i18n } from '@/i18n'

export function useVariablesValidation(id?: number) {
	const { t } = i18n.global

	const select = createSelectSchema(variables)

	const insert = createInsertSchema(variables, {
		name: z =>
			z
				.trim()
				.normalize()
				.min(3, t('validation.variables.name.min'))
				.max(120, t('validation.variables.name.max'))
				.refine(async value => {
					if (!value) return false

					return (await db.$count(variables, eq(variables.name, value))) <= 0
				}, t('validation.variables.name.not_unique')),
		slug: z =>
			z
				.trim()
				.nonempty(t('validation.variables.slug.required'))
				.regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, t('validation.variables.slug.format'))
				.min(3, t('validation.variables.slug.min'))
				.max(120, t('validation.variables.slug.max'))
				.refine(async value => {
					if (!value) return false

					return (await db.$count(variables, eq(variables.slug, value))) <= 0
				}, t('validation.variables.slug.not_unique')),
		value: z => z.default(''),
		enabled: z => z.default(false),
		updated_at: z => z,
		created_at: z => z,
		deleted_at: z => z.nullable(),
	}).superRefine((data, ctx) => {
		if ((data.enabled || data.is_secret) && !String(data.value ?? '').trim()) {
			ctx.addIssue({
				code: 'custom',
				path: ['value'],
				message: t('validation.variables.value.required'),
			})
		}
	})

	const update = createUpdateSchema(variables, {
		name: z =>
			z
				.trim()
				.normalize()
				.min(3, t('validation.variables.name.min'))
				.max(120, t('validation.variables.name.max'))
				.refine(async value => {
					if (!value) return false

					let where = eq(variables.name, value)
					if (id) {
						where = and(where, ne(variables.id, id))!
					}

					return (await db.$count(variables, where)) <= 0
				}, t('validation.variables.name.not_unique'))
				.optional(),
		is_secret: z =>
			z.optional().refine(async value => {
				if (value !== false || !id) return true

				return (await db.$count(variables, and(eq(variables.id, id), eq(variables.is_secret, true)))) <= 0
			}, t('validation.variables.is_secret.immutable')),
		enabled: z => z.default(false).optional(),
		updated_at: z => z,
		created_at: z => z,
		deleted_at: z => z.nullable(),
	})
		.omit({ slug: true })
		.superRefine((data, ctx) => {
			if (
				data.value !== undefined &&
				data.value !== null &&
				(data.enabled || data.is_secret) &&
				!String(data.value).trim()
			) {
				ctx.addIssue({
					code: 'custom',
					path: ['value'],
					message: t('validation.variables.value.required'),
				})
			}
		})

	return { select, insert, update }
}

export type VariablesValidationInsertType = z.output<ReturnType<typeof useVariablesValidation>['insert']>

export type VariablesValidationUpdateType = z.output<ReturnType<typeof useVariablesValidation>['update']>
