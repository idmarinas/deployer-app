import * as z from 'zod'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@/composables/useQuery'
import { DB_TABLES } from '@/constants/dbTables'

export function useHostSchema(hostId?: number) {
  const { t } = useI18n()
  const { count } = useQuery()

  const hostSchema = z.object({
    name: z.string(t('schemas.hosts.validation.name.required'))
      .normalize()
      .min(3, t('schemas.hosts.validation.name.min'))
      .max(120, t('schemas.hosts.validation.name.max'))
      .refine(async (value) => {
        let query = `name = '${value}'`
        if (hostId) {
          query += ` AND id != ${hostId}`
        }
        const exist = await count(DB_TABLES.HOSTS, query)
        return exist <= 0
      }, t('schemas.hosts.validation.name.not_unique')
      ),
    description: z.string().max(1000, t('schemas.hosts.validation.description.max')).optional(),
    host: z.xor([z.ipv4(t('schemas.hosts.validation.host.ipv4')), z.ipv6(t('schemas.hosts.validation.host.ipv6'))], t('schemas.hosts.validation.host.required')),
    port: z.number().min(0, t('schemas.hosts.validation.port.min')).max(65535, t('schemas.hosts.validation.port.max')),
    auth_type: z.enum(['password', 'key'], t('schemas.hosts.validation.auth_type.required')),
    enabled: z.boolean().default(false)
  })

  const authPasswordSchema = z.object({
    username: z.string().nonempty(t('schemas.hosts.validation.username.required')),
    password: hostId
      ? z.string().optional()
      : z.string().nonempty(t('schemas.hosts.validation.password.required')),
    key_id: z.null().optional(),
  })

  const authKeySchema = z.object({
    username: z.null().optional(),
    password: z.null().optional(),
    key_id: z.number().min(1, t('schemas.hosts.validation.key.required')),
  })

  return {
    hostSchema,
    authPasswordSchema,
    authKeySchema
  }
}

export type HostSchema = z.output<ReturnType<typeof useHostSchema>['hostSchema']>
export type AuthPasswordSchema = z.output<ReturnType<typeof useHostSchema>['authPasswordSchema']>
export type AuthKeySchema = z.output<ReturnType<typeof useHostSchema>['authKeySchema']>