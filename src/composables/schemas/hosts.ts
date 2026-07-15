import { and, eq, ne } from 'drizzle-orm'
import * as z from 'zod'
import { useI18n } from 'vue-i18n'
import { countWhere } from '@/composables/queries/shared'
import { hosts } from '@/lib/schema'
import { descriptionField } from './description'

export function useHostSchema(hostId?: number) {
  const { t } = useI18n()

  const hostSchema = z.object({
    name: z.string(t('validation.hosts.name.required'))
      .normalize()
      .min(3, t('validation.hosts.name.min'))
      .max(120, t('validation.hosts.name.max'))
      .refine(async (value) => {
        const condition = hostId
          ? and(eq(hosts.name, value), ne(hosts.id, hostId))!
          : eq(hosts.name, value)
        const exist = await countWhere(hosts, condition)
        return exist <= 0
      }, t('validation.hosts.name.not_unique')
      ),
    description: descriptionField(),
    host: z.xor([z.ipv4(t('validation.hosts.host.ipv4')), z.ipv6(t('validation.hosts.host.ipv6'))], t('validation.hosts.host.required')),
    port: z.number().min(0, t('validation.hosts.port.min')).max(65535, t('validation.hosts.port.max')),
    username: z.string().nonempty(t('validation.hosts.username.required')),
    auth_type: z.enum(['password', 'key'], t('validation.hosts.auth_type.required')),
    enabled: z.boolean().default(false)
  })

  const authPasswordSchema = z.object({
    password: hostId
      ? z.string().optional()
      : z.string().nonempty(t('validation.hosts.password.required')),
    key_id: z.null().optional(),
  })

  const authKeySchema = z.object({
    password: z.null().optional(),
    key_id: z.number().min(1, t('validation.hosts.key.required')),
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