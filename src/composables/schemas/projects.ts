import { useQuery } from '@/composables/useQuery'
import { DB_TABLES } from '@/constants/dbTables'
import { useI18n } from 'vue-i18n'
import * as z from 'zod'

export function useProjectSchema(projectId?: number) {
	const { t } = useI18n()
	const { count } = useQuery()

	const projectSchema = z.object({
		name: z
			.string(t('validation.projects.name.required'))
			.normalize()
			.min(3, t('validation.projects.name.min'))
			.max(120, t('validation.projects.name.max'))
			.refine(async value => {
				let query = `name = '${value}'`
				if (projectId) {
					query += ` AND id != ${projectId}`
				}
				const exist = await count(DB_TABLES.PROJECTS, query)
				return exist <= 0
			}, t('validation.projects.name.not_unique')),
		description: z.string().normalize().max(1000, t('validation.projects.description.max')).optional(),
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
