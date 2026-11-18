/**
 * Contrato compartido de parámetros de entrada (comandos y flujos de nodos).
 *
 * Una definición describe un campo que se pide antes de ejecutar; los valores
 * viven solo en memoria durante esa ejecución y se exponen al motor de
 * interpolación mediante la raíz `params` (`{{params.<key>}}`).
 */

/** Tipos de input admitidos en la v1. */
export const INPUT_FIELD_TYPES = ['text', 'number', 'boolean', 'select'] as const

export type InputFieldType = (typeof INPUT_FIELD_TYPES)[number]

/** Opción válida de un input de tipo `select`. */
export interface InputFieldOption {
	label: string
	value: string | number
}

/** Definición de un parámetro de entrada. */
export interface InputFieldDefinition {
	/** Slug estable usado en `{{params.<key>}}` */
	key: string
	/** Etiqueta visible en el formulario de ejecución */
	label: string
	type: InputFieldType
	/** ¿Es obligatorio para poder ejecutar? */
	required: boolean
	/**
	 * Valor por defecto: literal o expresión `{{global.<slug>}}`.
	 * Solo `text`, `number` y `select` admiten expresiones; `boolean`, solo literal.
	 */
	default?: string | number | boolean
	/** Opciones válidas cuando `type` es `select`. */
	options?: InputFieldOption[]
	/** Texto de ayuda mostrado junto al campo. */
	help?: string
}

/** Valor de entrada ya coaccionado a su tipo. */
export type InputValue = string | number | boolean

/** Valores de entrada de una ejecución concreta, indexados por `key`. */
export type InputValues = Record<string, InputValue>
