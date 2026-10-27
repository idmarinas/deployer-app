import { db } from '@/drizzle/drizzle'
import { commands as commandsTable } from '@/drizzle/schema'
import type { CommandResponse, RemoteCommandResult, RemoteConsoleEvent } from '@/types/tauri-types'
import { Channel, invoke } from '@tauri-apps/api/core'
import { and, eq, isNull } from 'drizzle-orm'
import { parseOutput } from './parsers'
import type { CommandDefinition, CommandRunResult } from './types'

/**
 * Ejecuta un comando almacenado en la BD (`deployer_commands`) en un servidor
 * remoto por su `key`.
 *
 * La BD es la fuente única de la definición (command, parser y timeout); solo
 * se ejecutan comandos con `enabled = 1` y sin `deleted_at`.
 */
export async function runCommand<T = unknown>(
	commandKey: string,
	hostId: number,
	options?: { working_dir?: string; timeout_secs?: number },
): Promise<CommandRunResult<T>> {
	const row = await db
		.select()
		.from(commandsTable)
		.where(and(eq(commandsTable.key, commandKey), isNull(commandsTable.deleted_at)))
		.limit(1)
		.then(data => data[0])
		.catch(() => undefined)

	if (!row) {
		throw new Error(`Comando no encontrado: ${commandKey}`)
	}

	const definition: CommandDefinition = {
		id: row.key,
		name: row.name,
		command: row.command,
		parser: row.parser,
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
	options?: { working_dir?: string; timeout_secs?: number },
): Promise<CommandRunResult<T>> {
	return executeCommand<T>(definition, hostId, options)
}

async function executeCommand<T>(
	definition: CommandDefinition,
	hostId: number,
	options?: { working_dir?: string; timeout_secs?: number },
): Promise<CommandRunResult<T>> {
	const channel = new Channel<RemoteConsoleEvent>()
	channel.onmessage = () => {}

	const input = {
		host_id: hostId,
		command: definition.command,
		working_dir: options?.working_dir ?? null,
		timeout_secs: options?.timeout_secs ?? definition.timeout_secs ?? null,
		ssh_reconnect_attempts: null,
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
		throw new Error(output)
	}

	const parsed = parseOutput<T>(output, definition.parser)

	return {
		exit_code,
		raw_output: output,
		parsed,
		duration_seconds,
	}
}
