# Guía de Backend - DeployerApp

> Guía específica para tareas de **Rust / Tauri**. Lee también [AGENTS.md](./AGENTS.md) para las reglas comunes.

---

## 1. Estructura de Comandos

Los comandos Tauri se organizan en `src-tauri/src/commands/`, **solo módulos con comandos expuestos al frontend** (lógica de backend que Drizzle no puede cubrir: SSH/SFTP, cripto de claves, caché Docker Hub, operaciones/gestión de BD). La infraestructura compartida (`helpers`, `response`, `patch`, `ssh`, `crypto`) vive en `src-tauri/src/` (raíz del crate).

### Estructura del crate

```
src-tauri/src/
├── commands/              ← solo comandos frontend (#[tauri::command])
│   ├── cache/
│   │   └── docker/        ← Caché de Docker Hub (search + tags)
│   │       ├── search.rs  ← cache_docker_search
│   │       ├── tags.rs    ← cache_docker_tags
│   │       ├── types.rs   ← DockerHubSearchCache/TagsCache, DockerHubImageResult/TagResult
│   │       └── mod.rs
│   ├── database/          ← Gestión/inicialización de BD + query_raw (proxy Drizzle)
│   │   ├── store.rs       ← get_database_path, set_database_path, check_database_exists
│   │   ├── initialize_database.rs
│   │   ├── create_database_file.rs
│   │   ├── validate_database_sqlite.rs
│   │   ├── execute_migrations.rs
│   │   ├── has_migrations_pending.rs
│   │   ├── get_migrations_info.rs
│   │   ├── get_database_info.rs
│   │   ├── get_app_info.rs
│   │   ├── query_raw.rs   ← Comando genérico de lectura Y escritura para Drizzle
│   │   ├── helpers.rs     ← bind_params/rows conversion + path_to_sqlite_url
│   │   └── mod.rs
│   ├── hosts/             ← Comandos no-CRUD de hosts (el CRUD usa Drizzle)
│   │   ├── test_connection.rs
│   │   ├── status.rs      ← host_check_system_info (cooldown 24h) + host_check_metrics (15m)
│   │   ├── updates.rs     ← host_check_updates + host_update_packages
│   │   ├── types.rs       ← HostSystemInfo, HostStatusMetrics
│   │   └── mod.rs
│   ├── passkeys/          ← Comandos no-CRUD de claves (el CRUD usa Drizzle)
│   │   ├── generate_passkey.rs
│   │   ├── derive_passkey_info.rs
│   │   ├── export_public_key.rs
│   │   ├── types.rs       ← KeyType (rsa | ed25519 | ecdsa)
│   │   └── mod.rs
│   ├── projects/
│   │   └── docker/
│   │       └── compose/   ← Módulo compose (archivos + operaciones)
│   │           ├── files_commands.rs ← sync_project_docker_compose_files (transacción)
│   │           ├── files_types.rs    ← DockerComposeFile, SyncDockerComposeFilesInput
│   │           ├── operations.rs     ← up/down/ps/logs/restart/pull
│   │           ├── types.rs          ← DockerCompose, DockerComposeOperationInput, DockerComposeService
│   │           └── mod.rs
│   └── remote/            ← Comandos SSH/SFTP "sueltos" (consola remota)
│       ├── exec.rs        ← ssh_execute_command (streaming por Channel, timeout, exit_code)
│       ├── transfer.rs    ← ssh_upload_file + ssh_download_file (delegan en ssh::transfer)
│       ├── cancel.rs      ← estado RemoteJobCancel (CancellationToken) + ssh_cancel_remote_job
│       ├── types.rs       ← RemoteCommandInput/Result, RemoteUploadInput, RemoteDownloadInput/Result, RemoteConsoleEvent (Channel)
│       └── mod.rs
├── crypto/                ← Cifrado AES-256-GCM + master key (keychain SO)
│   ├── cipher.rs          ← encrypt/decrypt/is_encrypted, constante BLANK_VALUE
│   ├── keyring.rs         ← get_or_create_master_key(), ENCRYPTED_PREFIX = "ENC:"
│   └── mod.rs
├── helpers.rs             ← open_pool(), get_master_key(), open_crypto_context(), configured_sqlite_options()
├── patch.rs               ← Patch<T> (Unset/Null/Value) para updates parciales
├── response.rs            ← CommandResponse<T>
└── ssh/                   ← Conexión SSH/SFTP (connect_to_host_by_id, SshSession, run_ssh_command, transferencias genéricas)
    ├── mod.rs
    ├── types.rs           ← SshSession, credenciales resueltas desde host/passkey
    └── (helpers de conexión, sesión y transfer)
```

### Registro en `lib.rs`

Todos los comandos se registran en el `invoke_handler!` de `src-tauri/src/lib.rs`, agrupados por dominio y comentados. No existe ninguna macro generadora: cada comando se añade a mano.

### Orden de implementación (obligatorio)

1. Crear todos los archivos nuevos y modificar types existentes.
2. Conectar módulos (`mod.rs`) y registrar en `lib.rs` **siempre como último paso** — evita romper el build mientras el trabajo está en curso.

### Registro de plugins en `lib.rs`

El plugin `tauri_plugin_single_instance` debe ser **siempre el primero** en registrarse (gotcha de `AGENTS.md`). El estado `RemoteJobCancel` se gestiona con `.manage(...)` para que la consola remota sea cancelable.

---

## 2. Base de Datos

### Acceso desde el frontend

- **Todas las lecturas y escrituras** sobre las tablas de negocio se hacen desde el frontend con **Drizzle en modo proxy** (`src/lib/db.ts`), que delega en el comando genérico `query_raw` (`src-tauri/src/commands/database/query_raw.rs`).
- `query_raw` acepta **lecturas y escrituras** (ver §6): cifra/descifra/enmascara los campos que el frontend declara como `encryptedText(...)`. No hay comandos Rust `crud_*` por entidad.
- **Los comandos Rust solo existen para lógica de backend** que Drizzle no puede cubrir: SSH/SFTP (`hosts/`, `remote/`, `projects/docker/compose/operations.rs`), cripto de claves (`passkeys/`), caché de Docker Hub (`cache/docker/`), y gestión/inicialización de BD (`database/`).
- Antes de crear un comando Rust nuevo, comprobar si la lógica puede cubrirse con Drizzle (vía `query_raw`). Ver la tabla de decisión en `AGENTS.md`.

### Nombres de tablas

Todas las tablas llevan el prefijo `deployer_`. El nombre de tabla se define en la migración SQL (`src-tauri/migrations/`, fuente de verdad del esquema) y en las entidades Drizzle de `src/lib/entities/`.

### Tablas actuales y campos destacados

| Tabla                                | Campo(s) destacado(s)                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `deployer_hosts`                     | `host`, `port`, `username`, `auth_type` (`password`/`key`), `password` (cifrado), `key_id`, `system_info` (JSON), `status_info` (JSON), `server_updates` (JSON) |
| `deployer_passkeys`                  | `key_content` (cifrado), `passphrase` (cifrado), `key_type`, `fingerprint`                                |
| `deployer_settings`                  | Clave-valor: PK `key` + `value`                                                                           |
| `deployer_projects_docker_compose`   | `name`, `enabled`, `host_id`, `remote_path` (dir remoto del compose, default `/opt/docker-compose/`)      |
| `deployer_projects_docker_compose_files` | `module_id` (FK al compose, `ON DELETE CASCADE`), `file_path`, `content`, `is_binary`, `mime_type`, `size` |
| `deployer_cache_projects_docker_search` | Caché de búsqueda de imágenes Docker Hub (TTL 1 h)                                                    |
| `deployer_cache_projects_docker_tags`   | Caché de tags Docker Hub (una fila por página consultada, TTL 24 h)                                    |

Tablas con cifrado declarado (vía `encryptedText` en `src/lib/schema-types.ts`): `deployer_hosts.password`, `deployer_passkeys.key_content`, `deployer_passkeys.passphrase`.

### Caché de Docker Hub (`commands/cache/docker/`)

- `deployer_cache_projects_docker_search` — caché de la búsqueda de imágenes (una fila por consulta).
- `deployer_cache_projects_docker_tags` — caché de tags con **una fila por página consultada** (no por tag):

| Columna          | Contenido |
| ---------------- | --------- |
| `url_query`      | URL exacta usada para la petición (clave de la caché) |
| `url_next` / `url_previous` | URLs de paginación devueltas por la API |
| `count`          | Total de tags (de la API) |
| `tags`           | JSON de `results` filtrados y **enriquecido** con `version`/`variant` por tag |
| `tags_versions` / `tags_variants` | JSON arrays de valores únicos en orden de aparición |

- `cache_docker_search` / `cache_docker_tags`: consultan primero la caché y hacen HTTP solo cuando falta una página fresca (respetando TTL).
- `parse_tag()` (en el backend) es la misma lógica que `parseTag()` del frontend (versión = parte anterior al primer `-`, variante = resto o `""`). El frontend consume `version`/`variant` del resultado en vez de parsear.
- Los tipos de estos comandos se exportan a `src/types/tauri-types.d.ts` con `#[ts(export, export_to = "tauri-types.d.ts")]` (ts-rs).

---

## 3. Entidades Drizzle y declaración de campos cifrados

El esquema Drizzle vive en `src/lib/entities/*` y **es la fuente de la configuración de cifrado/enmascaramiento** que el frontend envía a `query_raw`. Las entidades se generan y no se editan a mano (ver `AGENTS.md`); el cifrado se declara con el customType `encryptedText(...)` de `src/lib/schema-types.ts`.

### Columnas con timestamps

`src/lib/columns.helpers.ts` define un helper de columnas `timestamps` que añade `created_at` / `updated_at` con:

- `created_at`: `$default` a `CURRENT_TIMESTAMP`.
- `updated_at`: `$default` **y** `$onUpdate` a `CURRENT_TIMESTAMP`.

**No existen triggers SQL** para `updated_at`: la actualización automática la gestiona Drizzle con `$onUpdate` al generar el `UPDATE`. Al añadir una tabla nueva, usar el helper `timestamps` en lugar de crear ningún trigger.

### Gestión de borrado lógico (`deleted_at`)

Las tablas de negocio tienen columna `deleted_at` (nullable) y el esquema Drizzle mapea el filtro de filas "no borradas" en las consultas. Al consultar con Drizzle hay que filtrar por `isNull(deleted_at)` según el patrón de cada entidad.

---

## 4. Sistema de Cifrado Transparente

### Principio de funcionamiento

- El frontend opera **siempre en texto plano**; delega el cifrado/descifrado/enmascaramiento a `query_raw` declarando qué campos son `encryptedText(...)`.
- Rust cifra los valores sensibles al guardar (`encrypt_mask` en `query_raw`, para INSERT/UPDATE) y enmascara o descifra al leer (`mask_fields` / `decrypt_fields`).
- Los valores cifrados en SQLite tienen el prefijo `ENC:` seguido del valor en base64.
- Si un valor ya tiene el prefijo `ENC:` al llegar a Rust, **no se vuelve a cifrar**.
- Los campos vacíos se almacenan como string vacío, nunca como `ENC:`.
- **Lecturas sin descifrado**: `query_raw` recibe `mask_fields` y sustituye valores `ENC:` por `BLANK_VALUE` (sin abrir contexto cripto).
- **Lecturas con descifrado**: `query_raw` recibe `decrypt_fields` y descifra con la master key.
- **Escrituras**: `db.ts` aplica `stripEncryptedValues` antes del invoke para eliminar asignaciones con centinela/ENC:; `encrypt_mask` cifra los params marcados.

### Clave maestra

La master key (32 bytes) se guarda en el keychain del SO (`keyring` crate) bajo servicio `deployer-app` / cuenta `master-key`. `get_or_create_master_key()` la genera (CSPRNG del SO) y persiste la primera vez. `open_crypto_context()` devuelve `(pool, master_key)`; `open_pool()` devuelve solo el pool (para consultas sin cripto).

### Algoritmo

AES-256-GCM con nonce aleatorio de 12 bytes por cada cifrado.

### Configuración de campos cifrados (`encryptedText(...)` en `src/lib/schema-types.ts`)

| Tabla                     | Campo          | Uso |
| ------------------------- | -------------- | --- |
| `deployer_hosts`          | `password`     | Se cifra al escribir; se enmascara (no se expone en claro) al leer |
| `deployer_passkeys`       | `key_content`  | Se cifra al escribir; se enmascara al leer |
| `deployer_passkeys`       | `passphrase`   | Se cifra al escribir; se enmascara al leer |

> `generate_passkey` devuelve la passphrase en claro al frontend; el INSERT vía `encrypt_mask` la cifra al persistir.

---

## 5. Operaciones Docker Compose (`commands/projects/docker/compose/`)

Módulo que orquesta el despliegue remoto de `docker compose` sobre un host. Combina **SFTP** (subir archivos) + **SSH** (ejecutar docker).

### Flujo común (`operations.rs`)

1. `load_compose_with_files(app, docker_compose_id)`: abre contexto cripto, carga el compose (`host_id`, `remote_path`), carga sus archivos y conecta al host (`connect_to_host_by_id(..., attempts: 3, enabled_only: true)`).
2. `upload_all_compose_files()`: sube **todos** los archivos del compose vía SFTP al `remote_path`, creando directorios padre si hace falta. Los archivos `is_binary` se almacenan en BD como base64 y se decodifican al subir. Los archivos sin `content` se saltan.
3. Resuelve el nombre del archivo compose (`compose.yaml`/`compose.yml`/`docker-compose.yaml`/`docker-compose.yml`) con `find_compose_file_name()` (default `compose.yaml`).
4. Ejecuta el comando `docker compose -f <archivo>` en el directorio remoto con `run_in_dir()` (prefija `cd <dir> &&`, timeout 300 s).
5. Devuelve `CommandResponse` con clave i18n según éxito (`tauri.docker_composes.operations.*`).

### Comandos

- `project_docker_compose_up(input)` — sube archivos + `docker compose up -d`. Aplica `exit_code_message()` (exit 0 → `ok`, else `err` con `output`).
- `project_docker_compose_down(input)` — `docker compose down`.
- `project_docker_compose_ps(input)` → `CommandResponse<Vec<DockerComposeService>>` — parsea `docker compose ps --format json` (`parse_ps_output`, una línea = un JSON). Si exit != 0 devuelve `err`.
- `project_docker_compose_logs(input)` → `CommandResponse<String>` — `docker compose logs --tail 50`.
- `project_docker_compose_restart(input)` — `docker compose restart`.
- `project_docker_compose_pull(input)` — `docker compose pull`.

`input` es `DockerComposeOperationInput { docker_compose_id }` (ver `types.rs`).

### Sincronización de archivos (`files_commands.rs`)

`sync_project_docker_compose_files(input: SyncDockerComposeFilesInput)` sincroniza la lista de archivos de un compose **en una única transacción**:

- Insertar los nuevos (`file.id` ausente) y actualizar los existentes (`file.id` presente; si el id no pertenece al compose, se inserta).
- Borrar los que ya no están (los presentes se conservan por id).
- Devuelve la lista final de archivos con sus ids.

---

## 5.1 Consola remota (`commands/remote/`)

Comandos SSH/SFTP "sueltos" (no asociados a un compose) que usa la consola remota del frontend vía `useRemoteCommand.ts`:

- `ssh_execute_command(input, channel)`: abre sesión SSH + canal, ejecuta el comando con streaming de output por `Channel<RemoteConsoleEvent>` (eventos `output_chunk`, `finished` con `exit_code`, `error`). Acepta `working_dir` y `timeout_secs` (default 300). Devuelve `CommandResponse<RemoteCommandResult>` con `success: true` incluso si el comando remoto falla (exit != 0); el `exit_code` viaja en `data`. Si el exit code es desconocido se devuelve `-1`.
- `ssh_upload_file(input, channel)`: sube un archivo o directorio local (`local_path`) a `remote_path` vía SFTP. Auto-detecta archivo/directorio salvo que `recursive` sea `Some(true)`. Aplica `chmod` octal si se indica. Emite progreso por el mismo Channel.
- `ssh_download_file(input, channel)`: descarga `remote_path` a `local_path`. Si `local_path` es `None`, devuelve el contenido en `content_base64` (solo archivo simple). Detecta directorio remoto salvo que `recursive` sea `Some(true)`.
- Todos toman `channel: Channel<RemoteConsoleEvent>` **obligatorio** (no es opcional: `Channel` no implementa `Deserialize`).
- Errores de transporte (conexión, timeout) → `success: false` con `message_key` (`tauri.remote.errors.*`); el mensaje humanizado también se emite como evento `error` por el Channel.
- Estos comandos usan `connect_to_host_by_id(..., enabled_only: true)`.
- **Cancelación:** los tres comandos registran un `CancellationToken` en el estado `RemoteJobCancel` (compartido, `commands/remote/cancel.rs`) al empezar, y `ssh_cancel_remote_job` (sin args) cancela el job en curso. En `exec.rs` la cancelación se espera con `tokio::select!` sobre `token.cancelled()`; en `ssh/transfer.rs` todas las funciones aceptan `cancel: Option<&CancellationToken>` (`None` = nunca cancela) y comprueban el flag antes y entre operaciones. Al cancelar devuelven error con clave `tauri.remote.errors.cancelled`. **El frontend no debe lanzar varios jobs a la vez**: el estado solo guarda el último token.

---

## 6. Comando `query_raw` (proxy Drizzle para lecturas Y escrituras)

### Propósito

Único punto de entrada que permite al frontend ejecutar SQL arbitrario generado por Drizzle (modo proxy), tanto lecturas como escrituras, con cifrado/descifrado/enmascaramiento transparente de los campos declarados. Ver `src/lib/db.ts` para cómo el frontend lo invoca.

### Firma

```rust
query_raw(app, sql, params, encrypt_mask, decrypt_fields, mask_fields, is_write, is_read)
```

- `sql`: sentencia SQL generada por Drizzle (con placeholders `?`).
- `params`: `Option<Vec<JsonValue>>` bindeado en orden a la query.
- `encrypt_mask`: `Option<Vec<bool>>` — por cada parámetro, si `true` se cifra (solo aplica cuando `is_write`).
- `decrypt_fields`: `Option<Vec<String>>` — nombres de columna a descifrar (solo cuando `is_read`).
- `mask_fields`: `Option<Vec<String>>` — nombres de columna a enmascarar (solo cuando `is_read`). **Excluyente** con `decrypt_fields`.
- `is_write` / `is_read`: flags que indican el tipo de operación.

### Comportamiento

- Abre el contexto cripto (`open_crypto_context`) **solo** si hay cifrado o descifrado; para el resto abre solo el pool (`open_pool`).
- **Cifrado en INSERT/UPDATE** (`is_write && encrypt_mask`): cada parámetro marcado se cifra con `crypto::cipher::encrypt` si no está vacío y no empieza ya por `ENC:`.
- **Ejecuta siempre con `fetch_all()`** — devuelve filas reales (SELECT e INSERT/UPDATE/DELETE con `RETURNING`).
- **Descifrado en SELECT** (`is_read && decrypt_fields`): recorre las columnas y descifra las listadas con la master key.
- **Enmascaramiento en SELECT** (`is_read && mask_fields`): sustituye los valores con prefijo `ENC:` por `BLANK_VALUE` (sin master key). El frontend reconoce `BLANK_VALUE` y muestra un placeholder.
- Sin cripto: devuelve las filas convertidas a `Vec<Vec<JsonValue>>` (`rows_to_values`, convirtiendo tipos SQLite → JSON).

### Errores

Devuelve `CommandResponse::err` con claves `tauri.database.errors.query_raw_*` (open_pool_failed, execution_failed) — el SQL siempre se ejecuta dentro de `query_raw`; el frontend traduce los errores (y las restricciones UNIQUE/FK) a mensajes de usuario.

---

## 7. Dependencias Rust — Notas de Compatibilidad

| Crate        | Versión | Límite              | Motivo                                                                                                                                                                                                                     |
| ------------ | ------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rand`       | `0.10`  | No bajar            | Requiere feature `sys_rng` para `OsRng`/`SysRng`.                                                                                                          |
| `rand_core`  | `0.10`  | Alineado con `rand` | `rand 0.10` requiere `rand_core 0.10`; declarar `0.6` causaría conflictos de traits.                                                                                                                                       |
| `keyring`    | `4.1`   | —                   | `v1` (default) re-exporta `Entry`/`Error` en raíz. `Error` es `#[non_exhaustive]` — siempre usar catch-all en match. Feature `v1` incluye `windows-native-keyring-store` automáticamente en Windows. Datos v3 compatibles. |
| `russh`      | `0.62`  | —                   | `authenticate_publickey` requiere `PrivateKeyWithHashAlg`; `AuthResult` es enum. Solo se usa lado **cliente** (`client::Handler`); el breaking change de 0.62 en `channel_open_*` (server-side) no aplica.                 |
| `russh-sftp` | `2.3`   | —                   | `ReadDir` auto-filtra `.`/`..`. Patrón: `channel_open_session()` → `channel.request_subsystem(true, "sftp")` → `SftpSession::new(channel.into_stream())`.                                                                  |
| `aes-gcm`    | `0.11`  | —                   | `aead` 0.5→0.6: `encrypt`/`decrypt` ahora reciben `&nonce` (borrow). `Nonce::from_slice` deprecado, usar `Nonce::from(bytes)`. `OsRng` ya no se re-exporta desde `aead`.                                                   |
| `chrono`     | `0.4`   | —                   | Timestamps RFC3339 (p.ej. `last_checked_at`, `fetched_at`).                                                                                                                                                               |
| `sqlx`       | `0.8.6` | —                   | Queries dinámicas con `sqlx::query(&sql)`. No usar macros que requieran `DATABASE_URL`.                                                                                                                                    |
| `ts-rs`      | —       | —                   | Exporta los tipos de input/result de los comandos a `src/types/tauri-types.d.ts` (`#[ts(export, export_to = "tauri-types.d.ts")]`) en tiempo de build/check.                              |
