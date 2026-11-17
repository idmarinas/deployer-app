import type { SeedSource } from './types'

import { commandsSeedSource } from './commands'

export { createSeedSource } from './createSeedSource'
export type { SeedKey, SeedRecord, SeedRow, SeedSource, SeedSourceConfig } from './types'

/**
 * Orígenes de datos predeterminados disponibles. Para añadir uno nuevo, crea su
 * archivo en `seed_data/` con `createSeedSource(...)` y agrégalo a esta lista.
 */
export const SEED_SOURCES: readonly SeedSource[] = [commandsSeedSource]
