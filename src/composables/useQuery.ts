import { useDockerComposeQuery } from '@/composables/queries/docker_composes'
import { useHostQuery } from '@/composables/queries/hosts'
import { usePasskeyQuery } from '@/composables/queries/passkeys'

export function useQuery() {
	return {
		// Hosts
		hosts: useHostQuery(),

		// Passkeys
		passkeys: usePasskeyQuery(),

		// Docker Composes
		dockerComposes: useDockerComposeQuery(),
	}
}
