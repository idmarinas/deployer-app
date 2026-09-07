# Guía de Backend - DeployerApp

> Guía específica para tareas de **Rust / Tauri**. Lee también [AGENTS.md](./AGENTS.md) para las reglas comunes.

---

## 1. Estructura de Comandos

Los comandos Tauri se organizan en `src-tauri/src/commands/`, **solo módulos con comandos expuestos al frontend** (lógica de backend que Drizzle no puede cubrir: SSH/SFTP, cripto de claves, acceso al vault de Stronghold, operaciones/gestión de BD). La infraestructura compartida (`helpers`, `response`, `patch`, `ssh`, `crypto`) vive en `src-tauri/src/` (raíz del crate).

### Estructura del crate

```
src-tauri/src/
├── commands/              ← solo comandos frontend (#[tauri::command])
│   ├── database/          ← Gestión/inicialización de BD + query_raw (proxy Drizzle)
│   │   ├── store/         ← get_database_path, set_database_path, check_database_exists
│   │   │   ├── get_database_path.rs
│   │   │   ├── set_database_path.rs
│   │   │   ├── check_database_exists.rs
│   │   │   └── mod.rs
│   │   ├── manage/        ← initialize_database, create_database_file, validate_database_sqlite
│   │   │   ├── initialize_database.rs
│   │   │   ├── create_database_file.rs
│   │   │   ├── validate_database_sqlite.rs
│   │   │   └── mod.rs
│   │   ├── migrations/    ← execute_migrations, get_migrations_info, has_migrations_pending
│   │   │   ├── execute_migrations.rs
│   │   │   ├── get_migrations_info.rs
│   │   │   ├── has_migrations_pending.rs
│   │   │   └── mod.rs
│   │   ├── get_database_info.rs
│   │   ├── get_app_info.rs
│   │   ├── query_raw.rs   ← Comando genérico de SQL para Drizzle (sin cripto: solo ejecuta)
│   │   ├── helpers.rs     ← bind_params / row_column_names / rows_to_values / path_to_sqlite_url
│   │   └── mod.rs
│   ├── hosts/             ← Comandos no-CRUD de hosts (el CRUD usa Drizzle)
│   │   ├── test_connection.rs
│   │   ├── status.rs      ← host_check_system_info (cooldown 24h) + host_check_metrics (15m)
│   │   ├── updates.rs     ← host_check_updates + host_update_packages
│   │   ├── types.rs       ← HostSystemInfo, HostStatusMetrics, HostServerUpdates
│   │   └── mod.rs
│   ├── passkeys/          ← Comandos no-CRUD de claves (el CRUD usa Drizzle)
│   │   ├── generate_passkey.rs
│   │   ├── derive_passkey_info.rs
│   │   ├── export_public_key.rs
│   │   ├── types.rs       ← KeyType (rsa | ed25519 | ecdsa)
│   │   └── mod.rs
│   ├── remote/            ← Comandos SSH/SFTP "sueltos" (consola remota)
│   │   ├── exec.rs        ← ssh_execute_command (streaming por Channel, timeout, exit_code)
│   │   ├── transfer.rs    ← ssh_upload_file + ssh_download_file (delegan en ssh::transfer)
│   │   ├── cancel.rs      ← estado RemoteJobCancel (CancellationToken) + ssh_cancel_remote_job
│   │   ├── types.rs       ← RemoteCommandInput/Result, RemoteUploadInput, RemoteDownloadInput/Result, RemoteConsoleEvent (Channel)
│   │   └── mod.rs
│   ├── stronghold.rs      ← get_vault_password, get_vault_path (acceso read a crypto/stronghold.rs)
│   └── mod.rs             ← re-exports de módulos + macro params!
├── crypto/                ← Cripto de las claves de cifrado (vault Stronghold de SOLO lectura)
│   ├── cipher.rs          ← is_encrypted, constante ENCRYPTED_PREFIX = "ENC:"
│   ├── stronghold.rs      ← StrongholdVault (abre vault solo lectura), get_or_create_vault_password(), split_ciphertext_version(), decrypt_aes_gcm_payload()
│   └── mod.rs
├── helpers.rs             ← configured_sqlite_options(), create_configured_pool(), open_pool() → (pool, path)
├── patch.rs               ← Patch<T> (Unset/Null/Value) para updates parciales
├── response.rs            ← CommandResponse<T>
├── ssh/                   ← Conexión SSH/SFTP (connect_to_host_by_id, SshSession, run_ssh_command, transferencias genéricas)
│   ├── mod.rs             ← re-exports (connect_to_host_by_id, run_ssh_command, open_sftp_session, shell_escape, SshSession/…)
│   ├── connect.rs         ← connect_to_host_by_id (SQL host+passkey + descifrado vía vault Stronghold)
│   ├── session.rs         ← SshSession, HostCredentials, SshCredentials, decrypt_host_credentials
│   ├── helpers.rs         ← open_sftp_session, run_ssh_command, shell_escape
│   ├── glob.rs
│   └── transfer.rs        ← transferencias genéricas (aceptan Option<&CancellationToken>)
└── tables.rs              ← AUTOGENERADO (bun run tables:generate) - constantes de nombres de tablas
```

> El feature histórico de **Docker Compose remoto** (`commands/projects/docker/compose/**`) y la **caché de Docker Hub** (`commands/cache/docker/**`) se retiraron del código activo (archivados en `_archived.dist/`). No añadir referencias nuevas a `project_docker_compose_*`, `sync_project_docker_compose_files` ni `cache_docker_*`.

### Registro en `lib.rs`

Todos los comandos se registran en el `invoke_handler!` de `src-tauri/src/lib.rs`, agrupados por dominio y comentados. No existe ninguna macro generadora: cada comando se añade a mano. Los módulos se declaran en `commands/mod.rs` (re-exports) y la macro `params!` (HashMap de parámetros i18n) se define allí como `#[macro_export]`.

### Orden de implementación (obligatorio)

1. Crear todos los archivos nuevos y modificar types existentes.
2. Conectar módulos (`mod.rs`) y registrar en `lib.rs` **siempre como último paso** — evita romper el build mientras el trabajo está en curso.

### Registro de plugins en `lib.rs`

- El plugin `tauri_plugin_single_instance` debe ser **siempre el primero** en registrarse (gotcha de `AGENTS.md`).
- El estado `RemoteJobCancel` se gestiona con `.manage(...)` para que la consola remota sea cancelable.
- El plugin `tauri_plugin_stronghold` se registra en `.setup(...)` (necesita `app_local_data_dir` para `salt.txt`). El vault se comparte con el frontend: **el frontend es el único escritor** y Rust lo abre solo para leer (`StrongholdVault::open`), evitando contención.
- Bonus: tray + `tauri_plugin_positioner` y `tauri_plugin_window_state` en `.setup(...)`.

---

## 2. Base de Datos

### Acceso desde el frontend

- **Todas las lecturas y escrituras** sobre las tablas de negocio se hacen desde el frontend con **Drizzle en modo proxy** (`src/lib/db.ts`), que delega en el comando genérico `query_raw` (`src-tauri/src/commands/database/query_raw.rs`).
- `query_raw` es un **ejecutor de SQL simple** (`sql`, `params`): devuelve `columns` + `rows`. **No hace cripto**: el cifrado/descifrado/enmascaramiento de los campos `encryptedText(...)` lo gestiona el frontend (`src/lib/db.ts` + `src/lib/stronghold.ts`, ver §4). No hay comandos Rust `crud_*` por entidad.
- **Los comandos Rust solo existen para lógica de backend** que Drizzle no puede cubrir: SSH/SFTP (`hosts/`, `remote/`), cripto de claves (`passkeys/`), acceso al vault de Stronghold (`stronghold/`), y gestión/inicialización de BD (`database/`).
- Antes de crear un comando Rust nuevo, comprobar si la lógica puede cubrirse con Drizzle (vía `query_raw`). Ver la tabla de decisión en `AGENTS.md`.

### Nombres de tablas

Todas las tablas llevan el prefijo `deployer_`. El nombre de tabla se define en la migración SQL (`src-tauri/migrations/`, fuente de verdad del esquema) y en las entidades Drizzle de `src/lib/entities/`. Las constantes de nombres también se autogeneran en `src-tauri/src/tables.rs` mediante `bun run tables:generate` (no editar a mano).

### Tablas actuales y campos destacados

| Tabla                                | Campo(s) destacado(s)                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `deployer_hosts`                     | `name`, `enabled`, `host`, `port`, `username`, `auth_type` (`password`/`key`), `password` (cifrado), `key_id` (FK→passkeys, `ON DELETE SET NULL`), `system_info` (JSON), `status_info` (JSON), `server_updates` (JSON) |
| `deployer_passkeys`                  | `name`, `enabled`, `key_content` (cifrado), `passphrase` (cifrado), `key_type`, `fingerprint`             |
| `deployer_settings`                  | Clave-valor: PK `key` + `value` (p.ej. cooldowns `hosts.system_info_cooldown_hours`, `hosts.status_info_cooldown_minutes`) |

Tablas con cifrado declarado (vía `encryptedText` en `src/lib/schema-types.ts`): `deployer_hosts.password`, `deployer_passkeys.key_content`, `deployer_passkeys.passphrase`.

---

## 3. Entidades Drizzle y declaración de campos cifrados

El esquema Drizzle vive en `src/lib/entities/*` (hoy solo `hosts`, `passkeys` y `settings`) y es la fuente que el frontend usa para **detectar los campos cifrados** y construir el `encryptMask`/scope por columna. Las entidades se generan y no se editan a mano (ver `AGENTS.md`); el cifrado se declara con el customType `encryptedText(...)` de `src/lib/schema-types.ts`.

`encryptedText` soporta dos modos:

- **Siempre cifrado**: `encryptedText('password')`.
- **Condicional**: `encryptedText('campo', { condition: 'otra_columna' })` — solo se cifra cuando la columna condición es truthy (ej. cifrar `value` solo si `is_secret = true`).

### Columnas con timestamps

`src/lib/columns.helpers.ts` define helpers reutilizables: `timestamps`, `description`, `enabled` (y `file_table`, un helper legacy sin uso activo).

`timestamps` añade `created_at` / `updated_at` / `deleted_at` con:

- `created_at`: `$default(() => new Date().toISOString())`.
- `updated_at`: `$default` **y** `$onUpdate` a un ISO string (`new Date().toISOString()`).
- `deleted_at`: nullable (borrado lógico).

**No existen triggers SQL** para `updated_at`: la actualización automática la gestiona Drizzle con `$onUpdate` al generar el `UPDATE`. Al añadir una tabla nueva, usar el helper `timestamps` en lugar de crear ningún trigger.

### Gestión de borrado lógico (`deleted_at`)

Las tablas de negocio tienen columna `deleted_at` (nullable) y el esquema Drizzle mapea el filtro de filas "no borradas" en las consultas. Al consultar con Drizzle hay que filtrar por `isNull(deleted_at)` según el patrón de cada entidad.

---

## 4. Sistema de Cifrado Transparente (vault Stronghold)

### Vista general

- El frontend opera **siempre en texto plano** y realiza el cifrado/descifrado/enmascaramiento con **Web Crypto (AES-256-GCM)** usando claves guardadas en el **vault de Stronghold**:
  - `src/lib/stronghold.ts` — carga el vault, gestiona claves versionadas, cifra/descifra/rota.
  - `src/lib/db.ts` (proxy Drizzle) — cifra los params en escrituras; descifra (con `withDecryption(true, ...)`) o enmascara (default) en lecturas.
- Rust **no cifra ni descifra en `query_raw`**. Rust abre el vault solo para **leer** claves y descifrar credenciales SSH en `ssh/connect.rs` / `ssh/session.rs` (`StrongholdVault::open`).

### Vault de Stronghold

- Archivo `vault.hold` en `app_local_data_dir`, junto a `salt.txt` (32 bytes), compartido con el plugin JS `tauri_plugin_stronghold` (registrado en `.setup(...)`, usa el mismo salt y la misma password).
- La **password del vault** se genera aleatoria (64 hex) en la primera ejecución y se persiste en el **keychain del SO** con el crate `keyring` (servicio `deployer-app`, cuenta `stronghold-vault`): `get_or_create_vault_password()`.
- De la password + salt se deriva la clave del vault con **Argon2** (`hash_password`), el mismo algoritmo que usa el plugin.
- **El frontend es el único escritor** del vault (creación/rotación/purga de claves). Rust solo lectura → sin contención entre ambos accesos.

### Claves versionadas (estilo Symfony)

- Clave por scope: `encrypt:{tabla}.{col}:{version}` → 32 bytes (AES-256-GCM).
- Versión actual: `encrypt:{tabla}.{col}:current` → 8 bytes big-endian.
- Valor en SQLite: `ENC:{version}:<base64(nonce_12_bytes + ciphertext)>`. Un valor `ENC:<base64>` sin segmento de versión se trata como **versión 0** (formato legado; `split_ciphertext_version`).
- `rotateKey(scope)` crea `current+1` **conservando la anterior** (los valores cifrados con versiones viejas siguen descifrándose); `scanAndReencrypt()` / `reencryptScope(scope)` re-cifran los valores con la versión actual y purgan versiones sin uso.

### Algoritmo

AES-256-GCM, nonce aleatorio de 12 bytes por cada cifrado.

### Prefijo y valores vacíos

- `ENC:` identifica un valor cifrado (`crypto::cipher::is_encrypted`).
- Si un valor ya tiene el prefijo `ENC:` al llegar a cifrar, **no se vuelve a cifrar**.
- Los campos vacíos se almacenan como string vacío, nunca como `ENC:`.

### Configuración de campos cifrados (`encryptedText(...)` en `src/lib/schema-types.ts`)

| Tabla                     | Campo          | Uso |
| ------------------------- | -------------- | --- |
| `deployer_hosts`          | `password`     | Se cifra al escribir; se enmascara (no se expone en claro) al leer |
| `deployer_passkeys`       | `key_content`  | Se cifra al escribir; se enmascara al leer |
| `deployer_passkeys`       | `passphrase`   | Se cifra al escribir; se enmascara al leer |

> `generate_passkey` devuelve la passphrase en claro al frontend; el INSERT vía el proxy (`db.ts`) la cifra al persistir.

### Flujo por operación (frontend)

- **Escritura**: `db.ts` detecta los campos cifrados del schema (`detectEncryptedFieldsFromSchema`), aplica `stripEncryptedValues` (elimina asignaciones con sentinel/`BLANK_VALUE` o `ENC:`) y cifra los params marcados con `encrypt(scope, valor)`.
- **Lectura sin descifrado** (default): reemplaza los valores `ENC:` por `BLANK_VALUE` (la UI muestra un placeholder).
- **Lectura con descifrado**: `withDecryption(true, fn)` → descifra por scope usando la versión del valor.

---

## 5. Consola remota (`commands/remote/`)

Comandos SSH/SFTP "sueltos" (no asociados a un compose) que usa la consola remota del frontend vía `useRemoteCommand.ts`:

- `ssh_execute_command(input, channel, state)`: abre sesión SSH + canal, ejecuta el comando con streaming de output por `Channel<RemoteConsoleEvent>` (eventos `output_chunk` con agregación ~100 ms, `finished` con `exit_code` y `duration_seconds`, `error`). Acepta `working_dir`, `timeout_secs` (default 300) y `ssh_reconnect_attempts` (default 3). Devuelve `CommandResponse<RemoteCommandResult>` con `success: true` incluso si el comando remoto falla (exit != 0); el `exit_code` viaja en `data` (0 = OK, -1 = desconocido).
- `ssh_upload_file(input, channel)`: sube un archivo o directorio local (`local_path`) a `remote_path` vía SFTP. Auto-detecta archivo/directorio salvo que `recursive` sea `Some(true)`. Aplica `chmod` octal si se indica. Emite progreso por el mismo Channel.
- `ssh_download_file(input, channel)`: descarga `remote_path` a `local_path`. Si `local_path` es `None`, devuelve el contenido en `content_base64` (solo archivo simple). Detecta directorio remoto salvo que `recursive` sea `Some(true)`.
- Todos toman `channel: Channel<RemoteConsoleEvent>` **obligatorio** (no es opcional: `Channel` no implementa `Deserialize`).
- Errores de transporte (conexión, timeout) → `success: false` con `message_key` (`tauri.remote.errors.*`); el mensaje humanizado también se emite como evento `error` por el Channel.
- Estos comandos usan `connect_to_host_by_id(..., enabled_only: true)`.
- **Cancelación:** los tres comandos registran un `CancellationToken` en el estado `RemoteJobCancel` (compartido, `commands/remote/cancel.rs`) al empezar, y `ssh_cancel_remote_job` (sin args) cancela el job en curso. En `exec.rs` la cancelación se espera con `tokio::select!` sobre `token.cancelled()`; en `ssh/transfer.rs` todas las funciones aceptan `cancel: Option<&CancellationToken>` (`None` = nunca cancela) y comprueban el flag antes y entre operaciones. Al cancelar devuelven error con clave `tauri.remote.errors.cancelled`. **El frontend no debe lanzar varios jobs a la vez**: el estado solo guarda el último token.

---

## 6. Comando `query_raw` (proxy Drizzle)

### Propósito

Único punto de entrada que permite al frontend ejecutar SQL arbitrario generado por Drizzle (modo proxy), tanto lecturas como escrituras. **No hace cripto**: el cifrado/descifrado/enmascaramiento de los campos declarados `encryptedText(...)` lo gestiona el frontend (proxy `db.ts` + vault en `stronghold.ts`). Ver `src/lib/db.ts` para cómo el frontend lo invoca.

### Firma

```rust
query_raw(app, sql, params)
```

- `sql`: sentencia SQL generada por Drizzle (con placeholders `?`).
- `params`: `Option<Vec<JsonValue>>` bindeado en orden a la query.

### Comportamiento

- Abre el pool (`open_pool`) — sin contexto cripto.
- **Ejecuta siempre con `fetch_all()`** — devuelve filas reales (SELECT e INSERT/UPDATE/DELETE con `RETURNING`).
- Devuelve `QueryRawResult { columns: Vec<String>, rows: Vec<Vec<Value>> }`.

### Errores

Devuelve `CommandResponse::err` con claves `tauri.database.errors.query_raw_open_pool_failed` / `query_raw_execution_failed`. El frontend traduce los errores (y las restricciones UNIQUE/FK) a mensajes de usuario.

---

## 7. Dependencias Rust — Notas de Compatibilidad

| Crate            | Versión | Límite              | Motivo                                                                                                                                                                                                                     |
| ---------------- | ------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rand`           | `0.10`  | No bajar            | Requiere feature `sys_rng` para `OsRng`/`SysRng`.                                                                                                                                                                         |
| `rand_core`      | `0.10`  | Alineado con `rand` | `rand 0.10` requiere `rand_core 0.10`; declarar `0.6` causaría conflictos de traits.                                                                                                                                       |
| `keyring`        | `4.1`   | —                   | Guarda la **password del vault de Stronghold** (servicio `deployer-app`, cuenta `stronghold-vault`). `v1` (default) re-exporta `Entry`/`Error` en raíz. `Error` es `#[non_exhaustive]` — siempre usar catch-all en match. Feature `v1` incluye `windows-native-keyring-store` automáticamente en Windows. Datos v3 compatibles. |
| `iota_stronghold`| `2`     | —                   | Vault de claves de cifrado (`crypto/stronghold.rs`). Aunque Rust abre el vault solo lectura, lo carga con `SnapshotPath` + `KeyProvider` (Argon2) igual que el plugin JS.                                                    |
| `rust-argon2`    | `2`     | —                   | Derivación de la clave del vault a partir de la password + salt (`hash_password` en `crypto/stronghold.rs`).                                                                                                               |
| `russh`          | `0.62`  | —                   | `authenticate_publickey` requiere `PrivateKeyWithHashAlg`; `AuthResult` es enum. Solo se usa lado **cliente** (`client::Handler`); el breaking change de 0.62 en `channel_open_*` (server-side) no aplica.                 |
| `russh-sftp`     | `2.3`   | —                   | `ReadDir` auto-filtra `.`/`..`. Patrón: `channel_open_session()` → `channel.request_subsystem(true, "sftp")` → `SftpSession::new(channel.into_stream())`.                                                                  |
| `aes-gcm`        | `0.11`  | —                   | `aead` 0.5→0.6: `encrypt`/`decrypt` ahora reciben `&nonce` (borrow). `Nonce::from_slice` deprecado, usar `Nonce::from(bytes)`. `OsRng` ya no se re-exporta desde `aead`.                                                   |
| `chrono`         | `0.4`   | —                   | Timestamps RFC3339 (p.ej. `last_checked_at` en `system_info`/`status_info`).                                                                                                                                              |
| `sqlx`           | `0.8.6` | —                   | Queries dinámicas con `sqlx::query(&sql)`. No usar macros que requieran `DATABASE_URL`.                                                                                                                                    |
| `ts-rs`          | —       | —                   | Exporta los tipos de input/result de los comandos a `src/types/tauri-types.d.ts` (`#[ts(export, export_to = "tauri-types.d.ts")]`) en tiempo de build/check.                              |