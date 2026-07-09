import { and, eq, ne } from 'drizzle-orm'
import * as z from 'zod'
import { useI18n } from 'vue-i18n'
import { countWhere } from '@/composables/queries/shared'
import { global_variables } from '@/lib/schema'

export function useGlobalVariableSchema(globalVariableId?: number) {
  const { t } = useI18n()

  const globalVariableSchema = z.object({
    name: z.string(t('validation.global_variables.name.required'))
      .normalize()
      .min(3, t('validation.global_variables.name.min'))
      .max(120, t('validation.global_variables.name.max'))
      .refine(async (value) => {
        const condition = globalVariableId
          ? and(eq(global_variables.name, value), ne(global_variables.id, globalVariableId))!
          : eq(global_variables.name, value)
        const exist = await countWhere(global_variables, condition)
        return exist <= 0
      }, t('validation.global_variables.name.not_unique')
      ),
    value: z.string(t('validation.global_variables.value.required')),
    is_secret: z.boolean().default(false),
    description: z.string().max(1000, t('validation.global_variables.description.max')).optional(),
  })

  return {
    globalVariableSchema,
  }
}

export type GlobalVariableSchema = z.output<ReturnType<typeof useGlobalVariableSchema>['globalVariableSchema']>
