import * as z from 'zod'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@/composables/useQuery'
import { DB_TABLES } from '@/constants/dbTables'

export function usePasskeySchema(passkeyId?: number) {
  const { t } = useI18n()
  const { count } = useQuery()

  const passkeySchema = z.object({
    name: z.string(t('validation.passkeys.name.required'))
      .normalize()
      .min(3, t('validation.passkeys.name.min'))
      .max(120, t('validation.passkeys.name.max'))
      .refine(async (value) => {
        let query = `name = '${value}'`
        if (passkeyId) {
          query += ` AND id != ${passkeyId}`
        }
        const exist = await count(DB_TABLES.PASSKEYS, query)
        return exist <= 0
      }, t('validation.passkeys.name.not_unique')
      ),
    description: z.string().normalize().max(1000, t('validation.passkeys.description.max')).optional(),
    key_type: z.enum(["rsa", "ed25519", "ecdsa"], t('validation.passkeys.key_type.required')),
    key_content: z.string(t('validation.passkeys.key_content.required')).normalize().nonempty(t('validation.passkeys.key_content.required')),
    passphrase: z.string().normalize().optional(),
    fingerprint: z.string().optional(),
  })

  const passkeyToServerSchema = z.object({
    passkey_id: z.number(t('validation.passkeys.passkey_id.required')),
    host_id: z.number(t('validation.passkeys.server.required')),
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