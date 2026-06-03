/**
 * Convierte de manera recursiva todos los valores `null` de un objeto o array en `undefined`.
 * Esto es de utilidad para componentes de UI (como Nuxt UI) que no interpretan `null` de
 * manera correcta en el enlace bidireccional (v-model).
 */
export function sanitizeNulls<T>(obj: T): any {
  if (obj === null || obj === undefined) return undefined
  if (Array.isArray(obj)) return obj.map(sanitizeNulls)
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, val]) => [key, val === null ? undefined : sanitizeNulls(val)])
    )
  }
  return obj
}
