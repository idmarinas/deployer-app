import * as z from 'zod'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@/composables/useQuery'
import { DB_TABLES } from '@/constants/dbTables'

export function usePasskeySchema(passkeyId?: number) {
  const { t } = useI18n()
  const { count } = useQuery()

  const passkeySchema = z.object({
    name: z.string(t('schemas.passkeys.validation.name.required'))
      .normalize()
      .min(3, t('schemas.passkeys.validation.name.min'))
      .max(120, t('schemas.passkeys.validation.name.max'))
      .refine(async (value) => {
        let query = `name = '${value}'`
        if (passkeyId) {
          query += ` AND id != ${passkeyId}`
        }
        const exist = await count(DB_TABLES.PASSKEYS, query)
        return exist <= 0
      }, t('schemas.passkeys.validation.name.not_unique')
      ),
    description: z.string().normalize().max(1000, t('schemas.passkeys.validation.description.max')).optional(),
    key_type: z.enum(["rsa", "ed25519", "ecdsa"], t('schemas.passkeys.validation.key_type.required')),
    key_content: z.string(t('schemas.passkeys.validation.key_content.required')).normalize().nonempty(t('schemas.passkeys.validation.key_content.required')),
    passphrase: z.string().normalize().optional(),
    fingerprint: z.string().optional(),
  })

  const passkeyToServerSchema = z.object({
    passkey_id: z.number(t('schemas.passkeys.validation.passkey_id.required')),
    host_id: z.number(t('schemas.passkeys.validation.server.required')),
    action: z.enum(['add', 'remove'], t('schemas.passkeys.validation.action.required')),
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