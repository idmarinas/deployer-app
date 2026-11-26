import { and, desc, eq, inArray, isNull, notInArray } from 'drizzle-orm'
import { defineStore } from 'pinia'

import { db } from '@/drizzle/drizzle'
import { fileManagerListings } from '@/drizzle/entities/fileManagerListings'
import { fileManagerPreferences } from '@/drizzle/entities/fileManagerPreferences'
import { fileManagerTransfers } from '@/drizzle/entities/fileManagerTransfers'
import { hosts } from '@/drizzle/entities/hosts'
import type {
	DownloadedMark,
	FileManagerListingSnapshot,
	FileManagerTransferSnapshot,
} from '@/types/fileManager'

/** Prefijo de las marcas dentro de la tabla de preferencias. */
const MARK_PREFIX = 'mark:'

function parseValue<T>(value: string | null): T | null {
	if (value === null) return null
	try {
		return JSON.parse(value) as T
	} catch {
		return null
	}
}

/**
 * Único punto de acceso a SQLite del gestor de archivos. Los stores de dominio
 * no hablan con `db` directamente; Rust solo ejecuta el SQL generado por Drizzle.
 */
export const useFileManagerPersistence = defineStore('fileManagerPersistence', () => {
	// -------------------------------------------------------------------------
	// Preferencias
	// -------------------------------------------------------------------------

	async function getPreference<T>(key: string): Promise<T | null> {
		const rows = await db
			.select({ value: fileManagerPreferences.value })
			.from(fileManagerPreferences)
			.where(eq(fileManagerPreferences.key, key))
			.limit(1)
		return parseValue<T>(rows[0]?.value ?? null)
	}

	async function getAllPreferences(): Promise<Record<string, unknown>> {
		const rows = await db
			.select({ key: fileManagerPreferences.key, value: fileManagerPreferences.value })
			.from(fileManagerPreferences)
		const result: Record<string, unknown> = {}
		for (const row of rows) {
			const value = parseValue<unknown>(row.value)
			if (value !== null) result[row.key] = value
		}
		return result
	}

	async function setPreference(key: string, value: unknown): Promise<void> {
		const serialized = JSON.stringify(value ?? null)
		const now = new Date().toISOString()
		await db
			.insert(fileManagerPreferences)
			.values({ key, value: serialized, created_at: now, updated_at: now })
			.onConflictDoUpdate({
				target: fileManagerPreferences.key,
				set: { value: serialized, updated_at: now },
			})
	}

	async function removePreference(key: string): Promise<void> {
		await db.delete(fileManagerPreferences).where(eq(fileManagerPreferences.key, key))
	}

	async function getEnabledHostIds(): Promise<number[]> {
		const rows = await db
			.select({ id: hosts.id })
			.from(hosts)
			.where(and(eq(hosts.enabled, true), isNull(hosts.deleted_at)))
		return rows.map(row => row.id)
	}

	/** Directorio base del host; `null` si no existe o no lo ha definido. */
	async function getHostDefaultRemotePath(hostId: number): Promise<string | null> {
		const rows = await db
			.select({ path: hosts.default_remote_path })
			.from(hosts)
			.where(and(eq(hosts.id, hostId), isNull(hosts.deleted_at)))
			.limit(1)
		return rows[0]?.path ?? null
	}

	// -------------------------------------------------------------------------
	// Marcas «descargado» (guardadas como preferencias con prefijo propio)
	// -------------------------------------------------------------------------

	async function getMarks(): Promise<Record<string, DownloadedMark>> {
		const all = await getAllPreferences()
		const marks: Record<string, DownloadedMark> = {}
		for (const [key, value] of Object.entries(all)) {
			if (!key.startsWith(MARK_PREFIX)) continue
			marks[key.slice(MARK_PREFIX.length)] = value as DownloadedMark
		}
		return marks
	}

	async function saveMark(key: string, mark: DownloadedMark): Promise<void> {
		await setPreference(`${MARK_PREFIX}${key}`, mark)
	}

	async function deleteMark(key: string): Promise<void> {
		await removePreference(`${MARK_PREFIX}${key}`)
	}

	async function deleteAllMarks(): Promise<void> {
		const all = await getAllPreferences()
		await Promise.all(
			Object.keys(all)
				.filter(key => key.startsWith(MARK_PREFIX))
				.map(key => removePreference(key)),
		)
	}

	// -------------------------------------------------------------------------
	// Listados
	// -------------------------------------------------------------------------

	async function getListing(scopeKey: string): Promise<FileManagerListingSnapshot | null> {
		const rows = await db
			.select({ snapshot: fileManagerListings.snapshot })
			.from(fileManagerListings)
			.where(eq(fileManagerListings.scope_key, scopeKey))
			.limit(1)
		return parseValue<FileManagerListingSnapshot>(rows[0]?.snapshot ?? null)
	}

	async function saveListing(
		scopeKey: string,
		origin: 'local' | 'remote',
		hostId: number | undefined,
		path: string,
		snapshot: FileManagerListingSnapshot,
	): Promise<void> {
		const now = new Date().toISOString()
		const serialized = JSON.stringify(snapshot)
		await db
			.insert(fileManagerListings)
			.values({
				scope_key: scopeKey,
				origin,
				host_id: hostId ?? null,
				path,
				snapshot: serialized,
				truncated: snapshot.truncated,
				created_at: now,
				updated_at: now,
			})
			.onConflictDoUpdate({
				target: fileManagerListings.scope_key,
				set: { snapshot: serialized, path, truncated: snapshot.truncated, updated_at: now },
			})
	}

	async function deleteListing(scopeKey: string): Promise<void> {
		await db.delete(fileManagerListings).where(eq(fileManagerListings.scope_key, scopeKey))
	}

	async function deleteListingsForHost(hostId: number): Promise<void> {
		await db.delete(fileManagerListings).where(eq(fileManagerListings.host_id, hostId))
	}

	/** Purgas los listados remotos de hosts que ya no están habilitados. */
	async function purgeListingsExceptHosts(hostIds: number[]): Promise<void> {
		if (!hostIds.length) {
			await db.delete(fileManagerListings).where(eq(fileManagerListings.origin, 'remote'))
			return
		}
		await db
			.delete(fileManagerListings)
			.where(
				and(eq(fileManagerListings.origin, 'remote'), notInArray(fileManagerListings.host_id, hostIds)),
			)
	}

	// -------------------------------------------------------------------------
	// Cola de transferencias
	// -------------------------------------------------------------------------

	async function getTransfers(): Promise<FileManagerTransferSnapshot[]> {
		const rows = await db
			.select({ snapshot: fileManagerTransfers.snapshot })
			.from(fileManagerTransfers)
			.orderBy(desc(fileManagerTransfers.created_at), desc(fileManagerTransfers.job_key))
		return rows
			.map(row => parseValue<FileManagerTransferSnapshot>(row.snapshot))
			.filter((row): row is FileManagerTransferSnapshot => row !== null)
	}

	async function saveTransfer(snapshot: FileManagerTransferSnapshot): Promise<void> {
		const now = new Date().toISOString()
		const serialized = JSON.stringify(snapshot)
		await db
			.insert(fileManagerTransfers)
			.values({
				job_key: snapshot.key,
				host_id: snapshot.hostId,
				direction: snapshot.operation === 'upload' ? 'upload' : 'download',
				source_path: snapshot.sourcePath ?? null,
				target_path: snapshot.targetPath ?? null,
				label: snapshot.label ?? null,
				status: snapshot.status,
				retry_of: snapshot.retryOf,
				snapshot: serialized,
				created_at: snapshot.createdAt,
				updated_at: now,
			})
			.onConflictDoUpdate({
				target: fileManagerTransfers.job_key,
				set: {
					source_path: snapshot.sourcePath ?? null,
					target_path: snapshot.targetPath ?? null,
					label: snapshot.label ?? null,
					status: snapshot.status,
					retry_of: snapshot.retryOf,
					snapshot: serialized,
					updated_at: now,
				},
			})
	}

	async function deleteTransfers(keys: string[]): Promise<void> {
		if (!keys.length) return
		await db.delete(fileManagerTransfers).where(inArray(fileManagerTransfers.job_key, keys))
	}

	async function deleteAllTransfers(): Promise<void> {
		await db.delete(fileManagerTransfers)
	}

	return {
		getPreference,
		getAllPreferences,
		setPreference,
		removePreference,
		getEnabledHostIds,
		getHostDefaultRemotePath,
		getMarks,
		saveMark,
		deleteMark,
		deleteAllMarks,
		getListing,
		saveListing,
		deleteListing,
		deleteListingsForHost,
		purgeListingsExceptHosts,
		getTransfers,
		saveTransfer,
		deleteTransfers,
		deleteAllTransfers,
	}
})
