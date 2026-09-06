import { useRouter } from 'vue-router'

export function useDeployerShortcuts() {
	const router = useRouter()

	const shortcuts = {
		shift_k: async () => {
			await router.push('/dashboard/passkeys/add')
		},
		shift_h: async () => {
			await router.push('/dashboard/hosts/add')
		},
	}

	return {
		shortcuts,
	}
}
