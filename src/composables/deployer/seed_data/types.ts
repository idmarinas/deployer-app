import type { EntryKey } from '@pinia/colada'
import type { SQL } from 'drizzle-orm'
import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core'
import type { ComposerTranslation } from 'vue-i18n'

/**
 * Clave que identifica un registro predeterminado. Puede ser de texto (`key`)
 * o numérica (`id`), según la tabla.
 */
export type SeedKey = string | number

/** Registro individual que puede restablecerse desde los datos predeterminados. */
export interface SeedRecord {
	/** Clave única del registro dentro de su origen. */
	key: SeedKey
	/** Nombre traducido que se muestra en la interfaz. */
	name: string
}

/** Origen de datos predeterminados expuesto a la interfaz. */
export interface SeedSource {
	/** Identificador del origen (coincide con el nombre del archivo sin extensión). */
	id: string
	/** Archivo que contiene los datos predeterminados. */
	file: string
	/** Icono mostrado junto al origen. */
	icon: string
	/** Etiqueta traducida del origen. */
	label: (t: ComposerTranslation) => string
	/** Claves de caché de Pinia Colada que dependen de este origen. */
	cacheKey: EntryKey
	/** Registros predeterminados disponibles para restablecer. */
	records: (t: ComposerTranslation) => SeedRecord[]
	/** Inserta los registros que falten sin sobrescribir los datos personalizados. */
	seed: (t: ComposerTranslation) => Promise<void>
	/** Restaura los valores predeterminados, sobrescribiendo los datos personalizados. */
	reset: (t: ComposerTranslation, keys?: readonly SeedKey[]) => Promise<void>
}

/** Fila de datos predeterminados, tal como se inserta en la tabla. */
export type SeedRow = Record<string, unknown>

/** Configuración de un origen de datos predeterminados. */
export interface SeedSourceConfig<TRecord extends object> {
	/** Identificador del origen (coincide con el nombre del archivo sin extensión). */
	id: string
	/** Archivo que contiene los datos predeterminados. */
	file: string
	/** Icono mostrado junto al origen. */
	icon: string
	/** Etiqueta traducida del origen. */
	label: (t: ComposerTranslation) => string
	/** Claves de caché de Pinia Colada que dependen de este origen. */
	cacheKey: EntryKey
	/** Tabla de Drizzle donde se guardan los registros. */
	table: AnySQLiteTable
	/** Columna que actúa como identificador único (`key`, `id`…). */
	idField: keyof TRecord & string
	/**
	 * Columna que contiene el nombre visible. Si se omite, se usa {@link idField}
	 * como nombre.
	 */
	nameField?: keyof TRecord & string
	/** Registros predeterminados, traducidos para el idioma activo. */
	defaults: (t: ComposerTranslation) => readonly TRecord[]
	/**
	 * Columnas que actualiza el seed sobre una fila existente. Si se omite, las
	 * filas existentes no se modifican y solo se insertan las que falten.
	 */
	seedColumns?: readonly (keyof TRecord & string)[]
	/**
	 * Condición que limita qué filas existentes puede actualizar el seed. Sirve,
	 * por ejemplo, para respetar los registros personalizados (`custom = 0`).
	 */
	seedWhere?: SQL
	/** Columnas que se sobrescriben al restablecer los valores predeterminados. */
	resetColumns: readonly (keyof TRecord & string)[]
	/** Valores fijos que se aplican siempre en un reset (p. ej. `deleted_at: null`). */
	resetValues?: SeedRow
}

/** Opciones internas del upsert usado por seed y reset. */
export interface SeedUpsertOptions {
	/** Columnas que se actualizan cuando la fila ya existe. */
	columns: readonly string[]
	/** Condición que limita las filas actualizables (`targetWhere`). */
	where?: SQL
	/** Valores fijos que se añaden al `SET` del upsert. */
	values?: SeedRow
}
