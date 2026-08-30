import { and, eq, ne } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { i18n } from '@/i18n'
import { db } from '@/lib/db'
import { hosts } from '@/lib/schema'

export function useHostValidation(id?: number) {
	const { t } = i18n.global

	const select = createSelectSchema(hosts)

	const insert = createInsertSchema(hosts, {
		name: z =>
			z
				.trim()
				.normalize()
				.nonempty(t('validation.hosts.name.required'))
				.min(3, t('validation.hosts.name.min'))
				.max(120, t('validation.hosts.name.max'))
				.refine(
					async value => (await db.$count(hosts, eq(hosts.name, value))) <= 0,
					t('validation.hosts.name.not_unique'),
				),
		host: z.xor(
			[z.ipv4(t('validation.hosts.host.ipv4')), z.ipv6(t('validation.hosts.host.ipv6'))],
			t('validation.hosts.host.required'),
		),
		port: z => z.min(0, t('validation.hosts.port.min')).max(65535, t('validation.hosts.port.max')),
		username: z => z.trim().nonempty(t('validation.hosts.username.required')),
		auth_type: z => z.default('password'),
		password: z.string().nullable(),
		key_id: z => z.positive().nullable(),
		enabled: z => z.default(false),
		updated_at: z => z,
		created_at: z => z,
		deleted_at: z => z.nullable(),
	})
		.superRefine((data, ctx) => {
			if (data.auth_type === 'password') {
				if (data.password === null || data.password.length === 0) {
					ctx.addIssue({
						code: 'custom',
						message: t('validation.hosts.password.required'),
						path: ['password'],
					})
				}
			}

			if (data.auth_type === 'key') {
				if (data.key_id === null) {
					ctx.addIssue({
						code: 'custom',
						message: t('validation.hosts.key.required'),
						path: ['key_id'],
					})
				}
			}
		})
		.transform(data => {
			if (data.auth_type === 'password') {
				return { ...data, key_id: null }
			}
			if (data.auth_type === 'key') {
				return { ...data, password: null }
			}
			return data
		})

	const update = createUpdateSchema(hosts, {
		name: z =>
			z
				.normalize()
				.min(3, t('validation.hosts.name.min'))
				.max(120, t('validation.hosts.name.max'))
				.refine(async value => {
					let where = eq(hosts.name, value)
					if (id) {
						where = and(where, ne(hosts.id, id))!
					}

					return (await db.$count(hosts, where)) <= 0
				}, t('validation.hosts.name.not_unique'))
				.optional(),
		host: z
			.xor(
				[z.ipv4(t('validation.hosts.host.ipv4')), z.ipv6(t('validation.hosts.host.ipv6'))],
				t('validation.hosts.host.required'),
			)
			.optional(),
		port: z => z.min(0, t('validation.hosts.port.min')).max(65535, t('validation.hosts.port.max')),
		username: z => z.nonempty(t('validation.hosts.username.required')),
		auth_type: z => z.default('password'),
		password: z.string().nullable(),
		key_id: z => z.nonnegative().nullable(),
		enabled: z => z.default(false),
		updated_at: z => z,
		created_at: z => z,
		deleted_at: z => z.nullish(),
	})
		.superRefine((data, ctx) => {
			if (data.auth_type === 'password') {
				if (data.password === null || data.password.length === 0) {
					ctx.addIssue({
						code: 'custom',
						message: t('validation.hosts.password.required'),
						path: ['password'],
					})
				}
			}

			if (data.auth_type === 'key') {
				if (data.key_id === null) {
					ctx.addIssue({
						code: 'custom',
						message: t('validation.hosts.key.required'),
						path: ['key_id'],
					})
				}
			}
		})
		.transform(data => {
			if (data.auth_type === 'password') {
				return { ...data, key_id: null }
			}
			if (data.auth_type === 'key') {
				return { ...data, password: null }
			}
			return data
		})

	return {
		select,
		insert,
		update,
	}
}

export type HostValidationInsertType = z.output<ReturnType<typeof useHostValidation>['insert']>

export type HostValidationUpdateType = z.output<ReturnType<typeof useHostValidation>['update']>
