import { and, eq, ne } from 'drizzle-orm'
import * as z from 'zod'
import { useI18n } from 'vue-i18n'
import { countWhere } from '@/composables/queries/shared'
import { tasks } from '@/lib/schema'
import { descriptionField } from './description'

export function useTaskSchema(taskId?: number) {
  const { t } = useI18n()

  const taskSchema = z.object({
    name: z.string(t('validation.tasks.name.required'))
      .normalize()
      .min(3, t('validation.tasks.name.min'))
      .max(120, t('validation.tasks.name.max'))
      .refine(async (value) => {
        const condition = taskId
          ? and(eq(tasks.name, value), ne(tasks.id, taskId))!
          : eq(tasks.name, value)
        const exist = await countWhere(tasks, condition)
        return exist <= 0
      }, t('validation.tasks.name.not_unique')
      ),
    description: descriptionField(),
    task_type: z.enum(['command', 'upload_file', 'download_file', 'script'], t('validation.tasks.task_type.required')),
    command: z.string().max(10000, t('validation.tasks.command.max')).optional(),
    timeout: z.number().min(1, t('validation.tasks.timeout.min')).max(86400, t('validation.tasks.timeout.max')),
    retry_count: z.number().min(0, t('validation.tasks.retry_count.min')).max(20, t('validation.tasks.retry_count.max')),
    retry_delay: z.number().min(0, t('validation.tasks.retry_delay.min')).max(3600, t('validation.tasks.retry_delay.max')),
    enabled: z.boolean().default(false),
  }).refine(
    data => !(data.task_type === 'command' || data.task_type === 'script') || !!data.command?.trim(),
    { message: t('validation.tasks.command.required'), path: ['command'] },
  )

  return {
    taskSchema,
  }
}

export type TaskSchema = z.output<ReturnType<typeof useTaskSchema>['taskSchema']>
