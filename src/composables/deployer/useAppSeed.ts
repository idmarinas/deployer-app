import type { SeedKey } from './seed_data'

import { i18n } from '@/i18n'

import { SEED_SOURCES } from './seed_data'

export function useAppSeed() {
	const { t } = i18n.global

	/** Inserta los datos predeterminados que falten (respeta los personalizados). */
	async function execute() {
		for (const source of SEED_SOURCES) {
			await source.seed(t)
		}
	}

	/**
	 * Restaura los datos predeterminados de un origen completo o de un registro
	 * concreto. Sin `sourceId` restaura todos los orígenes.
	 */
	async function reset(sourceId?: string, keys?: readonly SeedKey[]) {
		const sources = sourceId ? SEED_SOURCES.filter(source => source.id === sourceId) : SEED_SOURCES

		for (const source of sources) {
			await source.reset(t, keys)
		}
	}

	return {
		execute,
		reset,
	}
}
