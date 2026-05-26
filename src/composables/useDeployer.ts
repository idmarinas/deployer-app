import { useRouter } from 'vue-router'

export function useDeployerShortcuts() {
  const router = useRouter()

  const shortcuts = {
    shift_p: async () => {
      await router.push('/dashboard/projects/create')
    },
    shift_t: async () => {
      await router.push('/dashboard/tasks/create')
    },
    shift_k: async () => {
      await router.push('/dashboard/passkeys/create')
    },
    shift_h: async () => {
      await router.push('/dashboard/hosts/create')
    },
    shift_v: async () => {
      await router.push('/dashboard/variables/create')
    }
  }

  return {
    shortcuts
  }
}