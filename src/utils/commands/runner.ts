import { db } from '@/drizzle/drizzle'
import { loadGlobalScopeForExecution } from '@/drizzle/lib/variables'
import { commands as commandsTable } from '@/drizzle/schema'
import { i18n } from '@/i18n'
import type { CommandResponse, RemoteCommandResult, RemoteConsoleEvent } from '@/types/tauri-types'
import { coerceInputValue, resolveInputDefaults, validateInputValues } from '@/utils/inputs'
import type { InputValues } from '@/utils/inputs'
import {
	collectSecretValues,
	InterpolationError,
	interpolateString,
	redactSecrets,
} from '@/utils/interpolation'
import { Channel, invoke } from '@tauri-apps/api/core'
import { and, eq, isNull } from 'drizzle-orm'
import { parseOutput } from './parsers'
import type { CommandDefinition, CommandRunOptions, CommandRunResult } from './types'

/**
 * Ejecuta un comando almacenado en la BD (`deployer_commands`) en un servidor
 * remoto por su `key`.
 *
 * La BD es la fuente única de la definición (command, parser, inputs y timeout);
 * solo se ejecutan comandos con `enabled = 1` y sin `deleted_at`.
 */
export async function runCommand<T = unknown>(
	commandKey: string,
	hostId: number,
	options?: CommandRunOptions,
): Promise<CommandRunResult<T>> {
	// Composer global: seguro fuera de setup (patrón queries/commands.ts)
	const { t } = i18n.global

	const row = await db
		.select()
		.from(commandsTable)
		.where(and(eq(commandsTable.key, commandKey), isNull(commandsTable.deleted_at)))
		.limit(1)
		.then(data => data[0])
		.catch(() => undefined)

	if (!row) {
		throw new Error(t('utils.commands.errors.not_found', { key: commandKey }))
	}

	if (!row.enabled) {
		throw new Error(t('utils.commands.errors.disabled', { key: commandKey }))
	}

	const definition: CommandDefinition = {
		id: row.key,
		name: row.name,
		command: row.command,
		parser: row.parser,
		inputs: row.inputs,
		timeout_secs: row.timeout,
	}

	return runCustomCommand<T>(definition, hostId, options)
}

/**
 * Ejecuta un comando ad-hoc (sin pasar por la BD) en un servidor remoto.
 * Se usa para probar un comando aún no guardado (p.ej. desde el formulario).
 */
export function runCustomCommand<T = unknown>(
	definition: CommandDefinition,
	hostId: number,
	options?: CommandRunOptions,
): Promise<CommandRunResult<T>> {
	return executeCommand<T>(definition, hostId, options)
}

async function executeCommand<T>(
	definition: CommandDefinition,
	hostId: number,
	options?: CommandRunOptions,
): Promise<CommandRunResult<T>> {
	const { t } = i18n.global
	const globalScope = await loadGlobalScopeForExecution()
	const secrets = collectSecretValues({ global: globalScope })
	const fields = definition.inputs ?? []
	const { values: defaults, issues } = resolveInputDefaults(fields, globalScope)

	if (issues.length > 0) {
		const issue = issues[0]!

		throw new Error(redactSecrets(t(issue.messageKey, issue.messageParams), secrets))
	}

	const params: InputValues = {}

	for (const field of fields) {
		const explicit = options?.params?.[field.key]
		const value = explicit === undefined || explicit === null ? defaults[field.key] : explicit
		const coercion = coerceInputValue(field, value)

		if (coercion.status === 'invalid') {
			throw new Error(
				redactSecrets(
					t('utils.inputs.errors.value_invalid', { label: field.label, type: field.type }),
					secrets,
				),
			)
		}

		// Un campo declarado siempre existe en `params`; si está vacío se
		// interpola como cadena vacía (o `false` en los booleanos).
		params[field.key] = coercion.status === 'ok' ? coercion.value : field.type === 'boolean' ? false : ''
	}

	const valueIssues = validateInputValues(fields, params)
	const firstIssue = valueIssues[0]

	if (firstIssue) {
		if (firstIssue.code === 'required') {
			const keys = valueIssues
				.filter(issue => issue.code === 'required')
				.map(issue => issue.messageParams.label)
				.join(', ')

			throw new Error(redactSecrets(t('utils.commands.errors.missing_params', { keys }), secrets))
		}

		throw new Error(redactSecrets(t(firstIssue.messageKey, firstIssue.messageParams), secrets))
	}

	const roots = { global: globalScope, params }

	let command: string
	let workingDir: string | undefined

	try {
		command = interpolateString(definition.command, roots, { maskSecrets: false })
		workingDir = options?.working_dir
			? interpolateString(options.working_dir, roots, { maskSecrets: false })
			: options?.working_dir
	} catch (error) {
		if (error instanceof InterpolationError) {
			throw new Error(redactSecrets(t(error.messageKey, error.messageParams), secrets))
		}

		throw error
	}

	const channel = new Channel<RemoteConsoleEvent>()
	channel.onmessage = () => {}

	const input = {
		host_id: hostId,
		command,
		working_dir: workingDir ?? null,
		timeout_secs: options?.timeout_secs ?? definition.timeout_secs ?? null,
		ssh_reconnect_attempts: options?.ssh_reconnect_attempts ?? null,
	}

	const response = await invoke<CommandResponse<RemoteCommandResult>>('ssh_execute_command', {
		input,
		channel,
	})

	if (!response.success || !response.data) {
		throw new Error(response.message_key)
	}

	const { exit_code, output, duration_seconds } = response.data

	if (exit_code > 0) {
		throw new Error(redactSecrets(output, secrets))
	}

	const parsed = parseOutput<T>(output, definition.parser)

	return {
		exit_code,
		raw_output: output,
		parsed,
		duration_seconds,
	}
}
