import { invoke } from '@tauri-apps/api/core'
import { Stronghold } from '@tauri-apps/plugin-stronghold'

// ====================================================================
// Gestión del vault Stronghold en el frontend
// Claves versionadas (estilo Symfony): cada campo guarda sus claves como
// `encrypt:{table}.{col}:{version}` y un índice `encrypt:{table}.{col}:current`.
// Valor cifrado en SQLite: `ENC:{version}:<base64(nonce12+cipher)>`.
// ====================================================================

const CLIENT_NAME = 'encrypt-keys'
const ENC_PREFIX = 'ENC:'
const CURRENT_VERSION_SUFFIX = ':current'

/**
 * Genera el scope de cifrado con la tabla incluida: `encrypt:{table}.{field}`.
 * Incluir la tabla evita compartir clave AES entre tablas que tengan columnas
 * con el mismo nombre (p.ej. `password` en varias tablas).
 */
export function encryptScope(table: string, field: string): string {
	return `encrypt:${table}.${field}`
}

let strongholdInstance: Stronghold | null = null
let strongholdPromise: Promise<Stronghold> | null = null
let clientPromise: Promise<import('@tauri-apps/plugin-stronghold').Client> | null = null

const keyCache = new Map<string, CryptoKey>()

async function getStronghold(): Promise<Stronghold> {
	if (strongholdInstance) return strongholdInstance

	if (!strongholdPromise) {
		strongholdPromise = (async () => {
			const path = await invoke<string>('get_vault_path')
			const password = await invoke<string>('get_vault_password')
			const instance = await Stronghold.load(path, password)
			strongholdInstance = instance
			return instance
		})()
	}

	return strongholdPromise
}

async function getClient(): Promise<import('@tauri-apps/plugin-stronghold').Client> {
	if (clientPromise) return clientPromise

	clientPromise = (async () => {
		const stronghold = await getStronghold()
		try {
			return await stronghold.loadClient(CLIENT_NAME)
		} catch {
			return await stronghold.createClient(CLIENT_NAME)
		}
	})()

	return clientPromise
}

async function getStore(): Promise<import('@tauri-apps/plugin-stronghold').Store> {
	const client = await getClient()
	return client.getStore()
}

function storeKey(scope: string, version: number): string {
	return `${scope}:${version}`
}

function currentKey(scope: string): string {
	return `${scope}${CURRENT_VERSION_SUFFIX}`
}

/**
 * Obtiene (o crea si no existe, migrando del formato legado) la versión actual
 * de cifrado para un scope. `scope` es el identificador base
 * (`encrypt:deployer_hosts.password`).
 *
 * Migración: si no existe `encrypt:{table}.{col}:current`, se busca la clave
 * legada `encrypt:{table}.{col}` (formato sin versionar) y se migra a la
 * versión 0; si no existe ninguna, se crea una clave nueva en la versión 0.
 */
export async function getCurrentVersion(scope: string): Promise<number> {
	const store = await getStore()
	const raw = (await store.get(currentKey(scope))) as Uint8Array | null

	if (raw && raw.byteLength === 8) {
		return bytesToInt(raw)
	}

	// No hay versión actual → migrar o inicializar en v0.
	const version = 0
	const legacy = (await store.get(scope)) as Uint8Array | null

	if (legacy && legacy.byteLength === 32) {
		await store.insert(storeKey(scope, version), Array.from(legacy))
		await store.remove(scope)
	} else {
		const keyBytes = crypto.getRandomValues(new Uint8Array(32))
		await store.insert(storeKey(scope, version), Array.from(keyBytes))
	}

	await store.insert(currentKey(scope), Array.from(intToBytes(version)))
	await (await getStronghold()).save()

	return version
}

/**
 * Obtiene (o crea si no existe) la CryptoKey AES-256-GCM para la versión
 * indicada de un scope. Si no se pasa versión, usa la versión actual.
 */
async function getCryptoKey(scope: string, version?: number): Promise<{ key: CryptoKey; version: number }> {
	const v = version ?? (await getCurrentVersion(scope))
	const cacheKey = `${scope}:${v}`
	const cached = keyCache.get(cacheKey)
	if (cached) return { key: cached, version: v }

	const store = await getStore()
	const rawKey = (await store.get(storeKey(scope, v))) as Uint8Array | null

	let keyBytes: Uint8Array

	if (rawKey && rawKey.byteLength === 32) {
		keyBytes = rawKey
	} else {
		keyBytes = crypto.getRandomValues(new Uint8Array(32))
		await store.insert(storeKey(scope, v), Array.from(keyBytes))
		await (await getStronghold()).save()
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

function intToBytes(n: number): Uint8Array {
	const arr = new Uint8Array(8)
	const view = new DataView(arr.buffer)
	view.setBigInt64(0, BigInt(n), false)
	return arr
}

function bytesToInt(bytes: Uint8Array): number {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	return Number(view.getBigInt64(0, false))
}

/**
 * Separa la versión de un valor cifrado.
 * Formato: `ENC:{version}:<base64>`. `ENC:<base64>` sin versión → versión 0.
 */
function splitCiphertextVersion(ciphertext: string): { version: number; payload: string } {
	if (!ciphertext.startsWith(ENC_PREFIX)) return { version: 0, payload: ciphertext }

	const rest = ciphertext.slice(ENC_PREFIX.length)
	const sep = rest.indexOf(':')
	if (sep > 0) {
		const versionStr = rest.slice(0, sep)
		const parsed = Number(versionStr)
		if (Number.isInteger(parsed) && parsed >= 0) {
			return { version: parsed, payload: rest.slice(sep + 1) }
		}
	}
	return { version: 0, payload: rest }
}

/**
 * Cifra un texto plano con AES-256-GCM usando la versión actual de la clave.
 *
 * Formato resultado: `ENC:{version}:<base64(nonce_12_bytes + ciphertext)>`
 * Si el valor ya está cifrado, lo devuelve tal cual (no re-cifra).
 */
export async function encrypt(scope: string, plaintext: string): Promise<string> {
	if (plaintext.startsWith(ENC_PREFIX)) return plaintext

	const { key, version } = await getCryptoKey(scope)
	const iv = crypto.getRandomValues(new Uint8Array(12))
	const encoded = new TextEncoder().encode(plaintext)
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

	const combined = new Uint8Array(12 + ciphertext.byteLength)
	combined.set(iv, 0)
	combined.set(new Uint8Array(ciphertext), 12)

	return `${ENC_PREFIX}${version}:${toBase64(combined)}`
}

/**
 * Descifra un valor cifrado con AES-256-GCM usando la clave de la versión
 * con la que fue cifrado (las versiones antiguas se conservan, por lo que
 * los valores viejos siguen descifrándose correctamente).
 *
 * Si el valor no tiene el prefijo `ENC:`, se devuelve tal cual.
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
	const data = combined.slice(12)
	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)

	return new TextDecoder().decode(plaintext)
}

/**
 * Rota la clave AES de un scope.
 *
 * Style-like: crea la clave de la versión `current+1` y actualiza el índice
 * `current`; las claves anteriores se conservan, de modo que los valores ya
 * cifrados con versiones viejas siguen descifrándose. Los nuevos cifrados
 * (INSERT/UPDATE) usarán automáticamente la versión nueva.
 */
export async function rotateKey(scope: string): Promise<{ version: number; keyBytes: Uint8Array }> {
	const newKey = await invoke<number[]>('rotate_encryption_key', { scope })
	const keyBytes = Uint8Array.from(newKey)
	const version = await getCurrentVersion(scope)
	await resetKeyVersionCache(scope, version, keyBytes)
	return { version, keyBytes }
}

async function resetKeyVersionCache(scope: string, version: number, keyBytes: Uint8Array): Promise<void> {
	const keyBuffer = keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer
	const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM', length: 256 }, false, [
		'encrypt',
		'decrypt',
	])
	keyCache.set(`${scope}:${version}`, cryptoKey)
}

/**
 * Provee la lista de campos cifrados (scope y una etiqueta) para la UI.
 * El scope incluye la tabla para evitar compartir clave entre tablas
 * que tengan columnas con el mismo nombre: `encrypt:{table}.{field}`.
 */
export const ENCRYPTED_FIELDS = [
	{ scope: encryptScope('deployer_hosts', 'password'), label: 'deployer_hosts.password' },
	{ scope: encryptScope('deployer_passkeys', 'key_content'), label: 'deployer_passkeys.key_content' },
	{ scope: encryptScope('deployer_passkeys', 'passphrase'), label: 'deployer_passkeys.passphrase' },
] as const

/**
 * Escanea todos los valores cifrados en SQLite, re-cifra los que usan una
 * versión anterior y purga las claves viejas que ya no estén en uso.
 * Lo ejecuta el backend (Rust). Devuelve el resultado del escaneo.
 */
export async function scanAndReencrypt(): Promise<{
	reencrypted: number
	purged_versions: string[]
	versions_in_use: number
}> {
	return invoke('scan_and_reencrypt')
}
