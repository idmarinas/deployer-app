# Guía para Agentes - DeployerApp

Bienvenido al proyecto **DeployerApp**. Esta guía está diseñada para ayudar a los agentes de IA a comprender la arquitectura, las reglas y los estándares del proyecto para asegurar una colaboración eficiente.

## 1. Descripción del Proyecto
DeployerApp es una aplicación de escritorio diseñada para gestionar el despliegue de aplicaciones, inspirada en las funcionalidades de [DeployerPHP.org](https://deployer.org/).

Su objetivo es **sustituir DeployerPHP** en los proyectos por un único deployer centralizado, que permite desplegar cada proyecto con unos pasos configurables, sin necesidad de crear archivos de deploy por cada proyecto.

### Características Principales:
- **Ejecución Local:** Aplicación de escritorio multiplataforma (vía Tauri 2).
- **Configuración:** Almacenada en una base de datos **SQLite** local en el PC del usuario.
- **SSH:** Conexión a servidores remotos, ejecución de comandos y transferencia de archivos.
- **Cifrado transparente:** Los campos sensibles se cifran automáticamente en SQLite mediante AES-256-GCM. La clave maestra reside en el keychain del SO.
- **Runner universal:** Motor de ejecución de deployments via `run_deployment` (command, script, upload_file, download_file).

## 2. Stack Tecnológico
Es fundamental respetar el stack tecnológico elegido:
- **Frontend:** [Vue.js 3](https://vuejs.org/) con TypeScript y [Nuxt UI v3](https://ui.nuxt.com/) como librería de componentes (**no** como meta-framework).
- **Enrutamiento:** Vue Router directamente (no el enrutamiento basado en archivos de Nuxt).
- **Backend:** [Rust](https://www.rust-lang.org/) utilizando [Tauri 2](https://tauri.app/).
- **Estilos:** Tailwind CSS v4 (integrado en Nuxt UI).
- **Estado:** Pinia.
- **Base de Datos:** SQLite gestionada desde el backend en Rust.
- **Gestor de paquetes:** Bun.

## 3. Reglas de Oro (Obligatorias)
Estas reglas deben seguirse sin excepción:
1. **Idioma:** Responde siempre en **Español**.
2. **Archivos Protegidos:** NO modifiques archivos con extensión `.dist`, ni carpetas con sufijo `.dist`.
3. **Carpetas Restringidas:** NO modifiques contenido en `node_modules`, `vendor` o `var`.
4. **Flujo de Trabajo:** Antes de realizar cualquier cambio en el código, **crea un plan de implementación** y espera la aprobación del usuario.
5. **Dependencias:** Antes de instalar nuevas dependencias, comprueba las que ya existen en `package.json` y en `src-tauri/Cargo.toml`.
6. **Plugins Tauri:** El plugin `tauri_plugin_single_instance` debe ser **siempre el primero** en registrarse.
7. **Versiones de dependencias Rust:** No actualizar `rand_core` más allá de `0.6` ni `keyring` más allá de `3` sin adaptar el código del módulo `crypto/`. Ver sección 8.
8. **Orden de implementación:** Crear primero todos los archivos nuevos y modificar types existentes. Conectar módulos (`mod.rs`) y registrar en `lib.rs` siempre como **último paso**, para no romper el build mientras el trabajo está en curso.

## 4. Estructura del Proyecto
- `/src`: Lógica del Frontend (Vue + TypeScript).
  - `/components`: Componentes reutilizables de UI.
  - `/composables`: Lógica reactiva reutilizable de Vue.
  - `/constants`: Constantes globales del proyecto (ej. nombres de tablas de BD).
  - `/pages`: Vistas de la aplicación.
  - `/utils`: Funciones puras sin reactividad de Vue.
- `/src-tauri`: Lógica del Backend (Rust).
  - `src/commands/`: Comandos Tauri, **un archivo por comando**.
    - `src/commands/helpers.rs`: Helper compartido con `open_pool()`, `get_master_key()` y `open_crypto_context()`. Usado por todos los módulos con cifrado.
  - `src/crypto/`: Módulo de cifrado (keychain + AES-256-GCM).
  - `src/db/`: Módulo de base de datos genérico (trait, caché, CRUD).
  - `crates/deployer-macros/`: Crate de proc-macros para derivar traits automáticamente.
  - `migrations/`: Archivos SQL de migración de la base de datos.
  - `src/lib.rs`: Registro de comandos Tauri y estado global.
  - `tauri.conf.json`: Configuración de la aplicación Tauri.

## 5. Convenciones de Desarrollo

### Frontend (Vue)
- Prioriza el uso de componentes de **Nuxt UI** para mantener la coherencia visual.
- Usa **TypeScript** para todo el desarrollo.
- Usa **`@/`** como alias para la carpeta `src/`.
- El acceso directo a SQLite desde el frontend (vía `tauri-plugin-sql`) solo es válido para tablas **sin campos cifrados**. Las tablas con campos sensibles deben usar los comandos Tauri CRUD correspondientes.

### Composables vs Utilidades
- **`/composables`**: Solo para lógica que usa reactividad de Vue (`ref`, `computed`, `onMounted`, etc.).
- **`/utils`**: Para funciones puras sin reactividad. Si una función no necesita Vue, va aquí.

### Constantes de Base de Datos
Los nombres de las tablas están centralizados en `src/constants/dbTables.ts`:

```ts
export const DB_TABLES = {
  DEPLOYER_SETTINGS: 'deployer_settings',
} as const
```

**Nunca escribir el nombre de una tabla como string literal** fuera de este archivo. Si cambia el nombre en la BD, solo se actualiza aquí.

### Backend (Rust)

#### Comandos generales
- Implementa cada comando Tauri en un archivo individual dentro de `src-tauri/src/commands/`.
- Regístralos en `lib.rs`.
- La lógica de acceso a SQLite debe centralizarse en el backend para garantizar seguridad y rendimiento.
- Los errores se gestionan en Rust y se devuelven al frontend mediante `CommandResponse<T>`. Los comandos **nunca** deben hacer `unwrap()` ni propagar errores con `?` al frontend directamente.

#### Comandos CRUD
Los comandos CRUD se organizan en una subcarpeta `crud/` dentro de la carpeta de cada entidad, y se prefijan con `crud_` para que queden claramente identificados desde el frontend:

```
commands/
├── deployer_settings/
├── deployments/
│   ├── crud/
│   ├── executions/
│   ├── rollbacks/
│   ├── run/                         ← Runner universal de deployments
│   │   ├── mod.rs                   ← Comando #[tauri::command] run_deployment
│   │   ├── types.rs                 ← RunDeploymentInput, ProgressEvent, VariableSnapshot, ResolvedTask
│   │   ├── runner.rs                ← Orquestador principal
│   │   ├── session.rs               ← Sesión SSH única con reconexión automática
│   │   ├── interpolator.rs          ← build_snapshot() + evaluate_condition()
│   │   ├── ssh_executor.rs          ← execute_command() + execute_script()
│   │   └── sftp_executor.rs         ← upload_file() + download_file()
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
│   ├── variables/
│   ├── helpers.rs
│   ├── mod.rs
│   └── types.rs                     ← local_working_dir, remote_working_dir en Project
└── tasks/
    ├── crud/
    ├── dependencies/
    ├── helpers.rs
    ├── mod.rs
    └── types.rs                     ← TaskType; sin working_dir; retry_delay añadido
```

## 6. Runner Universal (`run_deployment`)

### Diseño

El comando `run_deployment` es el motor de ejecución de deployments. Usa un **IPC Channel** (Tauri 2) para emitir eventos de progreso en tiempo real al frontend, punto a punto por invocación.

```ts
// Frontend — uso típico
import { Channel } from '@tauri-apps/api/core'
import type { ProgressEvent } from '@/tauri-types'

const channel = new Channel<ProgressEvent>()
channel.onmessage = (event) => { /* actualizar UI */ }
await invoke('run_deployment', { input: { deploymentId: 123 }, channel })
```

### Eventos emitidos (`ProgressEvent`)

| Evento | Descripción |
|--------|-------------|
| `deployment_started` | Inicio del deployment; incluye `total_tasks` |
| `task_pending` | Task en cola, antes de ejecutarse |
| `task_started` | Task comenzando ejecución |
| `output_chunk` | Fragmento de output acumulado (~100ms) |
| `task_retrying` | Task reintentándose; incluye `attempt`, `delay_secs` |
| `task_finished` | Task finalizada; incluye `status`, `exit_code`, `duration_seconds` |
| `task_skipped` | Task saltada; incluye `reason` |
| `deployment_finished` | Deployment finalizado; incluye `status`, `duration_seconds` |
| `fatal_error` | Error que impide continuar |

### Interpolación de variables (`{{variable}}`)

Precedencia (mayor a menor, el más alto sobreescribe):
1. Variables de proyecto (`project_variables`)
2. Variables globales (`global_variables`)
3. Variables de sistema (inyectadas por el runner)

Variables de sistema disponibles automáticamente:

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

### `TaskConfig` — configuración específica por tipo

Almacenado como JSON en `project_tasks.config`. Solo requerido para `UploadFile` y `DownloadFile`; `Command` y `Script` usan `tasks.command` directamente.

```json
// UploadFile
{ "type": "upload_file", "src": "{{local_working_dir}}/dist", "dest": "{{remote_working_dir}}/public", "recursive": true }

// DownloadFile
{ "type": "download_file", "src": "{{remote_working_dir}}/storage/logs/app.log", "dest": "{{local_working_dir}}/.deployer/logs/" }
```

### Herencia de campos (project_task > project)

| Campo | Fuente 1 (prioritaria) | Fuente 2 (fallback) |
|-------|----------------------|---------------------|
| `local_working_dir` | `project_tasks.local_working_dir` | `projects.local_working_dir` |
| `remote_working_dir` | `project_tasks.remote_working_dir` | `projects.remote_working_dir` |
| `retry_count` | `project_tasks.retry_count` | `tasks.retry_count` |
| `retry_delay` | `project_tasks.retry_delay` | `tasks.retry_delay` |

### Reanudación automática

Si el deployment tiene executions previas en `success`, el runner las salta automáticamente. Si todas están en `success`, devuelve error informativo ("ya completado").

### Logs de output

El output completo de cada execution se guarda en:
```
{local_working_dir}/.deployer/logs/execution_{id}.log
```
En BD se almacena truncado a 64 KB con nota al pie si fue truncado.

### Sesión SSH

- Una única sesión SSH por host durante todo el deployment (más eficiente).
- Reconexión automática con backoff lineal de 2s si la sesión cae.
- Intentos configurables via `RunDeploymentInput.ssh_reconnect_attempts` (por defecto: 3).

### Condiciones de task

Sintaxis simple evaluada por `evaluate_condition()`:
```
"{{version}} == 1.0.0"   →  ejecutar solo si version es 1.0.0
"{{tag}} != hotfix"      →  ejecutar si tag no es hotfix
```
Si la condición no puede parsearse, se ejecuta la task (safe default).

## 7. Proc-Macro `DbEntity` (`crates/deployer-macros`)

El crate `deployer-macros` proporciona el derive macro `DbEntity` que genera automáticamente la implementación del trait homónimo.

### Atributos disponibles

| Atributo | Nivel | Descripción |
|---|---|---|
| `#[db_table("nombre")]` | Struct | **Obligatorio.** Nombre de la tabla SQLite. |
| `#[db_encrypt]` | Campo | Cifra siempre el campo. `expose = false` por defecto. |
| `#[db_encrypt(expose = true)]` | Campo | Cifra siempre; descifra y expone el valor al frontend al leer. |
| `#[db_conditional_encrypt(condition = "campo")]` | Campo | Cifra solo si `campo` es `true` en la misma fila. |

### Lo que genera el macro

- `table_name()` — devuelve el string de `#[db_table]`.
- `encrypted_fields()` — array estático con los campos marcados con `#[db_encrypt]` y su flag `expose`.
- `conditional_encrypted_fields()` — array estático con los campos marcados con `#[db_conditional_encrypt]`.
- `from_row()` — construye el struct desde una `SqliteRow` con `try_get` por cada campo.
- `to_fields()` — serializa los campos del struct a pares `(String, serde_json::Value)`, **excluyendo** `id`, `created_at` y `updated_at`.
- `to_fields_all()` — igual que `to_fields()` pero incluyendo `id`, `created_at` y `updated_at`.
- `from_fields()` — reconstruye el struct desde un mapa de pares (tras descifrado).

## 8. Sistema de Cifrado Transparente

### Principio de funcionamiento
- El frontend opera **siempre en texto plano**.
- Rust cifra los valores sensibles al guardar y los descifra al leer, de forma automática.
- Los valores cifrados en SQLite tienen el prefijo `ENC:` seguido del valor en base64.
- Si un valor ya tiene el prefijo `ENC:` al llegar a Rust, **no se vuelve a cifrar**.

### Algoritmo
- **AES-256-GCM** con nonce aleatorio de 12 bytes por cada cifrado.

### Configuración de campos cifrados (`encryption_config`)

| Tabla | Campo | encrypt | expose |
|-------|-------|---------|--------|
| `hosts` | `password` | 1 | 0 |
| `passkeys` | `key_content` | 1 | 0 |
| `passkeys` | `passphrase` | 1 | 0 |

## 9. Dependencias Rust — Notas de Compatibilidad

| Crate | Versión usada | Límite | Motivo |
|-------|--------------|--------|---------|
| `rand` | `0.10` | No bajar a `0.8` | Requiere feature `sys_rng` para `OsRng`. |
| `rand_core` | `0.10` | Sincronizado con `rand` | Debe coincidir para evitar conflictos de traits. |
| `keyring` | `3` | No subir a `4+` | En `v4` el enum `Error` es `#[non_exhaustive]`. |
| `russh` | `0.61` | — | `authenticate_publickey` requiere `PrivateKeyWithHashAlg`; `AuthResult` es enum; `connection_timeout` eliminado. |
| `russh-sftp` | `2.0.6` | — | Subsistema SFTP para upload/download. |
| `chrono` | `0.4` | — | Timestamps RFC3339 para `started_at`/`finished_at` en runner. |
| `sqlx` | `0.8.6` | — | Queries dinámicas con `sqlx::query(&sql)`. No usar `AssertSqlSafe` ni macros que requieran `DATABASE_URL`. |

## 10. Comandos Útiles
- `bun run tauri dev`: Inicia el servidor de desarrollo de Vite y Tauri.
- `bun run tauri build`: Genera el paquete de producción de la aplicación.

---
> [!TIP]
> Si encuentras alguna ambigüedad en los requerimientos, siempre pide aclaración antes de proceder, pero propón una solución inicial basada en estas directrices.
