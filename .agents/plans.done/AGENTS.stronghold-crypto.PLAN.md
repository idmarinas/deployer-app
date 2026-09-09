# Plan: Reemplazar el sistema de cifrado por Stronghold

## Estado

**En progreso (Ejecutando)** — Fases 1-7 implementadas y verificadas (`cargo check` OK). Pendiente Fase 8 (verificación funcional end-to-end) y UI de rotación de claves.

---

## Objetivo

Sustituir el cifrado actual (clave maestra única AES-256-GCM en el keychain del SO, cifrado en Rust) por **Stronghold** con claves por `tabla.campo`, gestionado desde **JavaScript/Drizzle**. Sin migración de datos (app en desarrollo, sin datos reales).

---

## Resumen

- **Stronghold** almacena claves de cifrado por campo (`encrypt:{table}.{field}`).
- **Keychain del SO** guarda la password del vault de Stronghold (cuenta `stronghold-vault` bajo servicio `deployer-app`).
- El cifrado/descifrado en el **frontend** lo hace el proxy de Drizzle (`db.ts`) usando `@tauri-apps/plugin-stronghold` (JS).
- Los comandos SSH de **Rust** acceden al mismo vault usando un **módulo interno** `crypto/stronghold.rs` que usa `iota-stronghold` directamente (sin comando Tauri).
- Rust deja de cifrar en `query_raw`; solo ejecuta SQL.
- Formato del valor cifrado: `ENC:<base64(nonce12+ciphertext)>` (igual que el actual).

---

## Estado de la instalación

| Elemento | Estado | Archivo |
|---|---|---|
| `tauri-plugin-stronghold = "2"` | ✅ Hecho | `Cargo.toml:39` |
| `@tauri-apps/plugin-stronghold: "~2"` | ✅ Hecho | `package.json:28` |
| `[profile.dev.package.scrypt] opt-level = 3` | ✅ Hecho | `Cargo.toml:13-14` |
| Plugin registrado en lib.rs | ✅ Hecho (con `todo!()`) | `lib.rs:34` |
| `stronghold:default` en capabilities | ✅ Hecho | `capabilities/default.json:13` |
| `rust-argon2` en Cargo.toml | ❌ Pendiente | |
| Password hash function implementada | ❌ Pendiente | `lib.rs:34` |
| `iota-stronghold` en Cargo.toml | ❌ Pendiente | |
| Vault path + client name definidos | ❌ Pendiente | |
| Keychain password del vault | ❌ Pendiente | |

---

## Problema crítico: Rust SSH lee directo de SQLite

Los comandos SSH en Rust **no usan `query_raw`** — abren su propio pool con `sqlx` y hacen `SELECT` directo. Si el frontend cifra con Stronghold, Rust obtiene valores `ENC:` pero no tiene la clave para descifrarlos.

**Solución**: módulo `crypto/stronghold.rs` en Rust que abre el vault de Stronghold directamente (usando `iota-stronghold`) y descifra valores. No es un comando Tauri — es una función interna que los comandos SSH llaman.

---

## Cómo se obtiene la password del vault

Mismo patrón que la clave maestra actual (`keyring.rs`):

```
Keychain del SO:
  Servicio:  deployer-app
  Cuenta:    stronghold-vault    (NUEVA — la anterior era "master-key")
  Valor:     password del vault (texto plano)
```

- **Rust** (`crypto/stronghold.rs`): usa `keyring::Entry::new("deployer-app", "stronghold-vault")` para leer la password, luego `iota_stronghold::Stronghold::new(vault_path, password)`.
- **JS** (`stronghold-crypto.ts`): la password se obtiene vía un comando Tauri `get_vault_password` (o se pasa al frontend al arrancar). Alternativamente, JS puede llamar a `Stronghold.load()` directamente si se le pasa la password.

---

## Archivos a crear

| Archivo | Descripción |
|---|---|
| `src/lib/stronghold-crypto.ts` | Módulo JS: abrir vault con plugin Tauri, gestionar claves por campo, `encrypt(scope, plaintext)`, `decrypt(scope, ciphertext)`, `rotateKey(scope)` |
| `src-tauri/src/crypto/stronghold.rs` | Módulo Rust: abrir vault con `iota-stronghold`, `get_key(scope)`, `rotate_key(scope)`, `decrypt_value(scope, ciphertext)` |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src-tauri/Cargo.toml` | Añadir `rust-argon2 = "2"` + `iota-stronghold = "2"` |
| `src-tauri/src/lib.rs` | Implementar password hash function en el `Builder::new` del plugin |
| `src/lib/db.ts` | Proxy cifra/descifra antes/después de invoke usando Stronghold |
| `src-tauri/src/commands/database/query_raw.rs` | Eliminar cifrado/descifrado/enmascaramiento; solo abrir pool + ejecutar SQL |
| `src-tauri/src/commands/database/helpers.rs` | Eliminar `maybe_decrypt` |
| `src-tauri/src/crypto/mod.rs` | Reemplazar `cipher`/`keyring` por `stronghold` |
| `src-tauri/src/ssh/session.rs` | `decrypt_host_credentials` usa `crypto::stronghold::decrypt_value` en vez de `crypto::decrypt` |
| `src-tauri/src/ssh/connect.rs` | Eliminar `open_crypto_context` → usar `open_pool` |
| `src-tauri/src/commands/passkeys/export_public_key.rs` | Usa `crypto::stronghold::decrypt_value` en vez de `crypto::decrypt` directo |
| `src-tauri/src/helpers.rs` | Eliminar `open_crypto_context`, `get_master_key` |
| `src-tauri/src/commands/projects/files/sync.rs` | Usar `open_pool` en vez de `open_crypto_context` |
| `src-tauri/src/commands/projects/docker/compose/operations.rs` | Usar `open_pool` en vez de `open_crypto_context` |
| `src-tauri/src/lib.rs` | Registrar plugin Stronghold + comando `rotate_encryption_key` |

## Archivos a eliminar

| Archivo | Razón |
|---|---|
| `src-tauri/src/crypto/cipher.rs` | AES pasa a Stronghold (JS + Rust) |
| `src-tauri/src/crypto/keyring.rs` | Reemplazado por `stronghold.rs` (password vault se gestiona en `stronghold.rs`) |

## Archivos sin cambio

| Archivo | Razón |
|---|---|
| `src/lib/schema-types.ts` | `encryptedText` sigue marcando campos sensibles |
| `src/lib/entities/*.ts` | Schema sin cambios |
| `src/lib/relations.ts` | Sin cambios |

---

## Naming de claves en Stronghold

Formato: `encrypt:{table}.{field}` donde `{table}` es el nombre real en SQLite.

| Clave en Stronghold | Campo |
|---|---|
| `encrypt:deployer_hosts.password` | `hosts.password` |
| `encrypt:deployer_passkeys.key_content` | `passkeys.key_content` |
| `encrypt:deployer_passkeys.passphrase` | `passkeys.passphrase` |

---

## Qué usa Stronghold vs qué implementamos nosotros

| Funcionalidad | Quién la hace | Método de Stronghold |
|---|---|---|
| Almacenamiento seguro de claves AES | **Stronghold Store** | `store.insert(key, value, None)` |
| Lectura de claves AES | **Stronghold Store** | `store.get(key)` |
| Rotación de claves | **Stronghold Store** | `store.insert()` sobrescribe la anterior |
| Persistencia a disco | **Stronghold** | `stronghold.save()` |
| Password del vault | **Keychain del SO** | `keyring::Entry` (cuenta `stronghold-vault`) |
| Cifrado AES-256-GCM | **`aes-gcm` crate** | Stronghold AEAD no encaja con SQLite |
| Generación de claves | **`rand` crate** | 32 bytes aleatorios via CSPRNG del SO |

**No usamos** los procedimientos AEAD de Stronghold (`AeadEncrypt`/`AeadDecrypt`) porque operan dentro del vault, no con datos externos (SQLite).

---

## Diseño del módulo Rust `crypto/stronghold.rs`

```rust
// Conceptual — no es código final

use iota_stronghold::Stronghold;
use std::path::PathBuf;

const SERVICE_NAME: &str = "deployer-app";
const VAULT_ACCOUNT: &str = "stronghold-vault";
const CLIENT_NAME: &str = "encrypt-keys";

pub struct StrongholdVault {
    stronghold: Stronghold,
}

impl StrongholdVault {
    /// Abre el vault. Lee la password del keychain del SO.
    pub fn open(vault_path: &PathBuf) -> Result<Self, String> {
        let password = get_vault_password_from_keychain()?;
        let stronghold = Stronghold::new(vault_path, password.into_bytes())
            .map_err(|e| format!("Error al abrir Stronghold: {}", e))?;
        Ok(Self { stronghold })
    }

    /// Obtiene la clave AES para un scope (encrypt:table.field).
    pub fn get_key(&self, scope: &str) -> Result<Vec<u8>, String> {
        let client = self.stronghold.load_client(CLIENT_NAME)
            .or_else(|_| self.stronghold.create_client(CLIENT_NAME))
            .map_err(|e| e.to_string())?;
        let store = client.get_store();
        let key = store.get(scope.as_bytes())
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Clave no encontrada: {}", scope))?;
        Ok(key.to_vec())
    }

    /// Genera una nueva clave AES de 32 bytes y la guarda en el vault.
    /// Si ya existía una clave para ese scope, la sobrescribe (rotación).
    pub fn rotate_key(&self, scope: &str) -> Result<Vec<u8>, String> {
        let new_key = generate_random_key_32()?;
        let client = self.stronghold.load_client(CLIENT_NAME)
            .or_else(|_| self.stronghold.create_client(CLIENT_NAME))
            .map_err(|e| e.to_string())?;
        let store = client.get_store();
        store.insert(scope.as_bytes().to_vec(), new_key.clone(), None)
            .map_err(|e| format!("Error al guardar nueva clave: {}", e))?;
        self.stronghold.save()
            .map_err(|e| format!("Error al persistir vault: {}", e))?;
        Ok(new_key)
    }

    /// Descifra un valor usando la clave del vault.
    pub fn decrypt_value(&self, scope: &str, ciphertext: &str) -> Result<String, String> {
        let key = self.get_key(scope)?;
        // Reutilizar lógica AES-256-GCM de cipher.rs (se mantiene temporalmente)
        cipher::decrypt(ciphertext, &key)
    }
}

fn get_vault_password_from_keychain() -> Result<String, String> {
    let entry = keyring::Entry::new(SERVICE_NAME, VAULT_ACCOUNT)
        .map_err(|e| format!("Error al acceder al keychain: {}", e))?;
    match entry.get_password() {
        Ok(pw) => Ok(pw),
        Err(keyring::Error::NoEntry) => {
            // Primera ejecución: generar password, guardarla en keychain
            let pw = generate_vault_password();
            entry.set_password(&pw)
                .map_err(|e| format!("Error al guardar password del vault: {}", e))?;
            Ok(pw)
        }
        Err(e) => Err(format!("Error al leer password del vault: {}", e)),
    }
}

fn generate_random_key_32() -> Result<Vec<u8>, String> {
    let mut key = vec![0u8; 32];
    rand::rngs::SysRng.try_fill_bytes(&mut key)
        .map_err(|e| format!("Error al generar clave AES: {}", e))?;
    Ok(key)
}
```

---

## Plan de acción por fases

### Fase 1 — Completar configuración de Stronghold
1. ✅ **Añadido** `rust-argon2 = "2"` e `iota_stronghold = "2"` en `Cargo.toml` (+ `[profile.dev.package.rust-argon2] opt-level = 3`). `cargo check` OK, sin conflictos.
2. ✅ **Plugin registrado** en `lib.rs:52-59` usando `Builder::with_argon2(&salt_path)` dentro de `setup()` (requiere `use tauri::Manager` para `.path()`). El salt se almacena en `app_local_data_dir/salt.txt`. `cargo check` OK.
3. Definir constants: vault path (`app_local_data_dir/vault.hold`), client name (`"encrypt-keys"`).
4. ✅ ~~`stronghold:default` en capabilities~~ — ya hecho.

### Fase 2 — Módulo Rust de Stronghold (`src-tauri/src/crypto/stronghold.rs`)
1. ✅ **Creado** `stronghold.rs` con `StrongholdVault::open()`, `get_key()`, `rotate_key()`, `decrypt_value()`.
2. ✅ **Password del vault** desde keychain (cuenta `stronghold-vault`). Primera ejecución: genera password aleatoria.
3. ✅ **Argon2 KDF** con salt en `app_local_data_dir/salt.txt` — mismo algoritmo que el plugin Tauri.
4. ✅ **iota_stronghold** directo: `IotaStronghold::default()` + `load_snapshot` + `commit_with_keyprovider`.
5. ✅ **Comandos Tauri** creados: `get_vault_password`, `get_vault_path`, `rotate_encryption_key` (registrados en `lib.rs`).
6. ✅ `crypto/mod.rs` actualizado para exponer `StrongholdVault` y `get_or_create_vault_password`.
7. ✅ `cargo check` OK (solo warnings de dead_code, esperado).

### Fase 3 — Módulo JS de cripto (`src/lib/stronghold-crypto.ts`)
1. ✅ **Creado** `src/lib/stronghold-crypto.ts` (170 líneas). Web Crypto API (`AES-GCM`), sin dependencias externas.
2. ✅ Inicialización lazy: `getStronghold()` → `Stronghold.load(path, password)`. Password/ruta vía comandos Tauri.
3. ✅ `getOrCreateKey(scope)` — genera CryptoKey AES-256 si no existe en Stronghold Store. Caché `Map<string, CryptoKey>`.
4. ✅ `encrypt(scope, plaintext)` → `ENC:<base64(nonce12+ciphertext)>`.
5. ✅ `decrypt(scope, ciphertext)` → texto plano (sin `ENC:` devuelve tal cual).
6. ✅ `rotateKey(scope)` — invoca `rotate_encryption_key`, actualiza caché.
7. ✅ `vue-tsc --noEmit` OK — sin errores TS nuevos.

### Fase 4 — Proxy Drizzle cifra/descifra (`src/lib/db.ts`) + simplifica `query_raw.rs`
1. ✅ **`db.ts` reescrito** — importa `encrypt`/`decrypt` de `stronghold-crypto`.
2. ✅ **Escrituras**: `stripEncryptedValues` (sentinel/ENC:) + `encryptParams()` cifra params vía Stronghold antes de `invoke`.
3. ✅ **Lecturas**: `decryptRow()` descifra si `_decryptEnabled`, `maskEncryptedFields()` enmascara si no.
4. ✅ **Eliminado** `buildEncryptMask` (ya no se usa — la lógica está en `encryptParams`).
5. ✅ **Se mantiene** `stripEncryptedValues` (necesario para UPDATEs con sentinel/ENC:).
6. ✅ **Se mantiene** `withDecryption`, `detectEncryptedFieldsFromSchema`, `BLANK_VALUE`, `ENC_PREFIX`.
7. ✅ **`query_raw.rs` simplificado** — solo pool + bind + execute + convert. Sin parámetros de cifrado/descifrado (firma compatible, params marcados `_`).
8. ✅ `vue-tsc --noEmit` OK — sin errores nuevos.

### Fase 5 — Actualizar comandos SSH + otros (`open_crypto_context` → `StrongholdVault`)
1. ✅ `ssh/session.rs::decrypt_host_credentials`:
   - Firma cambiada: `master_key: &[u8]` → `vault: &StrongholdVault`.
   - `crypto::decrypt(value, &master_key)` → `vault.decrypt_value(scope, value)`.
   - Scopes usados: `"encrypt:deployer_hosts.password"`, `"encrypt:deployer_passkeys.key_content"`, `"encrypt:deployer_passkeys.passphrase"`.
2. ✅ `ssh/connect.rs::connect_to_host_by_id`:
   - Eliminado `open_crypto_context` → `open_pool` + `StrongholdVault::open()`.
   - Eliminada creación manual de pool redundante.
3. ✅ `commands/passkeys/export_public_key.rs`:
   - Eliminado `open_crypto_context` → `StrongholdVault::open()`.
   - `crypto::decrypt(x, &master_key)` → `vault.decrypt_value(scope, x)` (6 llamadas).
4. ✅ `commands/projects/files/sync.rs` y `commands/projects/docker/compose/operations.rs`:
   - `open_crypto_context` → `open_pool`.

### Fase 6 — Rotación de claves
✅ **Ya completada en Fases 2-3:**
1. `StrongholdVault::rotate_key(scope)` creado en `crypto/stronghold.rs`.
2. Comando Tauri `rotate_encryption_key(scope)` registrado en `lib.rs`.
3. Función JS `rotateKey(scope)` creada en `stronghold-crypto.ts`.
4. Crear UI (botón/comando) para rotar la clave de un campo específico.
5. **Omitir** re-encrypt de datos existentes en SQLite (no hay datos reales).

### Fase 7 — Simplificar query_raw y limpiar Rust
1. ✅ `query_raw.rs`: eliminados bloques de cifrado/descifrado/enmascaramiento. Solo queda: abrir pool → bind params → ejecutar → convertir filas.
2. ✅ Eliminados `keyring.rs` (código de clave maestra) y reducido `cipher.rs` a solo `is_encrypted`.
   - `ENCRYPTED_PREFIX` movido a `cipher.rs` (const privada), `stronghold.rs` usa `is_encrypted()` y `&ciphertext[4..]`.
   - `keyring::Entry` (crate `keyring`) se conserva en `stronghold.rs` para la password del vault.
3. ✅ Eliminados `helpers.rs::open_crypto_context` y `get_master_key`.
   - `commands/database/helpers.rs::maybe_decrypt` eliminado (dependía de cipher/keyring).

### Fase 8 — Verificación
1. Crear host con password → verificar que se guarda cifrado en SQLite.
2. Crear passkey con key_content y passphrase → verificar cifrado.
3. Conexión SSH → verificar que `stronghold.rs` descifra correctamente.
4. Lista de hosts → verificar que el frontend descifra y muestra texto plano.
5. Verificar Stronghold persiste a disco y se abre en reinicios.
6. Rotar clave de un campo → verificar que la nueva clave se usa para cifrar.
7. `bun run build` (vue-tsc) y compilación Rust sin errores.

### Fase 9 — Claves versionadas (estilo Symfony) + panel de seguridad [NUEVA]
Rediseño para permitir rotación **sin perder** los valores cifrados con la clave antigua.

**Formato de datos:**
- Clave en Stronghold: `encrypt:{table}.{col}:{version}` (clave AES-256-GCM de la versión `version`).
- Índice de versión actual: `encrypt:{table}.{col}:current` (número entero big-endian como 8 bytes).
- Valor cifrado en SQLite: `ENC:{version}:<base64(nonce12+cipher)>`.
- **Compatibilidad/migración del vault**: si no existe `encrypt:{table}.{col}:current`:
  - Si existe la clave vieja `encrypt:{table}.{col}` → migrar a `encrypt:{table}.{col}:0`, borrar `encrypt:{table}.{col}`, `current=0`.
  - Si no existe ningún valor → crear clave `encrypt:{table}.{col}:0`, `current=0`.
- **Compatibilidad de formato**: un valor `ENC:<b64>` sin versión se interpreta como versión `0`.

**Comportamiento (estilo Symfony):**
- `encrypt(scope, plaintext)`: cifra con la **versión actual** (`ENC:{current}:<b64>`) → cualquier INSERT/UPDATE re-cifra automáticamente con la clave vigente.
- `decrypt(scope, ciphertext)`: parsea la versión del valor y descifra con la clave de ESA versión → leer valores viejos siempre funciona (las claves viejas se conservan).
- `rotateKey(scope)`: crea `encrypt:{table}.{col}:{current+1}`, actualiza `encrypt:{table}.{col}:current` a `current+1`. **Conserva** la clave anterior.
- **Re-cifrado lazy**: ocurre de forma natural al reescribir el valor (UPDATE usa la versión actual). No requiere lógica extra en el proxy.
- **Purga de claves viejas**: solo tras verificar que ya no hay ningún valor cifrado con esa versión (escaneo global); la versión 0 (base) nunca se purga.

**Implementado:**
- ✅ `stronghold.rs`: `get_current_version` (+migración), `get_key_for_version`, `rotate_key` (no destructivo), `decrypt_value` (por versión del valor), `purge_version`, `split_ciphertext_version` (expuesto), `encrypt_with_key` (expuesto).
- ✅ Comando `scan_and_reencrypt(app)` en `commands/stronghold.rs` + registro en `lib.rs`. Recorre `ENCRYPTED_FIELDS` (deployer_hosts.password, deployer_passkeys.key_content, deployer_passkeys.passphrase), re-cifra valores con versión != actual y purga versiones viejas sin uso.
- ✅ `stronghold-crypto.ts`: `getCurrentVersion` (+migración), `getCryptoKey` por versión, `encrypt`/`decrypt` con formato versionado, `rotateKey` (devuelve versión), `ENCRYPTED_FIELDS`, `scanAndReencrypt`.
- ✅ `db.ts`: sin cambios necesarios (todo se basa en prefijo `ENC:` + sentinel).
- ✅ UI: tab "Seguridad" en `app/index.vue` (`TabSecurity.vue`) — muestra versión actual de cada campo, botón "Rotar clave" por campo y botón "Escanear y re-cifrar todo".
- ✅ i18n `pages/app/settings.ts` sección `security`.
- ✅ `cargo check` limpio, `vue-tsc` sin errores en archivos tocados.

---

## Flujo completo final

```
FORMATO:
  Clave en Stronghold:  encrypt:{table}.{col}:{version}
  Versión actual:       encrypt:{table}.{col}:current
  Valor en SQLite:      ENC:{version}:<base64(nonce12+cipher)>
  (un valor ENC:<b64> sin versión se trata como versión 0)

ESCRITURA (Drizzle proxy):
  Frontend detecta encryptedText del schema
  → encrypt(scope, plaintext) via Stronghold JS (usa versión actual → ENC:{v}:<b64>)
  → invoke('query_raw', {sql, params})  ← params ya cifrados
  → Rust solo ejecuta SQL (sin cifrar)
  → Cualquier INSERT/UPDATE re-cifra automáticamente con la clave vigente (rehash lazy)

LECTURA (Drizzle proxy):
  invoke('query_raw', {sql, params})  ← devuelve ENC:{v}:... en columnas cifradas
  → Frontend decrypt(scope, ciphertext) via Stronghold JS
    → parsea versión v, descifra con encrypt:{table}.{col}:{v} (clave de esa versión)
  → Devuelve texto plano al componente (valores viejos siguen descifrándose)

CONEXIÓN SSH (Rust):
  sqlx::query("SELECT password, key_content, passphrase FROM ...")
  → crypto::stronghold::decrypt_value_compat(scope, ciphertext)
    → parsea versión, abre vault (iota-stronghold) + lee clave AES de esa versión
    → descifra con AES-256-GCM
  → Devuelve texto plano para russh

ROTACIÓN + PURGA (panel seguridad):
  1. rotateKey(scope) → crea encrypt:{table}.{col}:{v+1}, actualiza current, conserva la vieja
  2. Valores nuevos se cifran con v+1; valores viejos siguen descifrables (clave conservada)
  3. scan_and_reencrypt(app) → recorre tablas cifradas, re-cifra con versión actual,
     y cuando ninguna fila queda en versión v<current, borra encrypt:{table}.{col}:{v}
```

---

## Riesgos

- **Acceso dual al vault**: JS (plugin Tauri) y Rust (`iota-stronghold`) abren el mismo archivo de vault. `iota-stronghold` usa bloqueo a nivel de archivo, así que el acceso concurrente es seguro. Las operaciones son rápidas (lectura de clave + AES), así que la contendencia es mínima.
- **Password del vault**: si se pierde, se pierde el vault. Stronghold no es recuperable sin ella. Se almacena en el keychain del SO (cuenta `stronghold-vault`), mismo patrón que la clave maestra actual.
- **Performance**: Stronghold lee de disco. La caché en memoria (JS) y el vault cachingado (Rust) mitigan esto.
- **Coexistencia temporal**: como no hay datos reales, no hay riesgo de doble encriptación durante la migración.
- **`cipher.rs` se mantiene temporalmente** en Fase 2-3 para reutilizar AES-256-GCM. Se elimina en Fase 6.

---

## Siguiente paso concreto

**Fase 1.1**: añadir `rust-argon2` e `iota-stronghold` a `Cargo.toml` y compilar para verificar que no hay conflictos de dependencias.
