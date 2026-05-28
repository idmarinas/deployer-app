import { ref, computed } from 'vue'

export interface QueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
  executed: boolean
}

export interface UseQueryOptions {
  immediate?: boolean
}

export function useQueryState<T>(
  queryFn: () => Promise<T>,
  options: UseQueryOptions = {}
) {
  const state = ref<QueryState<T>>({
    data: null,
    loading: false,
    error: null,
    executed: false
  })

  const isLoading = computed(() => state.value.loading)
  const isError = computed(() => state.value.error !== null)
  const isSuccess = computed(() => state.value.executed && !state.value.error && state.value.data !== null)
  const hasExecuted = computed(() => state.value.executed)

  async function execute(): Promise<T | null> {
    state.value.loading = true
    state.value.error = null

    try {
      const result = await queryFn()
      state.value.data = result as any
      state.value.executed = true
      return result
    } catch (error) {
      state.value.error = error instanceof Error ? error.message : String(error)
      state.value.data = null
      state.value.executed = true
      return null
    } finally {
      state.value.loading = false
    }
  }

  function reset() {
    state.value = {
      data: null,
      loading: false,
      error: null,
      executed: false
    }
  }

  // Ejecutar inmediatamente si se especifica
  if (options.immediate) {
    execute()
  }

  return {
    // Estado reactivo
    data: computed(() => state.value.data),
    loading: isLoading,
    error: computed(() => state.value.error),
    executed: hasExecuted,

    // Estados derivados
    isLoading,
    isError,
    isSuccess,
    hasExecuted,

    // Métodos
    execute,
    reset
  }
}