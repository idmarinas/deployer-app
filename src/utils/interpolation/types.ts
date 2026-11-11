/**
 * Tipos y utilidades del motor de interpolación de plantillas.
 *
 * El motor es agnóstico de la fuente de datos: recibe un conjunto de raíces
 * (`global`, `vars`, `params`, `nodes`, `workflow`, `run`, `node`) y resuelve
 * expresiones con la forma `{{raíz.ruta}}`. No depende de Vue ni de la BD.
 */

/** Ámbitos reconocidos por el parser. Cualquier otra raíz se deja literal. */
export const INTERPOLATION_SCOPES = ['global', 'vars', 'params', 'nodes', 'workflow', 'run', 'node'] as const

export type InterpolationScope = (typeof INTERPOLATION_SCOPES)[number]

/**
 * Entrada de un ámbito con metadatos.
 *
 * Se usa para las variables globales: el motor necesita saber si la variable
 * está habilitada y si es secreta antes de devolver su valor.
 */
export interface InterpolationVariable {
	value: unknown
	enabled?: boolean
	isSecret?: boolean
}

/** Valores disponibles por ámbito. Los ámbitos ausentes no están disponibles. */
export type InterpolationRoots = Partial<Record<InterpolationScope, Record<string, unknown>>>

/** Referencia válida encontrada en una plantilla. */
export interface TemplateReference {
	/** Texto completo de la expresión, incluidas las llaves. */
	expression: string
	/** Ruta sin llaves, p. ej. `global.deploy_path`. */
	path: string
	scope: InterpolationScope
	/** Segmentos de la ruta; el primero es el ámbito. */
	segments: string[]
	/** Posición inicial de `{{`. */
	start: number
	/** Posición final (exclusiva) después de `}}`. */
	end: number
}

export type InterpolationErrorCode =
	'scope_not_available' | 'unknown_variable' | 'disabled_variable' | 'secret_variable' | 'invalid_path'

export type InterpolationMessageKey =
	| 'utils.interpolation.errors.scope_not_available'
	| 'utils.interpolation.errors.unknown_variable'
	| 'utils.interpolation.errors.disabled_variable'
	| 'utils.interpolation.errors.secret_variable'
	| 'utils.interpolation.errors.invalid_path'
	| 'utils.interpolation.warnings.secret_variable'

export interface InterpolationMessage {
	messageKey: InterpolationMessageKey
	messageParams: Record<string, string>
}

/** Problema detectado al validar una plantilla (para linter y preview). */
export interface InterpolationIssue extends InterpolationMessage {
	code: InterpolationErrorCode
	severity: 'error' | 'warning'
	expression: string
	path: string
	start: number
	end: number
}

/**
 * Fragmento de una plantilla resuelta.
 *
 * Permite a la UI mostrar la versión original y la interpolada de la misma
 * plantilla resaltando cada expresión: un segmento de tipo `reference` conserva
 * tanto `expression` (texto guardado) como `text` (valor resuelto).
 */
export type InterpolationSegment =
	| { kind: 'text'; text: string }
	| {
			kind: 'reference'
			/** Expresión original, incluidas las llaves. */
			expression: string
			/** Valor resuelto (enmascarado si la variable es secreta). */
			text: string
			path: string
			scope: InterpolationScope
			isSecret: boolean
	  }

export interface InterpolationOptions {
	/**
	 * Si es `true` (por defecto), las variables secretas se sustituyen por
	 * `secretPlaceholder` en lugar de devolver su valor.
	 */
	maskSecrets?: boolean
	/** Marcador usado al enmascarar secretas. */
	secretPlaceholder?: string
}

const MESSAGE_KEYS: Record<InterpolationErrorCode, InterpolationMessageKey> = {
	scope_not_available: 'utils.interpolation.errors.scope_not_available',
	unknown_variable: 'utils.interpolation.errors.unknown_variable',
	disabled_variable: 'utils.interpolation.errors.disabled_variable',
	secret_variable: 'utils.interpolation.errors.secret_variable',
	invalid_path: 'utils.interpolation.errors.invalid_path',
}

function buildMessage(code: InterpolationErrorCode, path: string, scope: string): InterpolationMessage {
	const messageKey = MESSAGE_KEYS[code]

	if (code === 'scope_not_available') {
		return { messageKey, messageParams: { scope } }
	}

	return { messageKey, messageParams: { path } }
}

/** Error lanzado en ejecución cuando una referencia no puede resolverse. */
export class InterpolationError extends Error {
	readonly code: InterpolationErrorCode
	readonly expression: string
	readonly path: string
	readonly offset: number
	readonly end: number
	readonly messageKey: InterpolationMessageKey
	readonly messageParams: Record<string, string>

	constructor(
		code: InterpolationErrorCode,
		options: { expression: string; path: string; start: number; end: number; scope?: string },
	) {
		const { expression, path, start, end } = options
		const message = buildMessage(code, path, options.scope ?? path.split('.')[0] ?? '')
		super(message.messageKey)

		this.name = 'InterpolationError'
		this.code = code
		this.expression = expression
		this.path = path
		this.offset = start
		this.end = end
		this.messageKey = message.messageKey
		this.messageParams = message.messageParams
	}

	toIssue(): InterpolationIssue {
		return {
			code: this.code,
			severity: this.code === 'secret_variable' ? 'warning' : 'error',
			expression: this.expression,
			path: this.path,
			start: this.offset,
			end: this.end,
			messageKey: this.messageKey,
			messageParams: this.messageParams,
		}
	}
}

/** Crea la issue equivalente a un error de interpolación. */
export function toIssue(error: InterpolationError): InterpolationIssue {
	return error.toIssue()
}

export function isInterpolationScope(value: string): value is InterpolationScope {
	return (INTERPOLATION_SCOPES as readonly string[]).includes(value)
}

/** ¿El valor tiene la forma de una entrada con metadatos (`value`/`isSecret`/`enabled`)? */
export function isInterpolationVariable(value: unknown): value is InterpolationVariable {
	return typeof value === 'object' && value !== null && 'value' in value && ('isSecret' in value || 'enabled' in value)
}
