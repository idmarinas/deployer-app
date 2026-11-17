// import { useProjectDockerComposeValidation } from './validation/projects/useProjectDockerComposeValidation'
import { useCommandValidation } from './validation/useCommandValidation'
import { useHostValidation } from './validation/useHostValidation'
import { usePasskeyValidation } from './validation/usePasskeyValidation'
import { useVariablesValidation } from './validation/useVariablesValidation'

export function useSchemaValidation(id?: number | string) {
	return {
		// projects: {
		// 	docker: {
		// 		compose: useProjectDockerComposeValidation(id),
		// 	},
		// },
		hosts: useHostValidation(id as number | undefined),
		passkeys: usePasskeyValidation(id as number | undefined),
		commands: useCommandValidation(id as string | undefined),
		variables: useVariablesValidation(id as number | undefined),
	}
}
