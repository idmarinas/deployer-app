import { z } from 'zod'

/**
 * Schemas zod de los resultados de los comandos "de fábrica" (semilla en BD).
 *
 * No se guardan en la BD: se usan solo para tipar el consumidor vía el
 * genérico de `runCommand<T>` (p.ej. `runCommand<SystemMetricsResult>`).
 */

export const systemMetricsSchema = z.object({
  cpu: z.string(),
  ram: z.string(),
  disk: z.string(),
  uptime: z.string(),
})

export type SystemMetricsResult = z.infer<typeof systemMetricsSchema>

export const systemInfoSchema = z.object({
  kernel: z.string(),
  arch: z.string(),
  cores: z.string(),
  memory_total: z.string(),
  disk_total: z.string(),
  os_release: z.string(),
  distribution: z.string(),
  package_manager: z.string(),
  package_manager_version: z.string(),
})

export type SystemInfoResult = z.infer<typeof systemInfoSchema>