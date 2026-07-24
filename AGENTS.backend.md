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
├── database/
│   └── query_raw.rs                 <- Comando genérico de solo lectura (SELECT) para Drizzle
├── deployer_settings/
│   └── helpers.rs
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
│   │   ├── glob.rs                  <- Glob simple para exclude en file transfer
│   │   └── sftp_executor.rs         <- upload_file() + download_file()
│   ├── mod.rs
│   └── types.rs
├── docker_composes/
├── docker_hub_cache/
├── global_variables/
├── hosts/
│   ├── crud.rs
│   ├── mod.rs
│   ├── status.rs                    <- host_check_status (estático) + host_check_metrics (dinámico)
│   ├── test_connection.rs
│   ├── types.rs
│   └── updates.rs
├── migrations/
├── passkeys/
├── projects/
│   ├── crud/
│   ├── framework_configs/
│   ├── hosts/
│   ├── tasks/
│   │   └── types.rs                 <- TaskConfig, OnFailure, ProjectTask
│   ├── variables/
│   ├── mod.rs
│   └── types.rs                     <- Project con local_working_dir, remote_working_dir
├── ssh/
│   └── helpers.rs
├── store/
└── tasks/
    ├── crud/
    ├── dependencies/
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

Todas las tablas llevan el prefijo `deployer_`. No hay un archivo centralizado de constants — el nombre de tabla se define en la migración y en el atributo `#[db_table("...")]` del struct.

### Patrón: escritura batch (varios upserts en una transacción)

Para tablas tipo clave-valor (ej. `deployer_settings`), además del comando singular (`set_deployer_setting`, un solo `key`/`value`) existe un comando plural (`set_deployer_settings`) que acepta un `HashMap<String, String>` con 1 o varios pares y los aplica con `pool.begin()` / `tx.commit()` en una única transacción. Si algún upsert falla, se hace `tx.rollback()` y se devuelve error sin dejar cambios parciales.

El frontend solo debe llamar al comando plural (incluso para guardar un único ajuste, pasando un objeto de una clave); evita múltiples invocaciones IPC sueltas cuando hay que guardar varios valores a la vez (p. ej. un formulario completo de configuración). Mismo patrón a reutilizar si aparece otra tabla clave-valor o de ajustes en bloque.

### Migraciones

- Archivo: `src-tauri/migrations/0001_initial_schema.up.sql`
- Mientras la app esté en versión `0.1.0`, se usa un único archivo de migración inicial.
- A partir de `0.2.0`, usar archivos numerados adicionales.
- Tras cualquier migración nueva, regenerar `drizzle/schema.ts` siguiendo `drizzle/README.md` (aplicar la migración sobre `drizzle/dev.sqlite` y ejecutar `dev:db:generate`).

### Tablas actuales y campos destacados

| Tabla                   | Campos destacados                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `projects`              | `local_working_dir`, `remote_working_dir`                                                                                                              |
| `tasks`                 | `type`, `command`, `timeout`, `retry_count`, `retry_delay` (sin `working_dir`)                                                                         |
| `project_tasks`         | `config` (JSON TaskConfig), `local_working_dir`, `remote_working_dir`, `retry_count`, `retry_delay`                                                    |
| `deployment_executions` | `status`, `exit_code`, `output`, `retry_attempt`                                                                                                       |
| `hosts`                 | `auth_type`, `password` (cifrado), `key_id`, `system_info` (JSON), `status_info` (JSON)                                                          |
| `passkeys`              | `key_content` (cifrado), `passphrase` (cifrado)                                                                                                        |
| `framework_configs`     | Configuraciones clave-valor específicas por framework (ej. clave de secrets de Symfony). `value` acepta `is_secret` para cifrado condicional.          |
| `task_dependencies`     | Dependencias entre `project_tasks` (no entre `tasks` globales). `dependency_type`: `success` (esperar éxito), `failure` (ejecutar si falla), `always`. |

---

## 3. Proc-Macro `DbEntity`

El crate `deployer-macros` proporciona el derive macro `DbEntity` que genera automáticamente la implementación del trait homónimo.

### Atributos disponibles

| Atributo                                         | Nivel  | Descripción                                                                                                                                                                                                 |
| ------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#[db_table("nombre")]`                          | Struct | **Obligatorio.** Nombre de la tabla SQLite.                                                                                                                                                                 |
| `#[db_encrypt]`                                  | Campo  | Cifra siempre el campo. `expose = false` por defecto.                                                                                                                                                       |
| `#[db_encrypt(expose = true)]`                   | Campo  | Cifra siempre; descifra y expone el valor al frontend al leer.                                                                                                                                              |
| `#[db_conditional_encrypt(condition = "campo")]` | Campo  | Cifra solo si `campo` es `true` en la misma fila.                                                                                                                                                           |
| `#[db_rename("columna")]`                        | Campo  | El campo Rust usa un nombre de columna SQLite distinto. Imprescindible cuando el nombre natural de columna es palabra reservada de Rust (ej. `type`) y el campo se llama `task_type`/`r#type` en el struct. |

### CRÍTICO: sin `#[db_rename]`, el nombre de columna SIEMPRE es el nombre del campo Rust

`from_row()`, `to_fields()`, `to_fields_all()` y `from_fields()` generados por el macro usan **literalmente el identificador del campo Rust** como nombre de columna SQL (vía `field.try_get("nombre_campo")` y como clave en el `INSERT`/`UPDATE` dinámico de `db::insert`/`db::update_fields`). Si el nombre de campo Rust no coincide exactamente con el nombre de columna real de la migración, falla en **create, update Y read** (no solo en el punto donde se notó el error) porque todas esas operaciones pasan por el mismo `DbEntity`.

Caso real (sesión de julio 2026): `Task.task_type` tenía `#[serde(rename = "type")]` (para que el JSON/TypeScript expusiera el campo como `type`), pero **eso es solo un rename de serialización**, no de columna DB — son mecanismos completamente independientes. El macro siguía generando `row.try_get("task_type")` y `INSERT INTO tasks (task_type, ...)`, mientras la columna real (migración) se llama `type`. Síntoma: crear una task fallaba con "no such column: task_type". Fix: añadir soporte a `#[db_rename("columna")]` en el macro y aplicarlo en el campo (`#[db_rename("type")] pub task_type: TaskType`), **además** de corregir a mano cualquier lugar que construya `Vec<(String, Value)>` manualmente para un `UPDATE` parcial (ej. `crud_update_task.rs` tenía `"task_type".to_string()` hardcodeado en vez de `"type".to_string()` — el macro no puede arreglar ese código manual, hay que revisarlo caso a caso).

**Regla al añadir un campo cuyo nombre Rust deseado choca con una palabra reservada, o simplemente quieres que difiera del nombre de columna:** usar siempre `#[db_rename("columna_real")]` junto al campo, y grep del nombre de columna literal (`"columna_real".to_string()`) en cualquier comando `crud_update_*` que construya el `Vec<(String, Value)>` a mano en vez de vía `to_fields()`.

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

## 3.1 Updates parciales: `Patch<T>` + `db::update_fields`

### Problema que resuelve

Los `UpdateXInput` con campos `Option<T>` y merge `.or(current.campo)` **nunca pueden poner a `NULL` un campo opcional**: tanto la clave ausente en el JSON como un `null` explícito deserializan a `None`, así que `.or()` siempre conserva el valor actual. Es imposible borrar un campo nullable una vez que tiene valor.

### Solución: `Patch<T>` (en `commands/patch.rs`)

`Patch<T>` distingue los 3 estados posibles de un campo en un update parcial:

```rust
pub enum Patch<T> {
    Unset,      // la clave no vino en el JSON -> no tocar
    Null,       // vino como `null`           -> borrar (NULL en BD)
    Value(T),   // vino con un valor           -> actualizar
}
```

Se usa **solo en campos `NULL`-ables** de `UpdateXInput`. Los campos `NOT NULL` siguen usando `Option<T>` simple (no necesitan distinguir "borrar", solo "actualizar o no tocar").

```rust
#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateProjectInput {
    pub name: Option<String>,           // NOT NULL -> Option simple
    #[serde(default)]
    #[ts(optional = nullable)]
    pub description: Patch<String>,     // NULLABLE -> Patch
    pub enabled: Option<bool>,          // NOT NULL -> Option simple
}
```

- `#[serde(default)]` es **obligatorio** en cada campo `Patch<T>`: hace que, si la clave no aparece en el JSON, el campo se rellene con `Patch::Unset` vía `Default`, sin invocar al `Deserialize` de `Patch` (que nunca devuelve `Unset` por sí mismo).
- `#[ts(optional = nullable)]` es **obligatorio** para que `ts-rs` genere `campo?: T | null` en vez de un tipo obligatorio.

### TypeScript generado

```ts
export interface UpdateProjectInput {
	name?: string
	description?: string | null
	enabled?: boolean
}
```

Desde el frontend: omitir la clave = no tocar; `null` = borrar; valor = actualizar. Tauri serializa el `invoke` igual que `JSON.stringify`, así que esto funciona sin lógica adicional en Vue.

### Comando: sin `fetch_one` previo, `UPDATE` dinámico

Los comandos `crud_update_*` que migren a este patrón **dejan de hacer `fetch_one` + reconstruir la entidad completa**. En su lugar, construyen un `Vec<(String, serde_json::Value)>` solo con los campos presentes y llaman a `db::update_fields::<E>`:

```rust
let mut fields: Vec<(String, Value)> = Vec::new();

if let Some(name) = input.name {
    fields.push(("name".to_string(), Value::String(name)));
}
if let Some(v) = input.description.to_field_value() {
    fields.push(("description".to_string(), v));
}

match db::update_fields::<Project>(&pool, id, fields, cache, &key).await {
    Ok(true) => Ok(CommandResponse::ok_empty("projects.success.updated")),
    Ok(false) => Ok(CommandResponse::err("projects.errors.not_found", ...)),
    Err(e) => Ok(CommandResponse::err("projects.errors.update_failed", ...)),
}
```

`db::update_fields` (en `db/crud.rs`) construye un `UPDATE ... SET` únicamente con las columnas presentes en `fields` (principio de "dirty tracking", igual que Doctrine/Drizzle: solo se tocan las columnas indicadas explícitamente), aplica cifrado igual que `db::update`, y devuelve `Ok(false)` si no existe ninguna fila con ese `id` (en vez de error). **Nunca incluye `updated_at`** en el `SET`: esa columna se actualiza sola vía trigger SQL (ver §3.2), así que `update_fields` sirve igual para tablas con o sin esa columna.

### Estado de la migración

- ✅ Migradas a `Patch<T>` + `db::update_fields`: `projects`, `hosts`, `passkeys`, `global_variables`, `project_variables`, `framework_configs`, `tasks`, `project_tasks`, `project_hosts`, `deployments`, `deployment_executions`, `deployment_rollbacks`.
- `task_dependencies` **sí existe** como entidad (CRUD completo implementado en `commands/tasks/dependencies/`), pero no usa `Patch<T>`: su único campo editable (`dependency_type`) es `NOT NULL`, así que `UpdateTaskDependencyInput` usa `DependencyType` directo (sin `Option`/`Patch`).
- Nota especial: `global_variables.value`, `project_variables.value` y `framework_configs.value` tienen `#[db_conditional_encrypt(condition = "is_secret")]`. Si se actualiza `value` sin enviar `is_secret` en el mismo `input`, el comando consulta el `is_secret` actual en BD antes de construir `fields`, para que `apply_encryption` evalúe bien la condición (que solo mira el `Vec<(String, Value)>` que se le pasa, no el resto de la fila).

---

## 3.2 `updated_at` automático vía trigger SQL

Las 4 tablas con columna `updated_at` (`deployer_settings`, `deployer_passkeys`, `deployer_hosts`, `deployer_docker_composes`) tienen un trigger `AFTER UPDATE` en la migración (`0001_initial_schema.up.sql`):

```sql
CREATE TRIGGER deployer_hosts_trg_set_updated_at
AFTER UPDATE ON deployer_hosts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
UPDATE deployer_hosts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
```

La condición `WHEN NEW.updated_at = OLD.updated_at` evita la recursión infinita: la propia `UPDATE` del trigger vuelve a disparar el trigger, pero en esa segunda pasada `NEW.updated_at` (el `CURRENT_TIMESTAMP` recién puesto) ya no coincide con `OLD.updated_at`, así que la condición es falsa y no se repite.

Gracias a esto, **el código Rust nunca toca `updated_at`** en ningún `UPDATE`: ni `db::update_fields` lo añade, ni hace falta una variante separada para las tablas sin esa columna (`deployer_docker_hub_search_cache`, `deployer_docker_hub_tags_cache` simplemente no tienen trigger y `update_fields` funciona igual para ellas).

Si se añade una tabla nueva con `updated_at`, hay que crear su trigger correspondiente en la migración (y el `DROP TRIGGER` en el `.down.sql`).

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

| Tabla      | Campo         | encrypt | expose |
| ---------- | ------------- | ------- | ------ |
| `hosts`    | `password`    | 1       | 0      |
| `passkeys` | `key_content` | 1       | 0      |
| `passkeys` | `passphrase`  | 1       | 0      |

---

## 5. Runner Universal (`run_deployment`)

### Diseño

Comando Tauri que ejecuta un deployment completo. Usa un **IPC Channel** (Tauri 2) para emitir eventos de progreso en tiempo real al frontend, punto a punto por invocación.

```ts
// Frontend — uso típico
import { Channel, invoke } from '@tauri-apps/api/core'
import type { ProgressEvent } from '@/tauri-types'

const channel = new Channel<ProgressEvent>()
channel.onmessage = event => {
	/* actualizar UI */
}
await invoke('run_deployment', { input: { deployment_id: 123 }, channel })
```

### Eventos emitidos (`ProgressEvent`)

| Evento                | Descripción                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `deployment_started`  | Inicio; incluye `total_tasks`                                      |
| `task_pending`        | Task en cola antes de ejecutarse                                   |
| `task_started`        | Task comenzando ejecución                                          |
| `output_chunk`        | Fragmento de output acumulado (~100ms)                             |
| `task_retrying`       | Task reintentándose; incluye `attempt`, `delay_secs`               |
| `task_finished`       | Task finalizada; incluye `status`, `exit_code`, `duration_seconds` |
| `task_skipped`        | Task saltada; incluye `reason`                                     |
| `deployment_finished` | Deployment finalizado; incluye `status`, `duration_seconds`        |
| `fatal_error`         | Error que impide continuar                                         |

### Interpolación de variables (`{{variable}}`)

Las tablas `global_variables` y `project_variables` tienen dos campos de identificación:

- **`name`**: nombre visual para la interfaz (no se usa en interpolación).
- **`slug`**: identificador para interpolación en `{{slug}}`. Es único (global en `global_variables`, por proyecto en `project_variables`). Validado en frontend con regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

Precedencia (mayor sobreescribe):

1. Variables de proyecto (`project_variables`)
2. Variables globales (`global_variables`)
3. Variables de sistema (inyectadas automáticamente)

Variables de sistema disponibles:

| Variable                 | Valor                           |
| ------------------------ | ------------------------------- |
| `{{deployment_id}}`      | ID del deployment               |
| `{{version}}`            | Versión del deployment          |
| `{{tag}}`                | Tag del deployment              |
| `{{build}}`              | Número de build                 |
| `{{host}}`               | Hostname/IP del servidor        |
| `{{host_user}}`          | Usuario SSH                     |
| `{{remote_working_dir}}` | Working dir remoto del proyecto |
| `{{local_working_dir}}`  | Working dir local del proyecto  |

### `TaskConfig` — configuración por tipo

Almacenado como JSON en `project_tasks.config`. Solo requerido para `UploadFile` y `DownloadFile`.

`FileTransferConfig` usa una lista de `PathMapping` (`paths`) en vez de un único `src`/`dest`, para representar con la misma estructura 1 archivo, varios archivos sueltos, o un directorio completo:

```json
{
	"type": "upload_file",
	"overwrite": true,
	"paths": [
		{
			"src": "{{local_working_dir}}/dist",
			"dest": "{{remote_working_dir}}/public",
			"recursive": true,
			"exclude": ["*.map", ".git"],
			"chmod": "755"
		},
		{
			"src": "{{local_working_dir}}/.env.production",
			"dest": "{{remote_working_dir}}/.env",
			"recursive": false,
			"chmod": "600"
		}
	]
}
```

- `paths`: lista de mapeos; 1 elemento = archivo suelto o directorio (`recursive: true`); N elementos = varios archivos/directorios en la misma task, cada uno con su propio origen/destino.
- `overwrite` (a nivel de `FileTransferConfig`, no por mapeo): si `false`, se omite un archivo si el destino ya existe. Por defecto `true`. En directorios recursivos aplica archivo a archivo dentro del árbol.
- `exclude` (por mapeo, solo relevante si `recursive: true`): patrones glob simples (`*`, `?`) comparados contra el **nombre** de cada entrada, no la ruta completa (ver `run/glob.rs`, sin dependencias externas).
- `chmod` (por mapeo): permisos octales (ej. `"755"`, `"600"`) aplicados tras subir el archivo al servidor remoto. Solo tiene efecto en `UploadFile` (no hay chmod portable para el lado local Windows/Unix en descargas).
- Tipos Rust: `PathMapping` y `FileTransferConfig` en `commands/projects/tasks/types.rs`.

**Pendiente de verificar por Iván (`cargo check`):** dos piezas de `sftp_executor.rs` usan API de `russh-sftp` 2.0.6 que no pude confirmar offline al escribirlas (sin acceso al código fuente exacto del crate):

- `apply_chmod()`: usa `sftp.set_metadata(path, russh_sftp::protocol::FileAttributes { permissions: Some(mode), ..Default::default() })`.
- `download_recursive()`: usa `sftp.read_dir(path)` y asume que cada entrada tiene `.file_name()` y `.file_type().is_dir()`.

Si `cargo check` falla en alguno de los dos puntos, pegar el error de compilación para ajustar la firma exacta.

### Herencia de campos (project_task > project)

| Campo                | Fuente prioritaria                 | Fallback                      |
| -------------------- | ---------------------------------- | ----------------------------- |
| `local_working_dir`  | `project_tasks.local_working_dir`  | `projects.local_working_dir`  |
| `remote_working_dir` | `project_tasks.remote_working_dir` | `projects.remote_working_dir` |
| `retry_count`        | `project_tasks.retry_count`        | `tasks.retry_count`           |
| `retry_delay`        | `project_tasks.retry_delay`        | `tasks.retry_delay`           |

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

| Crate             | Versión | Límite              | Motivo                                                                                                                                                                                                                     |
| ----------------- | ------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rand`            | `0.10`  | No bajar            | Requiere feature `sys_rng` para `OsRng`. `SysRng` implementa `CryptoRng` directamente — no necesita `UnwrapErr`.                                                                                                           |
| `rand_core`       | `0.10`  | Alineado con `rand` | `rand 0.10` requiere `rand_core 0.10`; declarar `0.6` causaría conflictos de traits.                                                                                                                                       |
| `keyring`         | `4.1`   | —                   | `v1` (default) re-exporta `Entry`/`Error` en raíz. `Error` es `#[non_exhaustive]` — siempre usar catch-all en match. Feature `v1` incluye `windows-native-keyring-store` automáticamente en Windows. Datos v3 compatibles. |
| `russh`           | `0.62`  | —                   | `authenticate_publickey` requiere `PrivateKeyWithHashAlg`; `AuthResult` es enum. Solo se usa lado **cliente** (`client::Handler`); el breaking change de 0.62 en `channel_open_*` (server-side) no aplica.                 |
| `russh-sftp`      | `2.3`   | —                   | `ReadDir` auto-filtra `.`/`..`. Patrón: `channel_open_session()` → `channel.request_subsystem(true, "sftp")` → `SftpSession::new(channel.into_stream())`.                                                                  |
| `aes-gcm`         | `0.11`  | —                   | `aead` 0.5→0.6: `encrypt`/`decrypt` ahora reciben `&nonce` (borrow). `Nonce::from_slice` deprecado, usar `Nonce::from(bytes)`. `OsRng` ya no se re-exporta desde `aead`.                                                   |
| `chrono`          | `0.4`   | —                   | Timestamps RFC3339 para `started_at`/`finished_at`.                                                                                                                                                                        |
| `sqlx`            | `0.8.6` | —                   | Queries dinámicas con `sqlx::query(&sql)`. No usar macros que requieran `DATABASE_URL`.                                                                                                                                    |
| `deployer-macros` | local   | —                   | Proc-macro crate del workspace. Provee `ident_concat!` (reemplaza `paste`) y `DbEntity` derive.                                                                                                                            |
