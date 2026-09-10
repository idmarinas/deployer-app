import { Stronghold } from '@tauri-apps/plugin-stronghold'
import { invoke } from '@tauri-apps/api/core'

// ====================================================================
// Cripto con Stronghold (claves versionadas, estilo Symfony)
//
// El vault se gestiona íntegramente desde el frontend con el plugin
// @tauri-apps/plugin-stronghold (única autoridad de escritura). Las
// claves AES se guardan como:
//   encrypt:{table}.{col}:{version}  → 32 bytes (clave AES-256-GCM)
//   encrypt:{table}.{col}:current    → 8 bytes big-endian (versión actual)
//
// El cifrado/descifrado del contenido se hace con Web Crypto (AES-GCM),
// porque Stronghold no provee AES sobre datos externos.
//
// Rust SOLO lee el vault (sin escribir) para descifrar credenciales SSH,
// de modo que no hay contención entre ambos accesos.
//
// Valor en SQLite: ENC:{version}:<base64(nonce12+cipher)>
// (un valor ENC:<base64> sin versión se trata como versión 0)
// ====================================================================

const ENC_PREFIX = 'ENC:'
const CURRENT_VERSION_SUFFIX = ':current'
const CLIENT_NAME = 'encrypt-keys'

let strongholdPromise: Promise<Stronghold> | null = null
let clientPromise: Promise<import('@tauri-apps/plugin-stronghold').Client> | null = null
const keyCache = new Map<string, CryptoKey>()

/**
 * Genera el scope de cifrado con la tabla incluida: `encrypt:{table}.{field}`.
 * Incluir la tabla evita compartir clave AES entre tablas que tengan columnas
 * con el mismo nombre.
 */
export function encryptScope(table: string, field: string): string {
	return `encrypt:${table}.${field}`
}

/**
 * Estado del vault de Stronghold reportado por el backend (diagnóstico).
 */
export interface VaultHealthReport {
	vault_file_exists: boolean
	salt_file_exists: boolean
	snapshot_loaded: boolean
	client_exists: boolean
	keys_found: string[]
	expected_scopes: string[]
	missing_scopes: string[]
}

/**
 * Solicita al backend un diagnóstico del vault de Stronghold.
 * Permite detectar si el vault está vacío, corrupto o sin inicializar.
 */
export async function checkVaultHealth(): Promise<VaultHealthReport> {
	return invoke<VaultHealthReport>('check_vault_health')
}

async function getStronghold(): Promise<Stronghold> {
	if (!strongholdPromise) {
		strongholdPromise = (async () => {
			const vaultPath = await invoke<string>('get_vault_path')
			const password = await invoke<string>('get_vault_password')
			return await Stronghold.load(vaultPath, password)
		})()
	}
	return strongholdPromise
}

async function getStore(): Promise<import('@tauri-apps/plugin-stronghold').Store> {
	if (!clientPromise) {
		clientPromise = (async () => {
			const stronghold = await getStronghold()
			try {
				return await stronghold.loadClient(CLIENT_NAME)
			} catch {
				return await stronghold.createClient(CLIENT_NAME)
			}
		})()
	}
	return (await clientPromise).getStore()
}

function storeKey(scope: string, version: number): string {
	return `${scope}:${version}`
}

function currentKey(scope: string): string {
	return `${scope}${CURRENT_VERSION_SUFFIX}`
}

function bytesToInt(bytes: Uint8Array): number {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	return Number(view.getBigInt64(0, false))
}

function intToBytes(n: number): Uint8Array {
	const arr = new Uint8Array(8)
	new DataView(arr.buffer).setBigInt64(0, BigInt(n), false)
	return arr
}

/**
 * Obtiene (o crea en v0, migrando del formato legado) la versión actual
 * de un scope. Guarda las claves en el store de Stronghold.
 */
async function ensureCurrentVersion(scope: string): Promise<number> {
	const store = await getStore()

	const raw = await store.get(currentKey(scope))
	if (raw && raw.byteLength === 8) {
		return bytesToInt(raw)
	}

	// No hay versión actual → migrar de formato legado o crear v0.
	const version = 0
	const legacy = await store.get(scope)

	if (legacy && legacy.byteLength === 32) {
		await store.insert(storeKey(scope, version), Array.from(legacy))
		await store.remove(scope)
	} else {
		await store.insert(storeKey(scope, version), Array.from(crypto.getRandomValues(new Uint8Array(32))))
	}

	await store.insert(currentKey(scope), Array.from(intToBytes(version)))
	const stronghold = await getStronghold()
	await stronghold.save()

	return version
}

/**
 * Obtiene la versión actual de cifrado para un scope.
 */
export async function getCurrentVersion(scope: string): Promise<number> {
	return ensureCurrentVersion(scope)
}

/**
 * Obtiene (o crea) la CryptoKey AES-256-GCM de una versión concreta.
 * Si `version` es undefined, usa la versión actual.
 */
async function getCryptoKey(scope: string, version?: number): Promise<{ key: CryptoKey; version: number }> {
	const v = version ?? (await ensureCurrentVersion(scope))

	const cacheKey = `${scope}:${v}`
	const cached = keyCache.get(cacheKey)
	if (cached) return { key: cached, version: v }

	const store = await getStore()
	const rawKey = await store.get(storeKey(scope, v))

	let keyBytes: Uint8Array
	if (rawKey && rawKey.byteLength === 32) {
		keyBytes = rawKey
	} else {
		keyBytes = crypto.getRandomValues(new Uint8Array(32))
		await store.insert(storeKey(scope, v), Array.from(keyBytes))
		const stronghold = await getStronghold()
		await stronghold.save()
	}

	const keyBuffer = keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer
	const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM', length: 256 }, false, [
		'encrypt',
		'decrypt',
	])

	keyCache.set(cacheKey, cryptoKey)
	return { key: cryptoKey, version: v }
}

function toBase64(bytes: Uint8Array): string {
	let binary = ''
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]!)
	}
	return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
	const binary = atob(b64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes
}

/**
 * Separa la versión de un valor cifrado.
 * Formato: `ENC:{version}:<base64>`. `ENC:<base64>` sin versión → versión 0.
 */
export function splitCiphertextVersion(ciphertext: string): { version: number; payload: string } {
	if (!ciphertext.startsWith(ENC_PREFIX)) return { version: 0, payload: ciphertext }

	const rest = ciphertext.slice(ENC_PREFIX.length)
	const sep = rest.indexOf(':')
	if (sep > 0) {
		const parsed = Number(rest.slice(0, sep))
		if (Number.isInteger(parsed) && parsed >= 0) {
			return { version: parsed, payload: rest.slice(sep + 1) }
		}
	}
	return { version: 0, payload: rest }
}

/**
 * Cifra un texto plano con AES-256-GCM usando la versión actual de la clave.
 * Resultado: `ENC:{version}:<base64(nonce_12_bytes + ciphertext)>`.
 * Si el valor ya está cifrado, lo devuelve tal cual (no re-cifra).
 */
export async function encrypt(scope: string, plaintext: string): Promise<string> {
	if (plaintext.startsWith(ENC_PREFIX)) return plaintext

	const { key, version } = await getCryptoKey(scope)
	const iv = crypto.getRandomValues(new Uint8Array(12))
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))

	const combined = new Uint8Array(12 + ciphertext.byteLength)
	combined.set(iv, 0)
	combined.set(new Uint8Array(ciphertext), 12)

	return `${ENC_PREFIX}${version}:${toBase64(combined)}`
}

/**
 * Descifra un valor cifrado usando la clave de la versión con la que fue
 * cifrado (las versiones antiguas se conservan). Si no tiene prefijo
 * `ENC:`, se devuelve tal cual.
 */
export async function decrypt(scope: string, ciphertext: string): Promise<string> {
	if (!ciphertext.startsWith(ENC_PREFIX)) return ciphertext

	const { version, payload } = splitCiphertextVersion(ciphertext)
	const { key } = await getCryptoKey(scope, version)

	const combined = fromBase64(payload)
	if (combined.length < 12) {
		throw new Error('Datos cifrados corruptos: longitud insuficiente')
	}

	const iv = combined.slice(0, 12)
	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined.slice(12))

	return new TextDecoder().decode(plaintext)
}

/**
 * Rota la clave AES de un scope.
 * Crea la clave `current+1` y actualiza el índice `current`, conservando
 * la clave anterior (los valores cifrados con versiones viejas siguen
 * descifrándose). Devuelve la nueva versión y los bytes de la clave.
 */
export async function rotateKey(scope: string): Promise<{ version: number; keyBytes: Uint8Array }> {
	const current = await ensureCurrentVersion(scope)
	const newVersion = current + 1
	const newKey = crypto.getRandomValues(new Uint8Array(32))

	const store = await getStore()
	await store.insert(storeKey(scope, newVersion), Array.from(newKey))
	await store.insert(currentKey(scope), Array.from(intToBytes(newVersion)))
	const stronghold = await getStronghold()
	await stronghold.save()

	const keyBuffer = newKey.buffer.slice(newKey.byteOffset, newKey.byteOffset + newKey.byteLength) as ArrayBuffer
	const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM', length: 256 }, false, [
		'encrypt',
		'decrypt',
	])
	keyCache.set(`${scope}:${newVersion}`, cryptoKey)

	return { version: newVersion, keyBytes: newKey }
}

/**
 * Provee la lista de campos cifrados (scope y etiqueta) para la UI.
 */
export const ENCRYPTED_FIELDS = [
	{ scope: encryptScope('deployer_hosts', 'password'), label: 'deployer_hosts.password', table: 'deployer_hosts', field: 'password' },
	{ scope: encryptScope('deployer_passkeys', 'key_content'), label: 'deployer_passkeys.key_content', table: 'deployer_passkeys', field: 'key_content' },
	{ scope: encryptScope('deployer_passkeys', 'passphrase'), label: 'deployer_passkeys.passphrase', table: 'deployer_passkeys', field: 'passphrase' },
] as const

/**
 * Purga las versiones antiguas de un scope que ya no se usan en ningún valor
 * y que aún existen en el store. Solo cuenta las que se purgan de verdad.
 */
async function purgeUnusedVersions(scope: string, currentVersion: number, used: [string, number][]): Promise<string[]> {
	const purged: string[] = []
	const store = await getStore()
	for (let version = 1; version < currentVersion; version++) {
		const stillUsed = used.some(([s, v]) => s === scope && v === version)
		if (!stillUsed) {
			const existing = await store.get(storeKey(scope, version))
			if (existing) {
				await store.remove(storeKey(scope, version))
				purged.push(`${scope} (v${version})`)
			}
		}
	}
	// solo guardar si realmente se quitaron claves
	if (purged.length > 0) {
		const stronghold = await getStronghold()
		await stronghold.save()
	}
	return purged
}

interface QueryRawResponse {
	success: boolean
	data: { columns: string[]; rows: unknown[][] } | null
}

interface ScanResult {
	reencrypted: number
	purged_versions: string[]
	versions_in_use: number
}

/**
 * Recifra con la versión actual todos los valores de los campos dados y purga
 * las versiones antiguas sin uso de sus scopes.
 */
async function reencryptFields(fields: readonly (typeof ENCRYPTED_FIELDS)[number][]): Promise<ScanResult> {
	let reencrypted = 0
	const used: [string, number][] = []
	const updates: { field: (typeof ENCRYPTED_FIELDS)[number]; pk: unknown; encrypted: string }[] = []

	for (const field of fields) {
		const currentVersion = await ensureCurrentVersion(field.scope)
		const selectSql = `SELECT "id", "${field.field}" FROM "${field.table}"`

		const response = await invoke<QueryRawResponse>('query_raw', {
			sql: selectSql,
			params: [],
		})
		if (!response.success || !response.data) continue

		const rows = response.data.rows

		for (const row of rows) {
			const pk = row[0]
			const value = typeof row[1] === 'string' ? row[1] : null
			if (!value || !value.startsWith(ENC_PREFIX)) continue

			const { version } = splitCiphertextVersion(value)
			used.push([field.scope, version])

			if (version !== currentVersion) {
				const currentKey = await getCryptoKey(field.scope, currentVersion)
				const plaintext = await decrypt(field.scope, value)

				if (plaintext.startsWith(ENC_PREFIX)) {
					// no se pudo descifrar por falta de clave antigua
					continue
				}

				const iv = crypto.getRandomValues(new Uint8Array(12))
				const ciphertext = await crypto.subtle.encrypt(
					{ name: 'AES-GCM', iv },
					currentKey.key,
					new TextEncoder().encode(plaintext),
				)
				const combined = new Uint8Array(12 + ciphertext.byteLength)
				combined.set(iv, 0)
				combined.set(new Uint8Array(ciphertext), 12)

				updates.push({
					field,
					pk,
					encrypted: `${ENC_PREFIX}${currentVersion}:${toBase64(combined)}`,
				})
			}
		}
	}

	// Aplicar re-cifrado (escritura directa — el proxy de db.ts re-cifraría, así que
	// usamos query_raw directamente con el valor ya cifrado).
	for (const u of updates) {
		const updateSql = `UPDATE "${u.field.table}" SET "${u.field.field}" = ? WHERE "id" = ?`
		const response = await invoke<QueryRawResponse>('query_raw', {
			sql: updateSql,
			params: [u.encrypted, u.pk],
		})
		if (response.success) reencrypted++
	}

	// Purgar versiones antiguas sin uso de todos los scopes procesados.
	const purged_versions: string[] = []
	for (const field of fields) {
		const currentVersion = await ensureCurrentVersion(field.scope)
		purged_versions.push(...(await purgeUnusedVersions(field.scope, currentVersion, used)))
	}

	keyCache.clear()

	return { reencrypted, purged_versions, versions_in_use: used.filter(([, v]) => v > 0).length }
}

/**
 * Escanea TODOS los valores cifrados de todos los scopes, re-cifra los que
 * usan una versión anterior a la actual y purga las claves viejas sin uso.
 */
export async function scanAndReencrypt(): Promise<ScanResult> {
	return reencryptFields(ENCRYPTED_FIELDS)
}

/**
 * Recifra todos los valores de un scope con su versión actual y purga las
 * versiones antiguas sin uso. Se usa tras rotar la clave, de modo que los
 * valores pasan de inmediato a la clave nueva.
 */
export async function reencryptScope(scope: string): Promise<ScanResult> {
	const fields = ENCRYPTED_FIELDS.filter((f) => f.scope === scope)
	return reencryptFields(fields)
}
