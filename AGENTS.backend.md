# Guía de Backend — DeployerApp

> Guía para tareas de **Rust / Tauri**. Las reglas generales y el principio "frontend primero" están en [AGENTS.md](./AGENTS.md).

## 1. Responsabilidad del backend

Rust solo atiende lo que el webview no puede hacer:

- **SSH y SFTP:** consola remota, transferencias, listados y gestor de archivos (`ssh/`).
- **Cripto de claves:** generar, derivar y exportar claves SSH (`commands/passkeys/`).
- **Vault Stronghold:** lectura del vault y descifrado de credenciales SSH (`crypto/`, `commands/stronghold.rs`).
- **Gestión de la BD:** crear, inicializar, validar y migrar el archivo SQLite (`commands/database/`).
- **Ejecutor de SQL:** `query_raw`, usado por el proxy de Drizzle (`commands/database/query_raw.rs`).

Todo lo demás se hace en el frontend. Antes de crear un comando nuevo, sigue el orden de decisión de `AGENTS.md`.

## 2. Plugins y estado registrados en `lib.rs`

- `tauri_plugin_single_instance` **debe ser siempre el primero** registrado.
- `tauri_plugin_stronghold` se registra en `.setup(...)`, porque necesita `app_local_data_dir` para `salt.txt`. El frontend es el **único escritor** del vault; Rust lo abre solo para leer (`StrongholdVault::open`), para evitar contención.
- `tray`, `tauri_plugin_positioner` y `tauri_plugin_window_state` se configuran en `.setup(...)`.
- El estado `RemoteJobCancel` se gestiona con `.manage(...)`, para que la consola remota sea cancelable.
- Todos los comandos se registran a mano en el `invoke_handler!` de `lib.rs`, agrupados por dominio. No hay macro generadora.

## 3. Estructura del crate

```
src-tauri/src/
├── commands/              ← solo comandos expuestos al frontend (#[tauri::command])
│   ├── database/          ← store/, manage/, migrations/, query_raw.rs, helpers.rs
│   ├── hosts/             ← test_connection.rs, types.rs (ts-rs)
│   ├── passkeys/          ← generate_passkey.rs, derive_passkey_info.rs, export_public_key.rs, types.rs
│   ├── stronghold.rs      ← get_vault_password, get_vault_path, check_vault_health
│   └── mod.rs             ← re-exports y macro params! (#[macro_export])
├── crypto/                ← vault Stronghold de solo lectura, cifrado de valores (cipher.rs, stronghold.rs)
├── ssh/                   ← ÚNICO módulo SSH (ver §6)
├── helpers.rs             ← pools SQLite (configured_sqlite_options, create_configured_pool, open_read_only_pool)
├── response.rs            ← CommandResponse<T>
└── tables.rs              ← AUTOGENERADO (bun run tables:generate)
```

Módulos declarados en `commands/mod.rs`. La infraestructura compartida (`helpers`, `response`, `ssh`, `crypto`) vive en la raíz del crate.

### Orden de implementación

1. Crear todos los archivos nuevos y modificar los tipos existentes.
2. Conectar los módulos (`mod.rs`) y registrar en `lib.rs` **siempre como último paso**, para no romper el build mientras el trabajo está en curso.

## 4. Base de datos

- Las escrituras usan un pool SQLite en modo **WAL** con `busy_timeout` de 5 s (`create_configured_pool`). Así se evitan conflictos al guardar muchos eventos del gestor de archivos en paralelo.
- Las lecturas usan `open_read_only_pool` con las opciones por defecto.
- En dev, Vite ignora `*.sqlite`, `*-journal`, `*-wal` y `*-shm` para no recargar la página al escribir.
- Las tablas llevan el prefijo `deployer_`. Las constantes de nombres se autogeneran en `tables.rs`.
- **`query_raw`** (`sql`, `params`) ejecuta siempre con `fetch_all()` y devuelve `columns` + `rows`. **No cifra ni descifra**: eso lo hace el frontend (ver §5). Devuelve `tauri.database.errors.query_raw_*` en caso de fallo.

## 5. Cifrado y vault

### Piezas

- **Password del vault:** aleatoria (64 hex) en la primera ejecución, guardada en el keychain del SO con `keyring` (servicio `deployer-app`, cuenta `stronghold-vault`). Lo gestiona `get_or_create_vault_password()`.
- **Clave del vault:** se deriva de la password y `salt.txt` (32 bytes) con Argon2, igual que el plugin JS.
- **Vault:** `vault.hold` en `app_local_data_dir`. Stronghold actúa como almacén de secretos cifrado; no sustituye al keychain, que sigue siendo necesario para la password.

### Claves y formato

- Clave por scope: `encrypt:{tabla}.{col}:{version}` → 32 bytes (AES-256-GCM). Versión actual en `encrypt:{tabla}.{col}:current` (8 bytes big-endian).
- Valor en SQLite: `ENC:{version}:<base64(nonce_12_bytes + ciphertext)>`. Un valor `ENC:<base64>` sin versión se trata como versión 0 (formato legado).
- Rotar una clave crea `current+1` y conserva la anterior, para que los valores antiguos sigan descifrándose.
- `EXPECTED_SCOPES` en `crypto/stronghold.rs` debe coincidir con los campos cifrados declarados en el frontend (`src/drizzle/lib/schema-types.ts`). `check_vault_health` informa de los scopes que falten.

### Decisión actual (punto abierto)

Rust descifra las credenciales SSH en `ssh/connect.rs` porque necesita el valor en claro para abrir la sesión. Esta es la decisión vigente; si cambia, actualizar esta sección.

## 6. SSH (`ssh/`)

### Conexión

- **Un único punto de conexión:** `connect_to_host_by_id` y `connect_to_host_with_temp_credentials` (`ssh/connect.rs`). Ningún comando fuera de `ssh/` abre sesiones por su cuenta.
- **Timeout único:** `SSH_CONNECT_TIMEOUT_SECS = 15` en `ssh/session.rs` → `tauri.ssh.errors.connection_timeout`.
- **Huella del servidor:** `deployer_hosts.host_key_fingerprint` guarda `SHA256:<base64>`, confirmada por el usuario. Sin huella guardada → `tauri.ssh.errors.host_key_unknown`. Huella distinta → `tauri.ssh.errors.host_key_mismatch`. En ambos casos se rechaza la conexión y se devuelve la huella vista en `message_params.fingerprint`.
- **Errores:** `ssh/error.rs` define `SshError` y las claves `tauri.ssh.*`. No usar las claves antiguas `tauri.hosts.error.*` ni `tauri.remote.*`.

### Comandos

| Comando | Qué hace |
| --- | --- |
| `ssh_execute_command` | Ejecuta un comando con streaming de salida (consola remota). |
| `ssh_upload_file` | Sube archivo o directorio por SFTP. `recursive`: `true` fuerza directorio, `false` archivo, `null` autodetecta. |
| `ssh_download_file` | Descarga a `local_path` o, si es `null`, devuelve `content_base64` (solo archivo simple). |
| `ssh_list_remote_dir` | Lista un nivel de un directorio, sin recursión. `max_entries` por defecto 1000. |
| `ssh_file_manager_transfer` | Lote de transferencias con una sola conexión y concurrencia 1–16 (por defecto 2). |
| `ssh_cancel_remote_job` | Cancela un job por `job_id`; sin id, cancela el último registrado. |

### Reglas de los comandos

- Reciben `channel: Channel<...>` **obligatorio** (`Channel` no implementa `Deserialize`). El lote del gestor usa `Channel<RemoteFileManagerEvent>`.
- `timeout_secs` es **total**: el reloj no se reinicia con la salida intermitente.
- `ssh_execute_command` devuelve `success: true` aunque el comando remoto falle. El `exit_code` real viaja en `data` (0 = OK, -1 = desconocido). Los errores de transporte devuelven `success: false`.
- **Evento `finished`:** `{ status: "success" | "error" | "cancelled", exit_code, duration_seconds, message }`. En transferencias, `exit_code` es 0 en éxito, 130 en cancelación y 1 en error.
- **Cancelación:** `cancel.rs` mantiene un `AtomicU64` y un mapa de `CancellationToken`. Un `RemoteJobGuard` retira el token al terminar. Los ids son monotónicos y no se reutilizan; se admiten jobs concurrentes.

### Rutas remotas y symlinks

- Las rutas remotas se unen siempre con `/` (`join_remote_path()`), nunca con el separador del SO.
- Los symlinks se resuelven con `STAT` (`sftp.metadata`), que sigue enlaces. Los rotos se omiten con aviso. `MAX_DOWNLOAD_DEPTH = 32` corta los ciclos.
- El backend **no ordena** los listados: el frontend impone el orden.

### Lote del gestor de archivos

- `ssh_file_manager_transfer` abre una sola conexión y limita los ítems simultáneos con un `Semaphore`. Cada ítem se delega en `ssh::transfer`, sin duplicar lógica.
- Registra todos los tokens al inicio (`BatchStarted.job_ids`), para poder cancelar ítems pendientes.
- `russh-sftp` no permite `Clone` en `SftpSession`; se comparte como `Arc<SftpSession>` entre tareas.
- El backend no escribe en la BD. La cola, los listados y las marcas los persiste el frontend.

## 7. Dependencias: límites y motivos

| Crate | Versión | Límite | Motivo |
| --- | --- | --- | --- |
| `rand` | `0.10` | No bajar | Requiere la feature `sys_rng`. |
| `rand_core` | `0.10` | Alineado con `rand` | `rand 0.10` lo requiere; `0.6` provoca conflictos de traits. |
| `keyring` | `4.1` | — | Password del vault. `Error` es `#[non_exhaustive]`: usar `_` en los match. |
| `iota_stronghold` | `2` | — | Vault de cifrado, cargado con `SnapshotPath` y `KeyProvider` (Argon2). |
| `rust-argon2` | `2` | — | Derivación de la clave del vault. |
| `russh` | `0.65.1` | No bajar | `authenticate_publickey` requiere `PrivateKeyWithHashAlg`. Solo lado cliente. |
| `russh-sftp` | `2.3` | — | Patrón: `channel_open_session()` → `request_subsystem("sftp")` → `SftpSession::new(...)`. |
| `aes-gcm` | `0.11` | — | Usar `Nonce::from(bytes)`; `Nonce::from_slice` está deprecado. |
| `sqlx` | `0.8.6` | — | Consultas dinámicas con `sqlx::query(&sql)`. No usar macros que requieran `DATABASE_URL`. |
| `ts-rs` | — | — | Exporta tipos a `src/types/tauri-types.d.ts` con `cargo test export_bindings`. No añadir tipos de dominio a ese archivo. |

## 8. Comandos Tauri: convenciones

- Usar `CommandResponse<T>` para la respuesta. Los mensajes van como claves i18n (`message_key`, `message_params`), nunca como texto en español.
- Antes de crear un comando, comprobar que el frontend no puede resolverlo con un plugin o con `query_raw` (ver `AGENTS.md`).
