import { useHostQuery } from '@/composables/queries/hosts'
import { usePasskeyQuery } from '@/composables/queries/passkeys'
// import { useDockerComposeQuery } from '@/composables/queries/projects/docker/compose'

export function useQuery() {
	return {
		// Hosts
		hosts: useHostQuery(),

		// Passkeys
		passkeys: usePasskeyQuery(),

		// Projects
		// projects: {
		// 	docker: {
		// 		// Docker Compose
		// 		compose: useDockerComposeQuery(),
		// 	},
		// },
	}
}
