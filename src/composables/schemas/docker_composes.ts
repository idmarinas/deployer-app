import { countWhere } from '@/composables/queries/shared'
import { projects_docker_compose as docker_composes } from '@/lib/schema'
import { and, eq, ne } from 'drizzle-orm'
import { useI18n } from 'vue-i18n'
import * as z from 'zod'
import { descriptionField } from './description'

export function useDockerComposeSchema(dockerComposeId?: number) {
	const { t } = useI18n()

	const dockerComposeSchema = z.object({
		name: z
			.string(t('validation.docker_composes.name.required'))
			.normalize()
			.min(3, t('validation.docker_composes.name.min'))
			.max(120, t('validation.docker_composes.name.max'))
			.refine(async value => {
				const condition = dockerComposeId
					? and(eq(docker_composes.name, value), ne(docker_composes.id, dockerComposeId))!
					: eq(docker_composes.name, value)
				const exist = await countWhere(docker_composes, condition)
				return exist <= 0
			}, t('validation.docker_composes.name.not_unique')),
		description: descriptionField(),
		host_id: z.number().optional(),
		remote_path: z.string().min(1, t('validation.docker_composes.remote_path.required')),
		enabled: z.boolean().default(false),
	})

	return { dockerComposeSchema }
}

export type DockerComposeSchema = z.output<ReturnType<typeof useDockerComposeSchema>['dockerComposeSchema']>
