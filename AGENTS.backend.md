# Guía de Backend - DeployerApp

> Guía específica para tareas de **Rust / Tauri**. Lee también [AGENTS.md](./AGENTS.md) para las reglas comunes.

---

## 1. Estructura de Comandos

Los comandos Tauri se organizan en `src-tauri/src/commands/`, **un archivo por comando**.

```
commands/
├── helpers.rs                       <- open_pool(), get_master_key(), open_crypto_context()
├── response.rs                      <- CommandResponse<T>
├── database/
│   └── query_raw.rs                 <- Comando genérico de solo lectura (SELECT) para Drizzle
├── deployer_settings/
├── deployments/
│   ├── crud/
│   ├── executions/
│   ├── rollbacks/
│   ├── run/                         <- Runner universal de deployments
│   │   ├── mod.rs                   <- Comando #[tauri::command] run_deployment
│   │   ├── types.rs                 <- RunDeploymentInput, ProgressEvent, VariableSnapshot, ResolvedTask
│   │   ├── runner.rs                <- Orquestador principal
│   │   ├── session.rs               <- Sesión SSH única con reconexión automática
│   │   ├── interpolator.rs          <- build_snapshot() + evaluate_condition()
│   │   ├── ssh_executor.rs          <- execute_command() + execute_script()
│   │   └── sftp_executor.rs         <- upload_file() + download_file()
│   ├── helpers.rs
│   ├── mod.rs
│   └── types.rs
├── global_variables/
├── hosts/
├── passkeys/
├── projects/
│   ├── crud/
│   ├── framework_configs/
│   ├── hosts/
│   ├── tasks/
│   │   └── types.rs                 <- TaskConfig, OnFailure, ProjectTask
│   ├── variables/
│   ├── helpers.rs
│   ├── mod.rs
│   └── types.rs                     <- Project con local_working_dir, remote_working_dir
└── tasks/
    ├── crud/
    ├── dependencies/
    ├── helpers.rs
    ├── mod.rs
    └── types.rs                     <- TaskType; retry_delay; sin working_dir
```

### Convenciones de comandos CRUD

- Los comandos CRUD se prefijan con `crud_` para identificación clara desde el frontend.
- Se organizan en una subcarpeta `crud/` dentro de la carpeta de cada entidad.
- Los errores se devuelven mediante `CommandResponse<T>` — nunca `unwrap()` ni `?` al frontend.
- Los comandos void devuelven `CommandResponse<()>` usando `ok_empty`.

### Orden de implementación (obligatorio)

1. Crear todos los archivos nuevos y modificar types existentes.
2. Conectar módulos (`mod.rs`) y registrar en `lib.rs` **siempre como último paso** — evita romper el build mientras el trabajo está en curso.

### Registro de plugins en `lib.rs`

El plugin `tauri_plugin_single_instance` debe ser **siempre el primero** en registrarse.

---

## 2. Base de Datos

### Acceso desde el frontend

- Las lecturas SELECT sobre tablas **sin campos cifrados** se hacen desde el frontend con **Drizzle en modo proxy** (`src/lib/db.ts`), que delega la ejecución al comando genérico `query_raw` (`src-tauri/src/commands/database/query_raw.rs`).
- `query_raw` valida que el SQL recibido sea un `SELECT` (rechaza cualquier otra instrucción) y devuelve las filas como JSON, sin aplicar descifrado.
- Las tablas con campos sensibles que deban descifrarse, y **todas las escrituras** (INSERT/UPDATE/DELETE), deben usar los comandos Tauri CRUD específicos — nunca pasar por `query_raw`.
- Antes de crear un nuevo comando `crud_get_*` / `crud_list_*`, comprobar si la tabla tiene campos cifrados o lógica especial. Si no los tiene, usar Drizzle en su lugar (ver tabla de decisión en `AGENTS.md` sección 6).

### Nombres de tablas

Centralizados en `src/constants/dbTables.ts`. Nunca escribir el nombre de una tabla como string literal fuera de ese archivo.

### Migraciones

- Archivo: `src-tauri/migrations/0001_initial_schema.up.sql`
- Mientras la app esté en versión `0.1.0`, se usa un único archivo de migración inicial.
- A partir de `0.2.0`, usar archivos numerados adicionales.
- Tras cualquier migración nueva, regenerar `drizzle/schema.ts` siguiendo `drizzle/README.md` (aplicar la migración sobre `drizzle/dev.sqlite` y ejecutar `bun run db:introspect`).

### Tablas actuales y campos destacados

| Tabla | Campos destacados |
|-------|------------------|
| `projects` | `local_working_dir`, `remote_working_dir` |
| `tasks` | `type`, `command`, `timeout`, `retry_count`, `retry_delay` (sin `working_dir`) |
| `project_tasks` | `config` (JSON TaskConfig), `local_working_dir`, `remote_working_dir`, `retry_count`, `retry_delay` |
| `deployment_executions` | `status`, `exit_code`, `output`, `retry_attempt` |
| `hosts` | `auth_type`, `password` (cifrado), `key_id` |
| `passkeys` | `key_content` (cifrado), `passphrase` (cifrado) |

---

## 3. Proc-Macro `DbEntity`

El crate `deployer-macros` proporciona el derive macro `DbEntity` que genera automáticamente la implementación del trait homónimo.

### Atributos disponibles

| Atributo | Nivel | Descripción |
|---|---|---|
| `#[db_table("nombre")]` | Struct | **Obligatorio.** Nombre de la tabla SQLite. |
| `#[db_encrypt]` | Campo | Cifra siempre el campo. `expose = false` por defecto. |
| `#[db_encrypt(expose = true)]` | Campo | Cifra siempre; descifra y expone el valor al frontend al leer. |
| `#[db_conditional_encrypt(condition = "campo")]` | Campo | Cifra solo si `campo` es `true` en la misma fila. |

### Métodos generados

- `table_name()` — nombre de la tabla.
- `encrypted_fields()` — campos con `#[db_encrypt]`.
- `conditional_encrypted_fields()` — campos con `#[db_conditional_encrypt]`.
- `from_row()` — construye el struct desde una `SqliteRow`.
- `to_fields()` — serializa campos **excluyendo** `id`, `created_at`, `updated_at`.
- `to_fields_all()` — igual pero incluyendo todos los campos.
- `from_fields()` — reconstruye el struct desde un mapa de pares (tras descifrado).

### Patrón para campos con `#[db_conditional_encrypt]`

`db::fetch_all` solo descifra por `encryption_config`, no resuelve campos condicionales. Usar siempre el patrón manual:

```rust
let sql = format!("SELECT * FROM {}", MyEntity::table_name());
let rows = sqlx::query(&sql).fetch_all(pool).await?;
for row in rows {
    let mut entity = MyEntity::from_row(&row)?;
    let mut fields = entity.to_fields_all();
    db::apply_decryption::<MyEntity>(&mut fields, cache, pool, key).await?;
    entity = MyEntity::from_fields(fields)?;
}
```

---

## 4. Sistema de Cifrado Transparente

### Principio de funcionamiento

- El frontend opera **siempre en texto plano**.
- Rust cifra los valores sensibles al guardar y los descifra al leer, de forma automática.
- Los valores cifrados en SQLite tienen el prefijo `ENC:` seguido del valor en base64.
- Si un valor ya tiene el prefijo `ENC:` al llegar a Rust, **no se vuelve a cifrar**.
- Los campos vacíos se almacenan como string vacío, nunca como `ENC:`.

### Algoritmo

AES-256-GCM con nonce aleatorio de 12 bytes por cada cifrado.

### Configuración de campos cifrados (`encryption_config`)

| Tabla | Campo | encrypt | expose |
|-------|-------|---------|--------|
| `hosts` | `password` | 1 | 0 |
| `passkeys` | `key_content` | 1 | 0 |
| `passkeys` | `passphrase` | 1 | 0 |

---

## 5. Runner Universal (`run_deployment`)

### Diseño

Comando Tauri que ejecuta un deployment completo. Usa un **IPC Channel** (Tauri 2) para emitir eventos de progreso en tiempo real al frontend, punto a punto por invocación.

```ts
// Frontend — uso típico
import { Channel, invoke } from '@tauri-apps/api/core'
import type { ProgressEvent } from '@/tauri-types'

const channel = new Channel<ProgressEvent>()
channel.onmessage = (event) => { /* actualizar UI */ }
await invoke('run_deployment', { input: { deployment_id: 123 }, channel })
```

### Eventos emitidos (`ProgressEvent`)

| Evento | Descripción |
|--------|-------------|
| `deployment_started` | Inicio; incluye `total_tasks` |
| `task_pending` | Task en cola antes de ejecutarse |
| `task_started` | Task comenzando ejecución |
| `output_chunk` | Fragmento de output acumulado (~100ms) |
| `task_retrying` | Task reintentándose; incluye `attempt`, `delay_secs` |
| `task_finished` | Task finalizada; incluye `status`, `exit_code`, `duration_seconds` |
| `task_skipped` | Task saltada; incluye `reason` |
| `deployment_finished` | Deployment finalizado; incluye `status`, `duration_seconds` |
| `fatal_error` | Error que impide continuar |

### Interpolación de variables (`{{variable}}`)

Precedencia (mayor sobreescribe):
1. Variables de proyecto (`project_variables`)
2. Variables globales (`global_variables`)
3. Variables de sistema (inyectadas automáticamente)

Variables de sistema disponibles:

| Variable | Valor |
|----------|-------|
| `{{deployment_id}}` | ID del deployment |
| `{{version}}` | Versión del deployment |
| `{{tag}}` | Tag del deployment |
| `{{build}}` | Número de build |
| `{{host}}` | Hostname/IP del servidor |
| `{{host_user}}` | Usuario SSH |
| `{{remote_working_dir}}` | Working dir remoto del proyecto |
| `{{local_working_dir}}` | Working dir local del proyecto |

### `TaskConfig` — configuración por tipo

Almacenado como JSON en `project_tasks.config`. Solo requerido para `UploadFile` y `DownloadFile`.

```json
{ "type": "upload_file", "src": "{{local_working_dir}}/dist", "dest": "{{remote_working_dir}}/public", "recursive": true }
{ "type": "download_file", "src": "{{remote_working_dir}}/storage/logs/app.log", "dest": "{{local_working_dir}}/.deployer/logs/" }
```

### Herencia de campos (project_task > project)

| Campo | Fuente prioritaria | Fallback |
|-------|--------------------|---------|
| `local_working_dir` | `project_tasks.local_working_dir` | `projects.local_working_dir` |
| `remote_working_dir` | `project_tasks.remote_working_dir` | `projects.remote_working_dir` |
| `retry_count` | `project_tasks.retry_count` | `tasks.retry_count` |
| `retry_delay` | `project_tasks.retry_delay` | `tasks.retry_delay` |

### Reanudación automática

Si el deployment tiene executions previas en `success`, el runner las salta. Si todas están en `success`, devuelve error informativo.

### Logs de output

Output completo en: `{local_working_dir}/.deployer/logs/execution_{id}.log`
En BD: truncado a 64 KB con nota si fue truncado.

### Sesión SSH

- Una única sesión SSH por host durante todo el deployment.
- Reconexión automática con backoff lineal de 2s.
- Intentos configurables via `RunDeploymentInput.ssh_reconnect_attempts` (por defecto: 3).

### Condiciones de task

```
"{{version}} == 1.0.0"   -> ejecutar solo si version es 1.0.0
"{{tag}} != hotfix"      -> ejecutar si tag no es hotfix
```

Si la condición no puede parsearse, se ejecuta la task (safe default).

---

## 6. Comando `query_raw` (lecturas para Drizzle)

### Propósito

Único punto de entrada que permite al frontend ejecutar SELECTs arbitrarios generados por Drizzle (modo proxy), sin necesidad de crear un comando Rust específico para cada consulta.

### Reglas de implementación

- Solo acepta sentencias que empiecen por `SELECT` (case-insensitive); cualquier otra instrucción se rechaza con error.
- No aplica descifrado: las filas devueltas son los valores crudos de SQLite. Por eso solo debe usarse desde el frontend para tablas sin campos cifrados, o para campos cifrados que el frontend no necesita ver en claro.
- Los parámetros llegan como `Vec<serde_json::Value>` y se bindean en orden a la query con `sqlx::query(&sql).bind(...)`.
- El resultado se devuelve como `Vec<HashMap<String, serde_json::Value>>`, con conversión de tipos SQLite → JSON (INTEGER → number, REAL → number, TEXT/BLOB → string, NULL → null).
- Disponible tanto en desarrollo como en producción (no usar `#[cfg(debug_assertions)]`), ya que es necesario para el funcionamiento normal de la app.

### Lo que NUNCA debe hacer `query_raw`

- Ejecutar INSERT, UPDATE, DELETE, ni ningún DDL.
- Descifrar campos cifrados.
- Saltarse la validación de que el SQL es un SELECT.

---

## 7. Dependencias Rust — Notas de Compatibilidad

| Crate | Versión | Límite | Motivo |
|-------|---------|--------|--------|
| `rand` | `0.10` | No bajar | Requiere feature `sys_rng` para `OsRng`. `SysRng` implementa `CryptoRng` directamente — no necesita `UnwrapErr`. |
| `rand_core` | `0.10` | Alineado con `rand` | `rand 0.10` requiere `rand_core 0.10`; declarar `0.6` causaría conflictos de traits. |
| `keyring` | `3` | No subir a `4+` | En `v4` el enum `Error` es `#[non_exhaustive]`. |
| `russh` | `0.61` | — | `authenticate_publickey` requiere `PrivateKeyWithHashAlg`; `AuthResult` es enum; sin `connection_timeout`. |
| `russh-sftp` | `2.0.6` | — | Patrón correcto: `channel_open_session()` → `channel.request_subsystem(true, "sftp")` → `SftpSession::new(channel.into_stream())`. El método `request_subsystem` está en el **Channel**, no en el Handle. |
| `chrono` | `0.4` | — | Timestamps RFC3339 para `started_at`/`finished_at`. |
| `sqlx` | `0.8.6` | — | Queries dinámicas con `sqlx::query(&sql)`. No usar macros que requieran `DATABASE_URL`. |
