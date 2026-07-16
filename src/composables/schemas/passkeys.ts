import { countWhere } from '@/composables/queries/shared'
import { passkeys } from '@/lib/schema'
import { and, eq, ne } from 'drizzle-orm'
import { useI18n } from 'vue-i18n'
import * as z from 'zod'
import { descriptionField } from './description'

export function usePasskeySchema(passkeyId?: number) {
	const { t } = useI18n()

	const passkeySchema = z.object({
		name: z
			.string(t('validation.passkeys.name.required'))
			.normalize()
			.min(3, t('validation.passkeys.name.min'))
			.max(120, t('validation.passkeys.name.max'))
			.refine(async value => {
				const condition = passkeyId
					? and(eq(passkeys.name, value), ne(passkeys.id, passkeyId))!
					: eq(passkeys.name, value)
				const exist = await countWhere(passkeys, condition)
				return exist <= 0
			}, t('validation.passkeys.name.not_unique')),
		description: descriptionField(),
		key_type: z.enum(['rsa', 'ed25519', 'ecdsa'], t('validation.passkeys.key_type.required')),
		key_content: z
			.string(t('validation.passkeys.key_content.required'))
			.normalize()
			.nonempty(t('validation.passkeys.key_content.required')),
		passphrase: z.string().normalize().optional(),
		fingerprint: z.string().optional(),
	})

	const passkeyToServerSchema = z.object({
		passkey_id: z.number(t('validation.passkeys.passkey_id.required')),
		host_id: z.number(t('validation.passkeys.host.required')),
		action: z.enum(['add', 'remove'], t('validation.passkeys.action.required')),
		temp_password: z.string().optional(),
		temp_username: z.string().optional(),
	})

	return {
		passkeySchema,
		passkeyToServerSchema,
	}
}

export type PasskeySchema = z.output<ReturnType<typeof usePasskeySchema>['passkeySchema']>
export type PasskeyToServerSchema = z.output<ReturnType<typeof usePasskeySchema>['passkeyToServerSchema']>
