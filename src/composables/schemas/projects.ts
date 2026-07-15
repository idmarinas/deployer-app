import { and, eq, ne } from 'drizzle-orm'
import { useI18n } from 'vue-i18n'
import * as z from 'zod'
import { countWhere } from '@/composables/queries/shared'
import { projects } from '@/lib/schema'
import { descriptionField } from './description'

export function useProjectSchema(projectId?: number) {
	const { t } = useI18n()

	const projectSchema = z.object({
		name: z
			.string(t('validation.projects.name.required'))
			.normalize()
			.min(3, t('validation.projects.name.min'))
			.max(120, t('validation.projects.name.max'))
			.refine(async value => {
				const condition = projectId
					? and(eq(projects.name, value), ne(projects.id, projectId))!
					: eq(projects.name, value)
				const exist = await countWhere(projects, condition)
				return exist <= 0
			}, t('validation.projects.name.not_unique')),
		description: descriptionField(),
		git_url: z.url(t('validation.projects.git_url.invalid')).normalize(),
		local_working_dir: z.string(t('validation.projects.local_working_dir.required')).normalize(),
		remote_working_dir: z.string(t('validation.projects.remote_working_dir.required')).normalize(),
		framework: z.enum(
			['symfony', 'laravel', 'nextjs', 'vuejs', 'generic'],
			t('validation.projects.framework.required'),
		),
		enabled: z.boolean().default(true),
	})

	return {
		projectSchema,
	}
}

export type ProjectSchema = z.output<ReturnType<typeof useProjectSchema>['projectSchema']>
