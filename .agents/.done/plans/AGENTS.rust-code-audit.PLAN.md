# Plan: Auditoría del código Rust (utilidad, sustitución por frontend y limpieza)

## Estado

**Terminado** — el usuario autorizó la ejecución el 2026-11-17 y dio el plan por finalizado el 2026-11-18, después de completar la Fase 5 (documentación). La verificación funcional manual sigue pendiente de confirmación por el usuario.

---

## Instrucciones dadas (verbatim)

> "Vamos a crear un plan y analizar el código Rust, para comprobar si todo ese código es útil, o se ha sustituido por el frontend o se puede sustituir con el frontent."

Contexto aportado por el agente (análisis previo):

- Hay **24 comandos registrados** en `src-tauri/src/lib.rs:54-89`; **23 tienen uso real** en `src/`. El único sin invocación desde el frontend es `get_database_path` (su función interna `get_database_path_internal` sí se usa en Rust).
- El frontend **ya absorbió** la obtención de `system_info`, `status_info` y `server_updates`: la vista `src/pages/dashboard/hosts/[id]/(view).vue:135,194,302` usa `runCommand('system_info' | 'system_metrics' | 'upgradable_packages')`, que acaba en `invoke('ssh_execute_command')` (`src/utils/commands/runner.ts:108`). Los antiguos comandos `host_check_system_info` / `host_check_metrics` / `host_check_updates` **no existen** en el código activo.
- Código muerto confirmado: `src-tauri/src/patch.rs` completo (con el único `#[allow(dead_code)]` del crate en `patch.rs:62`) y `src-tauri/src/ssh/glob.rs` junto con el parámetro `exclude: Option<&[String]>` de 4 funciones de `ssh/transfer.rs` (todos los callers pasan `None`).
- Duplicidades internas de Rust (no con el frontend): descifrado de credenciales (`ssh/session.rs:116` vs `commands/passkeys/export_public_key.rs:117-177`), `shell_escape`, ejecución de comandos por canal (3 implementaciones), SELECT de host+passkey y constantes `CANCELLED_MSG` / `SFTP_BUFFER_SIZE`.
- Desincronización: `EXPECTED_SCOPES` de `crypto/stronghold.rs:19-23` tiene 3 scopes; `ENCRYPTED_FIELDS` de `src/drizzle/lib/stronghold.ts:301-306` tiene 4 (falta `encrypt:deployer_variables.value`). `VaultHealthReport` no lleva `#[ts(export)]` y su tipo TS es manual (`stronghold.ts:43-51`).
- Las guías `AGENTS.backend.md` y `AGENTS.frontend.md` siguen describiendo comandos retirados (`host_check_*`, `commands/hosts/status.rs`), por lo que hoy documentan responsabilidades que ya no están en el binario.
- Existe ya el plan `.agents/plans/AGENTS.plugin-sql.PLAN.md` para sustituir `query_raw` por `tauri-plugin-sql`; este plan **no debe duplicarlo**.

---

## Objetivo

Completar el análisis del código Rust y clasificar **cada pieza** en una de tres categorías:

1. **Útil / imprescindible** (capacidad que el webview no tiene o contrato activo).
2. **Ya sustituida por el frontend** (lógica migrada a Drizzle, Web Crypto, comandos seed o parsers TS).
3. **Candidata a sustituir o eliminar** (código muerto, duplicado o wrapper fino).

El resultado es un inventario verificable más un conjunto de propuestas de limpieza priorizadas. **Este plan solo planifica**: no elimina código, no migra comandos ni modifica dependencias hasta que el usuario lo pase a **Pendiente**. Todas las decisiones están registradas en **Decisiones**.

**Alcance:** todo `src-tauri/src/**/*.rs` (excepto `tables.rs`, autogenerado) y sus puntos de uso en `src/**/*.{ts,vue}`. Quedan fuera los archivos `.back`, `.dist` y `_archived.dist/` (historial personal, no tocar).

---

## Contexto técnico actual

### Inventario de comandos (registro → uso real)

| Comando (`lib.rs`) | Uso en `src/` | Clasificación |
| --- | --- | --- |
| `test_connection` | `components/dashboard/toolbar/useToolbarButtons.ts:132` | Útil (SSH) |
| `host_update_packages` | `components/pages/hosts/TableServerUpdates.vue:258` | Útil (SSH) |
| `generate_passkey` | `components/overlay/forms/GeneratePasskeyDialog.vue:31` | Útil (cripto OpenSSH) |
| `derive_passkey_info` | `composables/queries/passkeys.ts:32` | Útil (cripto OpenSSH) |
| `export_public_key` | `components/overlay/forms/CopyPasskeyToServerDialog.vue:43` | Útil (SSH + vault) |
| `ssh_execute_command` | `composables/useRemoteCommand.ts:101`, `utils/commands/runner.ts:108` | Útil (SSH) |
| `ssh_upload_file` / `ssh_download_file` / `ssh_cancel_remote_job` | `composables/useRemoteCommand.ts:105,109,114` | Útiles (SFTP) |
| `set_database_path` | `main.ts:53`, `composables/deployer/useAppConfigure.ts:195`, `appConfigureSteps.ts:66,149` | Útil (store); se mantiene en Rust (decisión del usuario) |
| `check_database_exists` | `main.ts:42` | Útil (store); se mantiene en Rust (decisión del usuario) |
| `initialize_database` / `create_database_file` / `validate_database_sqlite` / `execute_migrations` / `has_migrations_pending` | `main.ts:45`, `appConfigureSteps.ts:32,40,48,56,123,131,139,201,209` | Útiles (sqlx) |
| `get_app_info` / `get_database_info` / `get_migrations_info` | `loaders/deployerApp.ts:52,86,15` | Útiles (metadatos BD/app) |
| `query_raw` | `drizzle/drizzle.ts:61`, `drizzle/lib/variables.ts:85`, `drizzle/lib/stronghold.ts:357,405` | Útil (ejecutor SQL); **plan propio** `AGENTS.plugin-sql.PLAN.md` |
| `get_vault_password` / `get_vault_path` / `check_vault_health` | `drizzle/lib/stronghold.ts:65,64,58` | Útiles (keychain + vault de solo lectura) |
| **`get_database_path`** | **sin invocaciones en `src/`** | Registrado sin consumidor; decidido retirar (se conserva `get_database_path_internal`) |

### Arquitectura vigente

- Toda lectura/escritura de negocio va por Drizzle proxy → `query_raw`; Rust **no cifra ni enmascara** en el ejecutor SQL (`AGENTS.backend.md` §4 y §6).
- Rust abre el vault de Stronghold **solo para leer** credenciales SSH (`crypto/stronghold.rs`, `ssh/connect.rs`, `ssh/session.rs`); el frontend es el único escritor.
- El webview no tiene sockets TCP, keychain del SO ni motor SQLite: SSH/SFTP (`russh`), `keyring` y `sqlx::migrate!()` no son migrables a TS sin plugins nuevos o WASM (coste y riesgo altos, beneficio nulo).
- Los tipos `HostStatusMetrics`, `HostServerUpdates`, `HostPackage` y `HostUpdatesSummary` **ya no existen en el código Rust**: solo sobreviven como entradas obsoletas en `src/types/tauri-types.d.ts` (generado por `ts-rs`). Los consume el frontend (`entities/hosts.ts`, `TableServerUpdates.vue`, vista de host y locales de diálogos). `HostSystemInfo` sí se usa en `updates.rs:88`; `AuthType` en `ssh/session.rs` y `export_public_key.rs`. Una regeneración de bindings los borraría y rompería el tipado.
- Los comandos de BD/app **no son wrappers migrables sin más**: `check_database_exists` usa `std::path::Path::exists()`, `get_database_info`/`initialize_database`/`create_database_file`/`validate_database_sqlite`/migraciones usan SQLx y archivos, y `get_app_info` depende de variables de compilación inyectadas por `build.rs` (`DEPLOYER_VUE_VERSION`, `DEPLOYER_NUXT_UI_VERSION`). El frontend no tiene `@tauri-apps/plugin-fs` ni acceso a esas variables. Solo `set_database_path` toca exclusivamente `tauri_plugin_store` (plugin sí disponible en JS), pero se decide mantenerlo en Rust.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-17 | El plan se crea en **Planificando** y no se ejecuta (regla `plan-workflow`). |
| 2026-11-17 | **Decisión del usuario:** retirar `get_database_path` (comando inservible). Se conserva `get_database_path_internal` para el backend. |
| 2026-11-17 | **Decisión del usuario:** los comandos de BD/app (`set_database_path`, `check_database_exists`, `get_app_info` y el resto de `database/`) se mantienen en Rust porque el frontend no tiene acceso al sistema de archivos. No se migran. |
| 2026-11-17 | **Decisión del usuario:** los 4 tipos huérfanos se definen en `src/types/entities.ts`. |
| 2026-11-17 | **Decisión del usuario:** incluir la consolidación de duplicidades SSH en este plan. |
| 2026-11-17 | **Decisión del usuario:** la documentación se actualiza **al final del todo**, una vez completados y comprobados el resto de cambios; entonces se actualizan guías y documentación. |
| 2026-11-17 | **Decisión del usuario:** las migraciones se ejecutan desde Rust y la cripto de claves también se mantiene en Rust. |
| 2026-11-17 | **Decisión del usuario:** SSH/SFTP se mantienen en Rust de momento, pero hay que evaluar si pueden migrarse al frontend; comprobado: no es viable con las dependencias y capacidades actuales (ver viabilidad, punto 6). Cualquier intento requeriría un plan específico con un bridge Rust/WebSocket o WASM. |
| 2026-11-17 | **Decisión del usuario:** excluir `query_raw` de este plan por tener plan propio (`AGENTS.plugin-sql.PLAN.md`). |

**Alternativas descartadas:** portar `russh`/`russh-sftp` a WASM o reimplementar claves OpenSSH en JS (riesgo crítico y sin beneficio funcional); sustituir `sqlx::migrate!()` por un ejecutor JS casero (riesgo de dejar la BD a medias); migrar los comandos de BD al frontend (sin `plugin-fs` y con metadatos inyectados en compilación, decisión del usuario en contra); regenerar `tauri-types.d.ts` antes de trasladar los tipos huérfanos a TS (rompería el tipado del frontend).

### Comprobación de viabilidad de los puntos 2–6 (2026-11-17)

| Punto | Viabilidad | Evidencia y matiz |
| --- | --- | --- |
| **2. Tipos huérfanos** | **Sí, y es necesario (decisión del usuario: `src/types/entities.ts`)** | `HostStatusMetrics`, `HostServerUpdates`, `HostPackage` y `HostUpdatesSummary` no están en ningún `.rs`: solo quedan en el `.d.ts` generado. Hay que definirlos en `src/types/entities.ts` **antes** de regenerar bindings (`cargo test export_bindings` con `TS_RS_EXPORT_DIR=../src/types`, según el historial del proyecto) y actualizar los imports de `entities/hosts.ts`, vista de host, `TableServerUpdates.vue` y `locales/{es,en}/dialogs/hosts.ts`. |
| **3. Duplicidades SSH** | **Sí, se incluye (decisión del usuario); con matices** | `decrypt_host_credentials` solo cubre credenciales del **host**; `export_public_key.rs` además descifra la passkey seleccionada (bloque propio, no sustituible por ese helper). `shell_escape` requiere cambiar el formato de la plantilla `authorized_keys` (la función ya devuelve las comillas). Hay 3 implementaciones de ejecución por canal con semánticas distintas: `run_ssh_command` (timeout por mensaje, sin cancelación, normaliza CR), `run_command_streaming` (cancelación + chunks, espera `Close`, `exit_code = -1` por defecto) y `run_channel_command` (sin timeout, códigos 1/2 con significado en `Remove`). Unificarlas a ciegas cambiaría el comportamiento; se usa helper común de bajo nivel conservando los wrappers y las semánticas. |
| **4. Comandos de BD/app** | **No migrar (decisión del usuario)** | `check_database_exists` usa `std::path::Path::exists()`; `get_database_info`, `initialize_database`, `create_database_file`, `validate_database_sqlite` y migraciones usan SQLx + archivos; `get_app_info` necesita `env!` de `build.rs`. `package.json` no incluye `@tauri-apps/plugin-fs` y `src/` no importa `@tauri-apps/plugin-store`. Únicamente `set_database_path` podría hacerse en JS vía plugin-store, pero se mantiene en Rust por decisión del usuario. |
| **5. Documentación** | **Sí, al final del todo (decisión del usuario)** | Solo requiere editar `AGENTS.backend.md` y `AGENTS.frontend.md`; no afecta a compilación. Se deja para la última fase, después de completar y comprobar el resto de cambios. Los changelogs de `docs/content/` son registros históricos y no se editan. |
| **6. SSH/SFTP al frontend** | **No viable ahora (evaluación solicitada por el usuario)** | `package.json` no incluye ninguna librería SSH/SFTP en JS/WASM; `Cargo.toml` usa `russh 0.65.1` y `russh-sftp 2.3.0` solo en Rust. Las capacidades Tauri (`default.json`, `desktop.json`) no incluyen plugin de red: el webview no puede abrir sockets TCP. El frontend solo envía `invoke` a los comandos (`useRemoteCommand.ts:101-114`, `runner.ts:108`, `useToolbarButtons.ts:132`). Migrar SSH/SFTP exigiría un bridge Rust→WebSocket/WASM y rehacer la gestión de claves, con riesgo alto y sin beneficio funcional; se mantienen en Rust y se haría en un plan específico. |

---

## Problemas y riesgos encontrados

### P1 — `patch.rs` es código muerto

- `Patch<T>`, su `Deserialize`, su `TS` y `merge` no tienen consumidores; el doc hace referencia a `UpdateProjectInput` y comandos `crud_update_*` retirados.
- **→ Riesgo BAJO.** Eliminar `patch.rs` y `mod patch;` de `lib.rs:4`; verificar con `cargo check`.

### P2 — `ssh/glob.rs` y el parámetro `exclude` son restos de deployments

- `matches_any` solo se usa dentro de bloques `if let Some(patterns) = exclude` en `ssh/transfer.rs:151,321`, y los 4 callers de `commands/remote/transfer.rs` pasan siempre `None`. Los tests de `glob.rs` solo cubren esa rama inactiva.
- **→ Riesgo BAJO.** Eliminar módulo, parámetro y los 3 `#[allow(clippy::too_many_arguments)]` que derivan de él; comprobar transferencias recursivas.

### P3 — `get_database_path` registrado sin uso frontend (decidido: retirar)

- No aparece en `src/`; la ruta se resuelve en Rust mediante `get_database_path_internal` (`helpers.rs:22`, `commands/database/mod.rs:15`). Referencias a eliminar: `lib.rs:9`, `lib.rs:71`, `store/mod.rs:2,6`, y la función `#[tauri::command]` en `store/get_database_path.rs` (manteniendo el helper interno).
- **→ Riesgo BAJO.** Decisión del usuario: retirar el comando. No afecta a los comandos de BD que sí se usan.

### P4 — Tipos huérfanos solo en `tauri-types.d.ts`

- `HostStatusMetrics`, `HostServerUpdates`, `HostPackage` y `HostUpdatesSummary` no existen en Rust; son residuos del archivo generado. Los imports del frontend dependen de ellos.
- **→ Riesgo MEDIO.** Definirlos primero en `src/types/entities.ts`, actualizar los imports y solo después regenerar bindings. Si se regenera antes, `vue-tsc` falla.

### P5 — Scopes de cifrado desincronizados

- `EXPECTED_SCOPES` no incluye `encrypt:deployer_variables.value`, así que `check_vault_health` no detecta su ausencia. Además, el health check prueba solo versiones `0..10` (`crypto/stronghold.rs:171`), pero la rotación del frontend puede superar v9.
- **→ Riesgo MEDIO.** Sincronizar la lista e idealmente derivarla de una única fuente; mejorar el escaneo de versiones.

### P6 — Duplicidades internas de Rust

- Descifrado de credenciales, escape shell, ejecución de comandos por canal (3 variantes), SELECT de host+passkey y apertura de pool de solo lectura están duplicados; `run_ssh_command` aplica timeout por mensaje, no al comando completo (`ssh/helpers.rs:55`).
- **→ Riesgo MEDIO.** La unificación es posible pero no trivial: `decrypt_host_credentials` no cubre la passkey de `export_public_key.rs`, y las 3 variantes de ejecución tienen semánticas distintas de timeout, EOF y `exit_code`. Extraer un helper común de bajo nivel y mantener wrappers específicos; no alterar timeout/EOF en este plan.

### P7 — Documentación desactualizada

- `AGENTS.backend.md` §1 y `AGENTS.frontend.md` §6 mencionan `host_check_system_info`, `host_check_metrics`, `host_check_updates` y `commands/hosts/status.rs`, inexistentes en el código activo.
- **→ Riesgo BAJO** pero confunde futuras auditorías: actualizar guías en la **última fase**, después de completar y comprobar el resto de cambios (decisión del usuario). Los changelogs de `docs/content/` son históricos y no se editan.

### P8 — Solapamiento con el plan de `tauri-plugin-sql`

- Modificar `query_raw` aquí duplicaría `.agents/plans/AGENTS.plugin-sql.PLAN.md` y podría contradecir sus decisiones.
- **→ Riesgo MEDIO.** Dejar `query_raw` fuera de este plan y referenciar el plan existente.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**. Todas las decisiones están cerradas en **Decisiones**.

### Fase 1 — Cerrar el inventario (decisiones ya tomadas)

1. Revisar con el usuario la tabla de comandos y la clasificación de los 24 registros (ya resuelto: `get_database_path` se retira).
2. Dejar constancia en el plan de las decisiones definitivas con fecha (ya registradas en **Decisiones**; no quedan puntos abiertos).

### Fase 2 — Limpieza de código muerto (sin cambio de comportamiento)

1. Eliminar `patch.rs` y su declaración en `lib.rs`.
2. Eliminar `ssh/glob.rs`, su `mod` en `ssh/mod.rs`, el parámetro `exclude` de `ssh/transfer.rs` y los bloques que lo consumen.
3. Retirar `get_database_path`: quitar el `use` y la entrada en `generate_handler!` de `lib.rs`, el `mod`/`pub use` de `store/mod.rs` y el comando `#[tauri::command]` de `store/get_database_path.rs`, conservando `get_database_path_internal` (decisión del usuario).

### Fase 3 — Consolidar duplicidades internas de Rust (incluida por decisión del usuario)

1. Reutilizar `decrypt_host_credentials` solo para el bloque de credenciales del host en `export_public_key.rs`; mantener aparte el descifrado de la passkey seleccionada.
2. Reutilizar `shell_escape` adaptando las plantillas de `build_authorized_keys_command` (la función ya incluye las comillas).
3. Extraer un helper común de bajo nivel para abrir canal/ejecutar/leer mensajes, conservando los wrappers actuales: `run_ssh_command` (timeout por mensaje + normalización), `run_command_streaming` (cancelación + chunks + `Close`) y `run_channel_command` (códigos 1/2). **No cambiar** la semántica de timeout ni de EOF en este plan.
4. Factorizar SELECT de host+passkey y la apertura de pool de solo lectura; unificar constantes `CANCELLED_MSG` y `SFTP_BUFFER_SIZE`.
5. Reducir visibilidad `pub` sobreexpuesta (`SshClientHandler`, `get_key_for_version`, `split_ciphertext_version`, `decrypt_host_credentials`) donde no haya consumidores externos.

### Fase 4 — Sincronizar tipos y scopes

1. Definir `HostStatusMetrics`, `HostServerUpdates`, `HostPackage` y `HostUpdatesSummary` en `src/types/entities.ts`, actualizar imports y **después** regenerar `tauri-types.d.ts` con el flujo de `ts-rs` del proyecto (P4).
2. Añadir `encrypt:deployer_variables.value` a `EXPECTED_SCOPES` y mejorar el escaneo de versiones del health check (P5).
3. Añadir `#[ts(export, export_to = "tauri-types.d.ts")]` a `VaultHealthReport` y eliminar la interfaz manual duplicada en `stronghold.ts`, o dejar constancia de por qué se mantiene.

### Fase 5 — Documentación (al final del todo)

1. Una vez completadas y comprobadas las fases 2–4, actualizar `AGENTS.md`, `AGENTS.backend.md` y `AGENTS.frontend.md` para reflejar comandos activos y la ya realizada migración de `system_info`/`status_info`/`server_updates` al frontend (P7).
2. No editar los changelogs de `docs/content/`: son registros históricos. Si se considera necesaria una entrada nueva, se hará en el flujo de changelog de la versión correspondiente, fuera de este plan.

### Fase 6 — Cierre

1. Actualizar **Historial** con lo ejecutado y las desviaciones.
2. Pasar el plan a **Terminado** solo por decisión del usuario y archivarlo según `plan-workflow`.

> **Fuera de alcance por decisión del usuario:** migrar `set_database_path` / `check_database_exists` / `get_app_info` al frontend. Todos los comandos de `commands/database/` y la gestión de BD se mantienen en Rust. `query_raw` sigue en su plan propio (`AGENTS.plugin-sql.PLAN.md`).

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src-tauri/src/lib.rs` | Quitar `mod patch;`, el `use` y la entrada de `get_database_path` en `generate_handler!`; actualizar comentarios de registro. |
| `src-tauri/src/patch.rs` | Eliminación (P1). |
| `src-tauri/src/commands/database/store/get_database_path.rs`, `src-tauri/src/commands/database/store/mod.rs` | Eliminar el comando `#[tauri::command]` y su re-export; conservar `get_database_path_internal` (decisión del usuario). |
| `src-tauri/src/ssh/glob.rs`, `src-tauri/src/ssh/mod.rs` | Eliminación del módulo y su re-export (P2). |
| `src-tauri/src/ssh/transfer.rs`, `src-tauri/src/commands/remote/transfer.rs` | Quitar parámetro `exclude` y constantes duplicadas (P2, P6). |
| `src-tauri/src/ssh/session.rs`, `src-tauri/src/ssh/helpers.rs`, `src-tauri/src/commands/passkeys/export_public_key.rs` | Reutilizar helpers de descifrado/escape/ejecución con las semánticas actuales (P6). |
| `src/types/entities.ts`, `src/drizzle/entities/hosts.ts`, `src/pages/dashboard/hosts/[id]/(view).vue`, `src/components/pages/hosts/TableServerUpdates.vue`, `src/locales/{es,en}/dialogs/hosts.ts`, `src/types/tauri-types.d.ts` | Definir los 4 tipos huérfanos en `src/types/entities.ts`, actualizar imports y regenerar bindings después (P4). |
| `src-tauri/src/crypto/stronghold.rs`, `src/drizzle/lib/stronghold.ts` | Sincronizar scopes/versiones y tipo de health (P5). |
| `AGENTS.md`, `AGENTS.backend.md`, `AGENTS.frontend.md` | Corregir inventario de comandos y responsabilidades migradas (P7). Solo en la Fase 5, al final del todo. |
| `AGENTS.todo.md` | Referencia al plan y cambios de estado. |

---

## Verificación (manual)

> Solo pasos funcionales. La compilación y los comandos habituales se ejecutan a mano según la regla de la skill `plan-workflow`; no se listan aquí.

1. En `bun run tauri:dev`, completar el asistente de configuración de BD (crear/validar/inicializar/migrar) y comprobar que arranca sin errores.
2. Probar `Probar conexión` desde el listado de hosts y la obtención de información del sistema, métricas y actualizaciones desde la vista de host (deben seguir pasando por `ssh_execute_command` + parsers).
3. Ejecutar y cancelar un comando en la consola remota; subir y descargar un archivo por SFTP (archivo simple y directorio).
4. Generar una passkey, derivar su información y exportar la pública a un host.
5. Verificar el diagnóstico del vault en el arranque con las 4 claves de cifrado presentes (incluida `deployer_variables.value`) y crear/editar una variable cifrada.
6. Comprobar que la papelera, el borrado lógico y el cifrado de hosts/passkeys siguen funcionando tras mover tipos.

---

## Criterios de aceptación

- [x] Los 24 comandos registrados están clasificados con su uso real; el registro final tiene 23 (verificado en `lib.rs:53-84`).
- [x] `patch.rs` y `ssh/glob.rs` (más `exclude`) eliminados.
- [x] `get_database_path` retirado del handler y del re-export, conservando `get_database_path_internal`.
- [x] Los comandos de BD/app siguen en Rust sin cambios de migración (decisión del usuario).
- [x] Las migraciones, la cripto de claves y SSH/SFTP siguen en Rust; la evaluación de migrar SSH/SFTP queda registrada como inviable con las dependencias actuales.
- [x] Las duplicidades SSH están consolidadas con helper común, conservando las semánticas de los wrappers.
- [x] Los 4 tipos huérfanos viven en `src/types/entities.ts` y sobreviven a una regeneración de `tauri-types.d.ts` (`cargo test export_bindings`: 25 tipos, sin los 4 huérfanos y con `VaultHealthReport`).
- [x] No queda lógica de negocio duplicada entre Rust y el frontend más allá de la cripto inevitable para SSH (revisión final del inventario: SSH/SFTP, gestión de BD y vault siguen en Rust; los parsers y los 4 tipos de dominio viven en el frontend; `EXPECTED_SCOPES` se sincroniza manualmente por falta de fuente compartida).
- [x] `EXPECTED_SCOPES` coincide con los campos cifrados reales del frontend (4 scopes, incluido `deployer_variables.value`).
- [ ] Sin regresiones funcionales en SSH/SFTP, passkeys, BD y cifrado: **no confirmadas por el usuario**. El usuario pidió avanzar a la Fase 5 y cerrar el plan el 2026-11-18 sin informar del resultado de las pruebas manuales en `bun run tauri:dev`; queda como seguimiento fuera del plan.
- [x] Las guías `AGENTS*.md` ya no mencionan comandos retirados como activos (Fase 5 completada; los changelogs de `docs/content/` se conservan como registros históricos).

### Desviaciones

| Desviación | Motivo |
| --- | --- |
| `decrypt_host_credentials` se declaró `pub(crate)` y se re-exporta también desde `ssh::mod`, en lugar de dejarse `pub` como en el plan original. | El único consumidor es interno (`ssh/connect.rs` y `commands/passkeys/export_public_key.rs`); reduce la superficie pública sin afectar al comportamiento. |
| `CANCELLED_MSG` se define en `ssh::transfer` y se re-exporta desde `commands/remote/cancel.rs`; `SFTP_BUFFER_SIZE` también vive en `ssh::transfer`. | Única fuente para comandos remotos y transferencias SFTP, evitando duplicar constantes. |
| `SshCredentials` deriva `Clone`. | Necesario para pasar las credenciales ya descifradas a `SshSession::connect` en `try_connect_and_execute` sin reconstruirlas. |
| `EXPECTED_SCOPES` sigue siendo una constante en Rust, no una fuente única compartida con `ENCRYPTED_FIELDS` del frontend. | Sin mecanismo de intercambio entre TS y Rust sin añadir dependencias; se sincronizó manualmente y se amplió el escaneo de versiones leyendo `scope:current`. |
| Se añadió `ts_rs::TS` + `#[ts(export, ...)]` a `VaultHealthReport` y se importa el tipo generado en `stronghold.ts`. | Cumple el punto 3 de la Fase 4; el tipo TS pasa a ser generado, no manual. |

---

## Puntos abiertos

**Ninguno de los puntos originales.** Todas las decisiones del usuario están tomadas (2026-11-17):

1. **Tipos huérfanos (P4):** se definen en `src/types/entities.ts`.
2. **Duplicidades (P6):** se incluyen en este plan, con helper común y wrappers intactos.
3. **Documentación (P7):** se actualiza al final del todo, tras completar y comprobar el resto de cambios. Los changelogs son históricos y no se editan.

**También resueltos:** retirada de `get_database_path` (conservando `get_database_path_internal`), permanencia en Rust de todos los comandos de BD/app, ejecución de migraciones y cripto de claves en Rust, evaluación de SSH/SFTP (inviable de momento; se mantiene en Rust) y exclusión de `query_raw` por su plan propio. El plan está **Terminado** por decisión del usuario (2026-11-18): fases 2–5 completadas, con comprobaciones estáticas correctas. Queda como seguimiento externo, sin bloquear el cierre, la verificación funcional manual en `bun run tauri:dev`, cuyo resultado no ha sido confirmado.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-17 | Plan creado en estado **Planificando** tras analizar registro de comandos, uso en frontend, código muerto, duplicidades y desincronización de scopes/tipos. |
| 2026-11-17 | El usuario decide retirar `get_database_path` y mantener en Rust los comandos de BD/app. Se comprueba la viabilidad de los puntos 2–5: los tipos huérfanos solo están en el `.d.ts` generado; las duplicidades SSH son parcialmente unificables; la documentación no tiene bloqueo técnico. Se corrige el plan en consecuencia. |
| 2026-11-17 | El usuario decide: tipos huérfanos en `src/types/entities.ts`, consolidación de duplicidades SSH incluida en este plan y documentación al final del todo (una vez completados y comprobados los cambios, se actualizan guías y documentación). Se ajustan viabilidad, fases, archivos afectados y criterios; se cierran los puntos abiertos. El plan sigue en **Planificando**; no se ha tocado código. |
| 2026-11-17 | El usuario confirma: migraciones y cripto de claves en Rust; SSH/SFTP se mantienen en Rust pero se evalúa su migración (comprobada inviable: sin librerías JS/WASM ni plugin de red, con `russh`/`russh-sftp` solo en Rust); `query_raw` queda excluido por su plan propio. Se cierran todas las decisiones; el plan continúa en **Planificando** a la espera de que el usuario lo pase a **Pendiente**. |
| 2026-11-17 | El usuario autoriza la implementación ("Procede con la implementación"): plan pasado a **Pendiente** por decisión del usuario y a **Ejecutando** por el agente al iniciar el trabajo. |
| 2026-11-17 | Fase 2 completada: eliminados `patch.rs`, `ssh/glob.rs` y el parámetro `exclude`; retirado el comando `get_database_path` (conservado `get_database_path_internal`) y la clave i18n `get_path_failed` en `es`/`en`. `cargo check --all-targets` OK. |
| 2026-11-17 | Fase 3 completada: `open_command_channel` como helper común; reutilización de `decrypt_host_credentials`, `shell_escape` y `fetch_host_credentials`; `open_read_only_pool` compartido; `CANCELLED_MSG`/`SFTP_BUFFER_SIZE` unificados; visibilidad reducida. `cargo check --all-targets` OK tras corregir el re-export de `decrypt_host_credentials` y la mutabilidad de `session` en `execute_authorized_keys`. |
| 2026-11-17 | Fase 4 completada: 4 tipos huérfanos movidos a `src/types/entities.ts` con imports actualizados; `EXPECTED_SCOPES` ampliado a 4 scopes y escaneo de versiones mejorado; `VaultHealthReport` exportado con `ts-rs` y la interfaz manual eliminada; `cargo test export_bindings` regenera 25 tipos (sin los 4 huérfanos y con `VaultHealthReport`). Verificación: `cargo check --all-targets`, `bun run i18n:types`, `bunx vue-tsc --noEmit` y `bun run build` OK. |
| 2026-11-17 | El usuario elige verificar manualmente las pruebas funcionales antes de autorizar la documentación; el agente pausa antes de la Fase 5 y registra en el plan el avance y las desviaciones. |
| 2026-11-18 | El usuario pide «Pasa a la fase 5 y da el plan por finalizado» sin confirmar el resultado de las pruebas funcionales. Se ejecuta la Fase 5: `AGENTS.md`, `AGENTS.backend.md` y `AGENTS.frontend.md` dejan de describir comandos retirados, reflejan la migración de `system_info`/`system_metrics`/`upgradable_packages` al frontend, los 4 scopes cifrados y los tipos manuales/generados. Los changelogs históricos no se tocan. |
| 2026-11-18 | Cierre autorizado: plan pasado a **Terminado**, archivado en `.agents/plans.done/`, entrada añadida a `.agents/AGENTS.done.md` y referencia eliminada de `AGENTS.todo.md`. La verificación funcional manual queda registrada como no confirmada. |
