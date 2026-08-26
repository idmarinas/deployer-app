import { useProjectDockerComposeValidation } from './validation/projects/useProjectDockerComposeValidation'
import { useHostValidation } from './validation/useHostValidation'
import { usePasskeyValidation } from './validation/usePasskeyValidation'

export function useSchemaValidation(id?: number) {
	return {
		projects: {
			docker: {
				compose: useProjectDockerComposeValidation(id),
			},
		},
		host: useHostValidation(id),
		passkeys: usePasskeyValidation(id),
	}
}
