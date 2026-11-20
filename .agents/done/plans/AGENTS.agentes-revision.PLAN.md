# Plan: Revisión de los archivos AGENTS (inconsistencias con el estado real)

## Estado

**Completado**

---

## Instrucciones dadas (verbatim)

> Extraído de `AGENTS.todo.md` (tarea 1 de `### Tareas`):

1. Revisión de los archivos AGENTS.md, AGENTS.frontend.md y AGENTS.backend.md
   1. Hay que buscar inconsistencias de lo que dice el AGENTS con el estado real del proyecto.

---

## Resumen

El proyecto fue reestructurado en profundidad (modelo *compose-centric*, migración del backend CRUD Rust por entidad a un modelo Drizzle proxy en el que `query_raw` hace lecturas **y** escrituras con cifrado, se retiraron los catálogos de projects/tasks/variables/deployments y el runner universal de deployments a `_archived.dist/`/`.back`), pero los tres archivos AGENTS no se actualizaron. Este plan documenta la revisión completa (evidencia) y las correcciones concretas a aplicar a `AGENTS.md`, `AGENTS.frontend.md` y `AGENTS.backend.md` para que describan fielmente el estado real.

---

## Contexto actual (análisis y evidencia)

> Verificación hecha contra el código activo (agentes de exploración en paralelo + verificación directa). Nada modificado aún.

### Hallazgo global

- Todo lo que describen los AGENTS sobre **CRUD Rust por entidad**, **Runner universal `run_deployment` / `ProgressEvent`**, **crate `deployer-macros` / derive `DbEntity` / macro `crud_commands!`**, y los **catálogos de projects/tasks/variables/deployments** pertenece a una versión **archivada** (`src-tauri/_archived.dist/`, `src/loaders/*.back`, `src/composables/queries/*.back`, `src/components/pages/*/.../*.back`). No es código activo.

### Tablas reales de la BD (`src-tauri/migrations/20260826191046_initial_deployer-app_tables_0.1.0.sql`)

1. `deployer_hosts` (password cifrado, key_id, system_info, status_info, server_updates)
2. `deployer_passkeys` (key_content, passphrase cifrados, key_type, fingerprint)
3. `deployer_settings` (clave-valor `key`/`value`)
4. `deployer_projects_docker_compose`
5. `deployer_projects_docker_compose_files`
6. `deployer_cache_projects_docker_search`
7. `deployer_cache_projects_docker_tags`

(NO existen: `deployer_projects`, `deployer_tasks`, `deployer_project_tasks`, `deployer_task_dependencies`, `deployer_deployment_*`, `deployer_framework_configs`, `deployer_global_variables`, `deployer_project_variables`, `deployer_docker_hub_*`, `deployer_custom_*`.)

### Backend Rust (`src-tauri/src/`)

- `commands/` reales: `cache/docker` (search/tags/types), `database` (`store/`, `query_raw.rs`, `initialize_database.rs`, `create_database_file.rs`, `validate_database_sqlite.rs`, `get_app_info.rs`, `get_database_info.rs`, `get_migrations_info.rs`, `execute_migrations.rs`, `has_migrations_pending.rs`, `helpers.rs`), `hosts` (types/status/test_connection/updates), `passkeys` (generate_passkey/export_public_key/derive_passkey_info/types), `projects/docker/compose` (files_commands/files_types/operations/types), `remote` (exec/transfer/cancel/types).
- **NO** están `crud/`, `description.rs`, `macros.rs`, `commands/deployments/`, `commands/deployer_settings/`, `commands/global_variables/`, `commands/tasks/`, `commands/docker/` (rutas antiguas).
- `helpers.rs`, `patch.rs`, `response.rs`, `crypto/` (cipher/keyring), `ssh/` (connect/glob/helpers/session/transfer) **sí** existen.
- Sistema de cifrado AES-256-GCM (nonce 12 B, prefijo `ENC:`, `BLANK_VALUE`) **vigente** en `crypto/`.
- Comandos SSH sueltos (`commands/remote/`) y su doc del AGENTS.backend §5 **vigentes**.
- `query_raw.rs` real: **ya NO es solo SELECT**; acepta `is_write`/`is_read`, hace `encrypt_mask`/`decrypt_fields`/`mask_fields`. El frontend escribe vía `query_raw`.
- Cargo.toml: un único crate `DeployerApp` (lib `deployer_app_lib`). **No existe workspace ni `deployer-macros`.** Versiones de `rand/rand_core 0.10`, `keyring 4.1`, `russh 0.62`, `russh-sftp 2.3`, `aes-gcm 0.11`, `chrono 0.4`, `sqlx 0.8.6` → correctas.

### Frontend (`src/`)

- `src/` real además de lo documentado tiene: `composables/`, `lib/`, `locales/`, `schemas/` (compose-spec.json, composer-schema.json), `types/` (entities.ts, tauri-types.d.ts).
- Theme real (`theme/`): 24 temas + index. Faltan en la lista del AGENTS §1: `dashboardPanel.ts`, `radioGroup.ts` (existen, registrados en vite.config).
- `src/utils/icons.ts`: `ModuleName` = 8 módulos (`hosts | projects | deployments | variables | global_variables | passkeys | tasks | docker_composes`) — no 6 como dice el AGENTS §4b.
- Páginas reales `src/pages/dashboard/`: `app/`, `hosts/`, `passkeys/`, `projects/docker/compose/`, `console.vue`, `theme.vue`. **No** hay listado de projects, tasks, variables, deployments, custom_tables.
- Catálogo tasks/projects/variables/deployments solo como `.back`.
- Nombres reales: `ComposeJsonSchema.vue` / `ComposerJsonSchema.vue` (el AGENTS dice `ComposeEditor.vue`/`ComposerEditor.vue`).
- `useToolbarContent.ts` (con `useToolbarContentCreate`/`Edit`, etc.) → existe.
- JSON-Schema: `src/utils/schema-form/*` y `src/components/form/schema/*` y `src/composables/useSchemaToForm.ts` y `tests/` → existen.

### package.json / scripts

Scripts reales: `dev`, `build`, `preview`, `tauri`, `tauri:dev`, `i18n:types`, `drizzle:flatten`, `drizzle:generate`.
- **`build` = `"vue-tsc --noEmit && vite build"`** — NO ejecuta `i18n:types` (el AGENTS.md y frontend dicen que sí).
- **NO** existe `dev:db:generate`.
- **NO** existe `drizzle:migrate`.
- `drizzle:generate` = `bun scripts/migrate-drizzle.ts` → en realidad hace **generate + flatten** juntos (equivalente a lo que AGENTS llama `drizzle:migrate`). `drizzle:flatten` = `bun scripts/flatten-drizzle-migrations.ts`.
- Scripts `scripts/*.ts`: `generate-i18n-schema.ts`, `flatten-drizzle-migrations.ts`, `migrate-drizzle.ts`.
- Dependencias nuevas no mencionadas: `@tauri-apps/plugin-store`, `@tauri-apps/plugin-positioner`, `@tauri-apps/plugin-window-state`, `@iconify-json/cib`, `@iconify-json/vscode-icons`, `sortablejs`, `@vueuse/integrations`, `yaml`, `slugify`, `drizzle-orm`.
- Versionados: `vite ^8.2.2` (AGENTS dice `^8.1.3`).

### Varios

- `drizzle/` real **no contiene `README.md`** (AGENTS.md lo menciona como excepción del "no editar").
- `src/constants/dbTables.ts` **ya no existe** (la regla "obsoleto, no importarlo" queda huérfana).
- `src/lib/` real: `db.ts` (Drizzle `sqlite-proxy` → `invoke('query_raw')`), `schema.ts`, `schema-types.ts` (definición de campos cifrados en frontend: `encryptedText(...)`), `relations.ts`, `files.ts`, `columns.helpers.ts`, más `docker-compose/` y `entities/`.

---

## Decisiones tomadas

| Decisión | Elección |
| --- | --- |
| Alcance | Revisar los 3 archivos AGENTS y corregir lo que ya no describe el código activo. |
| Enfoque | Documentar las inconsistencias detectadas y aplicar las correcciones directamente en `AGENTS.md`, `AGENTS.frontend.md`, `AGENTS.backend.md`. No se cambia código de la app. |
| Completitud | El plan acumula toda la evidencia de inconsistencias; la implementación edita los documentos para reflejar el estado real. |

---

## Diseño de detalle (correcciones a aplicar)

### `AGENTS.md`

1. **Tabla "Stack"**: actualizar `vite ^8.1.3` → `^8.2.2` (confirmar con lockfile).
2. **Sección "Comandos"**: reescribir para reflejar los scripts reales:
   - `bun run dev` → `i18n:types && vite` (correcto).
   - `bun run build` → `vue-tsc --noEmit && vite build` (quitar `i18n:types`).
   - `bun run tauri:dev` → `tauri dev -c src-tauri/tauri.conf.json -c src-tauri/tauri.dev.conf.json`.
   - Eliminar `dev:db:generate` y `drizzle:migrate` (no existen).
   - `drizzle:generate` → nota de que ejecuta generate + flatten juntos.
   - Mantener `i18n:types` y `drizzle:flatten`.
3. **Sección "Propósito del Backend" / "Lecturas Drizzle vs comandos Rust"**: actualizar a la realidad de que **todas** las operaciones (lecturas y escrituras) van por Drizzle proxy → `query_raw`, que cifra/descifra/enmascara y acepta `is_write`. Los comandos Rust dedicados quedan para operaciones con lógica de backend (SSH/SFTP, cripto de claves, caché Docker Hub, inicialización/gestión de BD).
4. **Reglas**:
   - Quitar/ajustar la regla de `src/constants/dbTables.ts` (ya no existe).
   - Ajustar `drizzle/` "completo excepto `README.md`" (no hay README.md; en la práctica solo contiene `migrations/`).
   - Ajustar la regla "Antes de crear comando `crud_get_*`/`crud_list_*`... usar Drizzle" → ya no aplica a comandos CRUD por entidad; sustituir por la guía real (Drizzle para todo; comando Rust solo con lógica de backend).
5. **Gotchas**: revisar y conservar los que siguen vigentes (Pinia Colada shallowRef, single_instance primero, i18n, drag&drop, Vite ignora src-tauri, JSON-Schema). Eliminar/ajustar los obsoletos.

### `AGENTS.frontend.md`

1. **§1 Estructura**: añadir a `src/` las carpetas reales (`composables/`, `lib/`, `locales/`, `schemas/`, `types/`) y actualizar el árbol/lista de loaders (solo `deployerApp.ts`, `docker_composes.ts`, `hosts.ts`, `passkeys.ts` activos; projects/tasks/global_variables solo `.back`).
2. **§1 lista de `theme/`**: añadir `dashboardPanel.ts` y `radioGroup.ts`.
3. **§4b iconos**: corregir "6 módulos" → "8 módulos" (`hosts | projects | deployments | variables | global_variables | passkeys | tasks | docker_composes`); corregir la sección "Migración completada" (solo páginas reales: `app`, `hosts`, `passkeys`, `projects/docker/compose`; eliminar mención a tasks/variables/deployments como páginas).
4. **§5 i18n**: corregir la afirmación de que `build` ejecuta `i18n:types` (en realidad solo `dev`).
5. **§6 / §6c** y demás referencias a `useProjectById`/`ProjectTab*`/`TaskForm`/catálogo de tasks/task_dependencies: eliminar o marcar como archivado, ya que esos sistemas no están activos. Conservar lo que sí vive: consola remota (`useRemoteCommand`, `RemoteConsole.vue`), `ToggleEnabled.vue`, `countWhere`/`shared.ts`, esquema hosts.
6. **§8 JSON-Schema**: corregir nombres `ComposeEditor.vue`→`ComposeJsonSchema.vue`, `ComposerEditor.vue`→`ComposerJsonSchema.vue`.

### `AGENTS.backend.md`

1. **§1 Estructura del crate**: reescribir con la estructura real `commands/{cache/docker, database, hosts, passkeys, projects/docker/compose, remote}`, `crypto/`, `ssh/`, `helpers.rs`, `patch.rs`, `response.rs`. Eliminar referencias a `commands/deployments`, `deployer_settings`, `global_variables`, `tasks`, `crud/`, `description.rs`, `macros.rs`, `commands/docker/hub_cache`.
2. **§2 Base de Datos**: actualizar las tablas reales, eliminar `set_deployer_settings`/batch analytics de tablas inexistentes, y reescribir la regla de acceso (Drizzle proxy para todo, `query_raw` con cifrado/is_write).
3. **§3 Proc-Macro `DbEntity` / `deployer-macros`**: eliminar (no existe en el código activo).
4. **§3.1 `Patch<T>` + `db::update_fields`**: revisar si `patch.rs` sigue vigente (existe el archivo) y ajustar la narrativa para que no mencione `crud_update_*` por entidad ni tablas inexistentes.
5. **§3.2 trigger `updated_at`**: ajustar a las tablas reales que usan trigger (hosts, passkeys, projects_docker_compose, settings, cache_*), con el archivo de migración real (`20260826191046_...sql`).
6. **§4 Cifrado**: mantener algoritmo AES-256-GCM/`ENC:`/`BLANK_VALUE`; corregir la sección `encryption_config` de Rust → la configuración de campos cifrados ahora vive en el frontend (`src/lib/schema-types.ts` con `encryptedText(...)`), no en un config de Rust.
7. **§5 Runner Universal (`run_deployment`/`ProgressEvent`/variables/task_config)**: eliminar (archivado en `_archived.dist/`); conservar la parte de "Comandos SSH sueltos" (`commands/remote/`) que sí está vigente.
8. **§6 `query_raw` "solo SELECT"**: reescribir — ahora acepta `is_write`, cifra/descifra/enmascara; no es solo lectura sin cifrado.
9. **§7 Dependencias Rust**: quitar la fila de `deployer-macros` (no existe); añadir `tokio`, `ts-rs`, `reqwest`, `base64`, `hex`, `urlencoding` según convenga.

---

## Orden de implementación

| # | Paso | Archivo |
| --- | --- | --- |
| 1 | Corregir `AGENTS.md` | `AGENTS.md` |
| 2 | Corregir `AGENTS.frontend.md` | `AGENTS.frontend.md` |
| 3 | Corregir `AGENTS.backend.md` | `AGENTS.backend.md` |
| 4 | Revisión final de coherencia cruzada (que los 3 documentos se refieran a la misma realidad) | los 3 |

No hay que rebuildar: son solo cambios de documentación. (No se toca código de la app ni se regeneran tipos.)

---

## Notas / fuera de alcance

- **No se modifica código** de la app: ni `src/`, ni `src-tauri/`, ni migraciones. Solo los 3 documentos AGENTS.
- Los sistemas archivados (`src-tauri/_archived.dist/`, archivos `.back`) **no** se tocan (regla de AGENTS.md: ignorarlos).
- No se borra `drizzle/migrations/` ni `src-tauri/migrations/`.
- Este plan parte del estado **Planificando**; el agente solo lo pasa a **Ejecutando** al comenzar a implementar las correcciones.

## Registro de cambios (implementación)

- **AGENTS.md** (completado): tabla Stack actualizada (`vite ^8.2.2`, `build` sin `i18n:types`); sección "Comandos" reescrita (sin `dev:db:generate` ni `drizzle:migrate`; `drizzle:generate` = generate + flatten); "Propósito del Backend" y la tabla "Acceso a datos" actualizados a Drizzle proxy para lecturas Y escrituras vía `query_raw` (con `is_write`, cifrado/descifrado/enmascarado); reglas ajustadas (sin `src/constants/dbTables.ts`, `drizzle/` sin README, sin comandos `crud_*`); gotchas revisados (final `ComposeJsonSchema.vue`).
- **AGENTS.frontend.md** (completado): §1 árbol de `src/` ampliado (composables/, lib/, locales/, schemas/, types/); §1 theme añade `dashboardPanel.ts` y `radioGroup.ts`; §4b iconos = 8 módulos + migración solo con páginas reales; §5 i18n nota `build` sin `i18n:types`; §6 reescrito (catálogos projects/tasks/variables/deployments y runner marcados como archivados; se conservan consola remota, `ToggleEnabled.vue`, `countWhere`/`shared.ts`, esquema hosts); §8 nombres `ComposeJsonSchema.vue`/`ComposerJsonSchema.vue`.
- **AGENTS.backend.md** (completado): §1 estructura del crate reescrita (commands/{cache/docker, database, hosts, passkeys, projects/docker/compose, remote}, crypto/, ssh/, helpers.rs, patch.rs, response.rs); §2 tablas reales (7) + caché Docker Hub; §3 nuevo (entidades Drizzle, `encryptedText(...)`, timestamps `$onUpdate`, `deleted_at`); §4 cifrado con configuración en frontend (`schema-types.ts`); §5 operaciones Docker Compose + §5.1 consola remota; §6 `query_raw` reescrito (lecturas Y escrituras con `is_write`/`encrypt_mask`/`decrypt_fields`/`mask_fields`); §7 sin `deployer-macros`, añadido `ts-rs`.
- **Revisión final** (completada): coherencia cruzada verificada entre los 3 documentos; referencias cruzadas a secciones del backend corregidas; sin restos de `run_deployment`/`ProgressEvent`/`DbEntity`/`deployer-macros` como sistemas activos (solo notas de deprecación explícitas).

> Plan **Completado** por el usuario (27 ago 2026). Se mueve a `.agents/plans.done/`; registro en `.agents/AGENTS.done.md`.
