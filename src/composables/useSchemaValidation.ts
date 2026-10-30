// import { useProjectDockerComposeValidation } from './validation/projects/useProjectDockerComposeValidation'
import { useCommandValidation } from './validation/useCommandValidation'
import { useHostValidation } from './validation/useHostValidation'
import { usePasskeyValidation } from './validation/usePasskeyValidation'

export function useSchemaValidation(id?: number) {
	return {
		// projects: {
		// 	docker: {
		// 		compose: useProjectDockerComposeValidation(id),
		// 	},
		// },
		hosts: useHostValidation(id),
		passkeys: usePasskeyValidation(id),
		commands: useCommandValidation(),
	}
}
