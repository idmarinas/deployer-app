# Guía para Agentes - DeployerApp

Bienvenido al proyecto **DeployerApp**. Esta guía está diseñada para ayudar a los agentes de IA a comprender la arquitectura, las reglas y los estándares del proyecto para asegurar una colaboración eficiente.

## 1. Descripción del Proyecto
DeployerApp es una aplicación de escritorio diseñada para gestionar el despliegue de aplicaciones, inspirada en las funcionalidades de [DeployerPHP.org](https://deployer.org/).

Su objetivo es **sustituir DeployerPHP** en los proyectos por un único deployer centralizado, que permite desplegar cada proyecto con unos pasos configurables, sin necesidad de crear archivos de deploy por cada proyecto.

### Características Principales:
- **Ejecución Local:** Aplicación de escritorio multiplataforma (vía Tauri 2).
- **Configuración:** Almacenada en una base de datos **SQLite** local en el PC del usuario.
- **Importación:** Permite importar archivos de configuración existentes.
- **SSH:** Conexión a servidores remotos, ejecución de comandos y transferencia de archivos.
- **Cifrado transparente:** Los campos sensibles se cifran automáticamente en SQLite mediante AES-256-GCM. La clave maestra reside en el keychain del SO.

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
└── hosts/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_host.rs
    │   ├── crud_update_host.rs
    │   ├── crud_get_host.rs
    │   ├── crud_list_hosts.rs
    │   └── crud_delete_host.rs
    ├── helpers.rs       ← open_crypto_context() y utilidades compartidas
    ├── mod.rs
    ├── test_connection.rs
    └── types.rs         ← structs de la entidad e inputs
└── deployer_settings/       ← patrón clave-valor, sin DbEntity, sin cifrado
    ├── get_deployer_setting.rs
    ├── set_deployer_setting.rs  ← upsert (INSERT OR REPLACE)
    ├── list_deployer_settings.rs
    ├── delete_deployer_setting.rs
    ├── helpers.rs               ← re-exporta open_pool (no open_crypto_context)
    ├── mod.rs
    └── types.rs                 ← struct DeployerSetting { key, value: Option<String> }
└── deployments/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_deployment.rs
    │   ├── crud_update_deployment.rs   ← query manual (sin updated_at); status/started_at/finished_at/duration/notes
    │   ├── crud_get_deployment.rs
    │   ├── crud_list_deployments.rs    ← filtra por project_id, ORDER BY created_at DESC
    │   └── crud_delete_deployment.rs  ← CASCADE elimina executions y rollbacks
    ├── helpers.rs
    ├── mod.rs
    └── types.rs                       ← enum DeploymentStatus (pending|running|success|failed); compartido con rollbacks
└── deployment_executions/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_deployment_execution.rs
    │   ├── crud_update_deployment_execution.rs  ← query manual (sin updated_at)
    │   ├── crud_get_deployment_execution.rs
    │   ├── crud_list_deployment_executions.rs   ← filtra por deployment_id, ORDER BY created_at ASC
    │   └── crud_delete_deployment_execution.rs
    ├── helpers.rs
    ├── mod.rs
    └── types.rs                                ← enum ExecutionStatus (añade 'skipped'); re-exporta DeploymentStatus
└── deployment_rollbacks/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_deployment_rollback.rs
    │   ├── crud_update_deployment_rollback.rs   ← query manual (sin updated_at)
    │   ├── crud_get_deployment_rollback.rs
    │   ├── crud_list_deployment_rollbacks.rs    ← filtra por deployment_id, ORDER BY created_at DESC
    │   └── crud_delete_deployment_rollback.rs
    ├── helpers.rs
    ├── mod.rs
    └── types.rs                                ← re-exporta DeploymentStatus de deployments
└── passkeys/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_passkey.rs
    │   ├── crud_update_passkey.rs
    │   ├── crud_get_passkey.rs
    │   ├── crud_list_passkeys.rs
    │   └── crud_delete_passkey.rs
    ├── helpers.rs
    ├── mod.rs
    ├── generate_passkey.rs  ← genera par de claves SSH sin guardar en BD
    └── types.rs
└── framework_configs/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_framework_config.rs
    │   ├── crud_update_framework_config.rs   ← project_id/framework/key inmutables
    │   ├── crud_get_framework_config.rs
    │   ├── crud_list_framework_configs.rs    ← filtra por project_id, ORDER BY framework, key
    │   └── crud_delete_framework_config.rs
    ├── helpers.rs
    ├── mod.rs
    └── types.rs          ← enums Framework (symfony|laravel|nextjs|generic) y DataType (string|integer|boolean|json); value con cifrado condicional
└── global_variables/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_global_variable.rs
    │   ├── crud_update_global_variable.rs
    │   ├── crud_get_global_variable.rs
    │   ├── crud_list_global_variables.rs
    │   └── crud_delete_global_variable.rs
    ├── helpers.rs
    ├── mod.rs
    └── types.rs
└── project_hosts/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_project_host.rs
    │   ├── crud_update_project_host.rs   ← query manual (sin updated_at)
    │   ├── crud_get_project_host.rs
    │   ├── crud_list_project_hosts.rs    ← filtra por project_id, ORDER BY deploy_order
    │   └── crud_delete_project_host.rs
    ├── helpers.rs
    ├── mod.rs
    └── types.rs
└── project_tasks/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_project_task.rs
    │   ├── crud_update_project_task.rs   ← db::update genérico (tiene updated_at)
    │   ├── crud_get_project_task.rs
    │   ├── crud_list_project_tasks.rs    ← filtra por project_id, ORDER BY order_execution
    │   └── crud_delete_project_task.rs
    ├── helpers.rs
    ├── mod.rs
    └── types.rs          ← enum OnFailure (stop|continue|retry)
└── project_variables/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_project_variable.rs
    │   ├── crud_update_project_variable.rs
    │   ├── crud_get_project_variable.rs
    │   ├── crud_list_project_variables.rs   ← filtra por project_id (query manual)
    │   └── crud_delete_project_variable.rs
    ├── helpers.rs
    ├── mod.rs
    └── types.rs
└── task_dependencies/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_task_dependency.rs
    │   ├── crud_update_task_dependency.rs   ← query manual (sin updated_at); enum serializado con serde_json
    │   ├── crud_get_task_dependency.rs
    │   ├── crud_list_task_dependencies.rs   ← filtra por task_id
    │   └── crud_delete_task_dependency.rs
    ├── helpers.rs
    ├── mod.rs
    └── types.rs          ← enum DependencyType (success|failure|always)
└── tasks/
    ├── crud/
    │   ├── mod.rs
    │   ├── crud_create_task.rs
    │   ├── crud_update_task.rs
    │   ├── crud_get_task.rs
    │   ├── crud_list_tasks.rs
    │   └── crud_delete_task.rs
    ├── helpers.rs
    ├── mod.rs
    └── types.rs          ← incluye enum TaskType (command|upload_file|download_file|script)
```

Este mismo patrón debe seguirse para cualquier entidad nueva que requiera CRUD.

#### Listas filtradas por FK (ej. `project_variables`)

Cuando un `crud_list_*` necesita filtrar por una FK (ej. `WHERE project_id = ?`), el helper genérico `db::fetch_all` no es suficiente. En ese caso se usa `sqlx::query(&sql)` dinámico (con `&sql`, NO `AssertSqlSafe`) y se aplica el descifrado manualmente con `db::apply_decryption`. Para ello `apply_decryption` debe estar re-exportada en `db/mod.rs`:

```rust
pub use crud::{apply_decryption, delete, fetch_all, fetch_one, insert, update};
```

#### Añadir una nueva entidad con CRUD y cifrado

1. Crear `src/commands/<entidad>/types.rs` con el struct de la entidad derivando `DbEntity`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("nombre_tabla")]
pub struct MiEntidad {
    pub id: i64,
    pub name: String,
    #[db_encrypt(expose = false)]          // campo siempre cifrado, no expuesto al frontend
    pub secret: Option<String>,
    #[db_conditional_encrypt(condition = "is_secret")]  // cifrado condicional
    pub value: String,
    pub created_at: String,
    pub updated_at: String,
}
```

   Reglas del macro `DbEntity`:
   - `#[db_table("nombre")]` — **obligatorio** en el struct.
   - `#[db_encrypt]` o `#[db_encrypt(expose = true/false)]` — campo siempre cifrado. `expose = false` por defecto.
   - `#[db_conditional_encrypt(condition = "campo_booleano")]` — cifrado solo si `campo_booleano` es `true` en esa fila.
   - Los campos `id`, `created_at` y `updated_at` se excluyen automáticamente de `to_fields()`.
   - El enum usado como tipo de campo **debe** implementar `Default`, `Serialize` y `Deserialize`.

2. Crear `src/commands/<entidad>/helpers.rs` con una re-exportación de `commands::helpers`:
   ```rust
   pub use crate::commands::helpers::{get_master_key, open_crypto_context, open_pool};
   ```
3. Crear los cinco archivos de comandos en `src/commands/<entidad>/crud/`.
4. Registrar los comandos en `lib.rs`.
5. Añadir la configuración inicial de cifrado en la migración SQL correspondiente en la tabla `encryption_config`.

## 6. Proc-Macro `DbEntity` (`crates/deployer-macros`)

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
- `to_fields()` — serializa los campos del struct a pares `(String, serde_json::Value)`, **excluyendo** `id`, `created_at` y `updated_at`. Usa `.expect()` para que un fallo de serialización sea visible inmediatamente.
- `to_fields_all()` — igual que `to_fields()` pero incluyendo `id`, `created_at` y `updated_at`.
- `from_fields()` — reconstruye el struct desde un mapa de pares (tras descifrado). Usa `serde_json::from_value(...).unwrap_or_default()` por campo, por lo que el struct debe implementar `Default` (o todos sus tipos deben tenerlo).

### Requisitos del struct para usar el macro

- Derivar también `Serialize`, `Deserialize` (requeridos por el trait `DbEntity`).
- Los enums usados como tipo de campo deben implementar `Default`, `Serialize` y `Deserialize`. Marcar la variante por defecto con `#[default]`.
- Los valores por defecto de dominio para campos numéricos o booleanos los gestiona SQLite mediante las restricciones `DEFAULT` de la migración, no el macro.

## 7. Sistema de Cifrado Transparente

### Principio de funcionamiento
- El frontend opera **siempre en texto plano**.
- Rust cifra los valores sensibles al guardar y los descifra al leer, de forma automática.
- Los valores cifrados en SQLite tienen el prefijo `ENC:` seguido del valor en base64.
- Si un valor ya tiene el prefijo `ENC:` al llegar a Rust, **no se vuelve a cifrar** (evita doble cifrado al editar sin cambiar el campo).

### Clave maestra
- Se genera automáticamente en la primera ejecución.
- Se almacena en el **keychain del sistema operativo**:
  - Windows: Windows Credential Manager.
  - macOS: Keychain.
  - Linux: Secret Service.
- Módulo: `src/crypto/keyring.rs`.

### Algoritmo
- **AES-256-GCM** con nonce aleatorio de 12 bytes por cada cifrado.
- Módulo: `src/crypto/cipher.rs`.

### Configuración de campos cifrados (`encryption_config`)
La tabla `encryption_config` en SQLite controla qué campos se cifran y cómo se exponen:

| Columna | Descripción |
|---------|-------------|
| `table_name` | Nombre de la tabla |
| `field_name` | Nombre del campo |
| `encrypt` | `1` = se cifra al guardar |
| `expose` | `1` = se descifra al leer y se envía en texto plano al frontend |

- `expose = 0` (por defecto): el campo cifrado **no** se descifra al enviarlo al frontend. Rust lo usa internamente (ej. contraseñas SSH).
- `expose = 1`: el campo se descifra antes de enviarlo (ej. claves privadas que el frontend necesita).
- La configuración es modificable por el usuario desde la interfaz.
- Se cachea en memoria (`EncryptionConfigCache`) para evitar lecturas repetidas. La caché se invalida automáticamente al modificar `encryption_config`.

### Campos condicionales (`conditional_encrypted_fields`)
Para campos cuyo cifrado depende del valor de otro campo en la misma fila (ej. `value` solo si `is_secret = true`). Estas tablas **no** se configuran en `encryption_config`, sino directamente en el trait `DbEntity` de la entidad (o vía `#[db_conditional_encrypt(condition = "campo")]` en el macro).

### Configuración inicial de cifrado
| Tabla | Campo | encrypt | expose |
|-------|-------|---------|--------|
| `hosts` | `password` | 1 | 0 |
| `passkeys` | `key_content` | 1 | 0 |
| `passkeys` | `passphrase` | 1 | 0 |

## 8. Patrones de Acceso a Base de Datos

### useDatabase
El composable `useDatabase` gestiona la conexión SQLite y expone los métodos base de acceso:
- `load()`: Fuerza la inicialización de la conexión.
- `select<T>()`: Ejecuta un SELECT y devuelve un array tipado.
- `first<T>()`: Devuelve el primer resultado de un SELECT, o null.
- `execute()`: Ejecuta INSERT, UPDATE o DELETE. Devuelve `ExecuteResult`.
- `transaction(callback)`: Ver sección de transacciones más abajo.
- `beginTransaction()` / `commit()` / `rollback()`: Transacción manual explícita (uso avanzado).

> **Importante:** `useDatabase` (y `tauri-plugin-sql`) solo debe usarse para tablas **sin campos cifrados**. Para tablas con cifrado, usar los comandos Tauri CRUD (`invoke('crud_*')`).

### useQuery
El composable `useQuery` contiene todas las consultas de negocio organizadas por tabla.

#### Patrón OrThrow (obligatorio para métodos futuros)
Cada método de escritura debe tener **dos variantes**:

| Variante | Comportamiento | Cuándo usar |
|---|---|---|
| `saveXxx()` | Captura el error y devuelve `{ error: string \| null }` | Uso general, fuera de transacciones |
| `saveXxxOrThrow()` | Lanza la excepción tal cual | Dentro de `transaction()` |

La lógica real vive en `OrThrow`. La variante segura es un wrapper:

```ts
async function saveDeployerSettingsOrThrow(settings: Record<string, string>): Promise<ExecuteResult> {
  // lógica real — lanza si falla
}

async function saveDeployerSettings(settings: Record<string, string>): Promise<ExecuteResult> {
  try {
    return await saveDeployerSettingsOrThrow(settings)
  } catch (e) {
    console.error('Error saving app settings:', e)
    return { rowsAffected: 0, lastInsertId: 0, error: String(e) }
  }
}
```

### Transacciones con transaction()
Para operaciones relacionadas que deben ser atómicas (todas o ninguna), usar `transaction()`:

```ts
const { transaction } = useDatabase()
const { saveHostOrThrow, saveProjectOrThrow } = useQuery()

await transaction(async () => {
  await saveHostOrThrow(host)
  await saveProjectOrThrow(project)
})
```

**Reglas:**
- Dentro de `transaction()`, usar **siempre** las variantes `OrThrow`.
- Si cualquier operación lanza una excepción, se hace `ROLLBACK` automático.
- Si todo va bien, se hace `COMMIT` automático.
- Capturar el error fuera del `transaction()` con `try/catch`.

Este patrón es similar al **Unit of Work de Doctrine ORM**.

## 9. Dependencias Rust — Notas de Compatibilidad

| Crate | Versión usada | Límite | Motivo |
|-------|--------------|--------|---------|
| `rand` | `0.10` | No bajar a `0.8` | Requiere feature `sys_rng` para `OsRng`. Versiones anteriores tienen API diferente. |
| `rand_core` | `0.10` | Mantener sincronizado con `rand` | Debe coincidir con la versión de `rand` para evitar conflictos de traits. |
| `keyring` | `3` | No subir a `4+` | En `v4` el enum `Error` y la variante `NoEntry` son privados (`#[non_exhaustive]`). Requeriría cambios en `crypto/keyring.rs`. |
| `aes-gcm` | `0.10` | — | Estable, sin restricciones conocidas. |
| `sqlx` | `0.9` | — | Queries dinámicas con `sqlx::query(&sql)` (referencia a String). No usar `AssertSqlSafe` ni `sqlx::query!` / `sqlx::query_as!` (requieren `DATABASE_URL` en compilación). |
| `russh` | `0.61` | — | No usa crate separado `russh-keys`; las claves se gestionan con el crate `ssh-key`. |

## 10. Comandos Útiles
- `bun run tauri dev`: Inicia el servidor de desarrollo de Vite y Tauri.
- `bun run tauri build`: Genera el paquete de producción de la aplicación.

---
> [!TIP]
> Si encuentras alguna ambigüedad en los requerimientos, siempre pide aclaración antes de proceder, pero propón una solución inicial basada en estas directrices.
