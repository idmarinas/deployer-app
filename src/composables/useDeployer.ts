import { useRouter } from 'vue-router'

export function useDeployerShortcuts() {
  const router = useRouter()

  const shortcuts = {
    shift_p: async () => {
      await router.push('/dashboard/projects/add')
    },
    shift_t: async () => {
      await router.push('/dashboard/tasks/add')
    },
    shift_k: async () => {
      await router.push('/dashboard/passkeys/add')
    },
    shift_h: async () => {
      await router.push('/dashboard/hosts/add')
    },
    shift_v: async () => {
      await router.push('/dashboard/variables/add')
    }
  }

  return {
    shortcuts
  }
}