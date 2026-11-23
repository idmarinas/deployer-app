# Tareas completadas por el AGENTE

> Este archivo es solo como historial para las tareas que ya se han completado.

## Tareas completadas (23 nov 2026 — Correcciones del gestor de archivos (2/2) — Progreso por archivo)

**Nota del usuario:** confirmó «Todo ok» tras la verificación y pidió dar por completados los dos planes. Detalle en `AGENTS.file-manager-fixes-progress.PLAN.md` (archivado en `.agents/.done/plans/`). **La serie `file-manager-fixes` queda completa (2/2)**; no tiene diseño de origen.

1. **Tipos y eventos**: `RemoteTransferFileInfo` y `FileList`/`FileStarted`/`FileProgress`/`FileFinished` en `RemoteFileManagerEvent`.
2. **Backend**: pre-listado recursivo local/remoto, streaming por chunks de 256 KB con throttling de 100 ms, cancelación con limpieza del parcial y `Send` en los hooks para comandos Tauri.
3. **Frontend**: `SshJob.files` y detalle desplegable por archivo en `TransferQueue.vue` (barra, bytes y estado).
4. **i18n y documentación**: claves `es`/`en` y páginas `2.transfers.md`/`3.queue.md`, con desviaciones e historial en el plan.

**Verificación:** confirmada por el usuario.

---

## Tareas completadas (23 nov 2026 — Correcciones del gestor de archivos (1/2) — Scope local y expansión del árbol)

**Nota del usuario:** confirmó «Todo ok» tras la verificación y pidió dar por completados los dos planes. Detalle en `AGENTS.file-manager-fixes-ui.PLAN.md` (archivado en `.agents/.done/plans/`). La serie se cierra con el plan 2/2.

1. **Scope local**: `recursive: true` en `open()` para poder recorrer subdirectorios.
2. **Errores**: mensaje i18n con ruta y motivo al fallar una lectura local.
3. **Árbol**: botón que expande/contrae un nivel sin marcar casillas, con carga explícita del nivel hijo.
4. **Documentación**: `1.navigation.md` y claves `es`/`en`.

**Verificación:** confirmada por el usuario.

---

## Tareas completadas (22 nov 2026 — Gestor de archivos remoto de doble panel (3/3) — Cola de transferencias y cierre)

**Nota del usuario:** confirmó «Todo ok» y pidió dar por completado el diseño. Detalle en `AGENTS.remote-file-manager-queue.PLAN.md` (archivado en `.agents/.done/plans/`). **La serie `remote-file-manager` queda completa (3/3)** y el diseño pasa a **Implementado** (archivado en `.agents/.done/designs/`).

1. **Backend de lote**: `ssh_file_manager_transfer` con una sola conexión SFTP, tokens por ítem (incluidos pendientes), eventos `RemoteFileManagerEvent` y errores con claves i18n.
2. **Motor y fachada**: `runBatch` en `useSshJobs` y `useRemoteFileManager` con cola, cancelación individual/cascada y limpieza de terminados.
3. **Marcas**: store Pinia en `localStorage` con clave host/ruta/tamaño/fecha e invalidación al listar cada nivel.
4. **UI**: `TransferQueue.vue`, slots de estado/progreso/acciones en el árbol y cableado de los botones `→`/`←`.
5. **Documentación**: i18n es/en, páginas `docs/content/es/008.file-manager/` y actualización de `AGENTS*.md`.

**Verificación:** confirmada por el usuario.

---

## Tareas completadas (22 nov 2026 — Gestor de archivos remoto de doble panel (2/3) — Interfaz de doble panel)

**Nota del usuario:** confirmó «Todo ok» tras la verificación manual y el typecheck. Detalle en `AGENTS.remote-file-manager-ui.PLAN.md` (archivado en `.agents/.done/plans/`). La serie continúa con el plan 3/3 en **Ejecutando**.

1. **Página y menú**: `dashboard/file-manager` con `SelectHost` y entrada nueva bajo «Consola remota».
2. **Paneles**: navegación local (`plugin-fs`/`plugin-dialog`) y remota (`ssh_list_remote_dir`) por niveles, con ocultos visibles y breadcrumb.
3. **Árbol**: `UTree`/`TreeItem` con selección múltiple, metadatos, carga diferida por expansión y slots para estado/progreso/acciones.
4. **Acciones**: botones `→`/`←` que solo emiten eventos; sin transferencias todavía.
5. **i18n y guías**: claves es/en, permisos `fs` de lectura y `AGENTS.frontend.md` actualizado. Tres errores de `vue-tsc` corregidos.

**Verificación:** confirmada por el usuario.

---

## Tareas completadas (22 nov 2026 — Gestor de archivos remoto de doble panel (1/3) — Backend de navegación SFTP)

**Nota del usuario:** confirmó que todo está ok y dio por finalizado el plan. Detalle en `AGENTS.remote-file-manager-backend.PLAN.md` (archivado en `.agents/.done/plans/`). La serie continúa con los planes 2/3 y 3/3 en **Planificando**.

1. **Tipos y comando**: nuevos tipos `ts-rs` de listado y `ssh_list_remote_dir`, registrado en `lib.rs`, con rutas `/`, un solo nivel, `max_entries`/`truncated` y symlinks tolerantes a enlaces rotos.
2. **Contrato i18n**: clave `tauri.ssh.success.list` añadida en `es`/`en`; errores mediante `SshError`/`keys::*`.
3. **Documentación**: `AGENTS.backend.md` actualizado con el comando y corregido (`russh 0.65.1`, `MAX_DOWNLOAD_DEPTH = 32`).

**Verificación:** confirmada por el usuario.

---

## Tareas completadas (20 nov 2026 — Completar opciones SSH en la consola remota)

**Nota del usuario:** confirmó que todo está corregido y dio por finalizado el plan. Detalle en `AGENTS.ssh-console-options.PLAN.md` (archivado en `.agents/.done/plans/`).

1. **Motor SSH reutilizable**: `useSshJobs.ts` registra varios trabajos con dependencias, expone todas las opciones de los inputs y cancela por clave con cascada; `useRemoteCommand.ts` pasa a ser fachada.
2. **Consola completa**: campos y cancelación en los tres componentes de operación, descarga tipo FileZilla con destino obligatorio y tri-estado recursivo, estados `cancelled`/`skipped`, pestañas habilitadas y `ssh_reconnect_attempts` en el runner.
3. **Documentación**: claves i18n `es`/`en`, `AGENTS.frontend.md` §6 y páginas `docs/content/es/006.console/` actualizadas contra el código.

**Verificación:** confirmada por el usuario (ejecutó `bun run build` y confirmó que todo está corregido).

---

## Tareas completadas (19 nov 2026 — Mejoras futuras de SSH: consolidar duplicaciones (4/4))

**Nota del usuario:** confirmó que todo está correcto y dio por finalizado el plan. Detalle en `AGENTS.ssh-mejoras-duplicaciones.PLAN.md` (archivado en `.agents/.done/plans/`). **La serie `ssh-mejoras` queda completa** (4/4).

1. **Helpers de eventos**: nuevo `ssh/events.rs` (`emit_started`, `emit_output_chunk`, `emit_error`, `emit_finished`, `emit_transfer_terminal_error`) usado por `exec.rs` y `transfer_commands.rs`, conservando las semánticas de cada dominio.
2. **Pipeline SFTP compartido**: `connect_sftp` privado en `transfer_commands.rs` unifica `connect → ensure_connected → open_sftp_session` en upload/download sin cambiar claves ni puntos de emisión.
3. **Revisiones sin cambio estructural**: Fase 3 (token) ya cubierta por `register()` + `RemoteJobGuard` (planes 2/3); `CANCELLED_MSG` mantiene definición/re-export; lectura base64 no unificada con disco por diferencias de comportamiento.
4. **Documentación**: `AGENTS.backend.md` y §3.3/§10 del diseño actualizados con el estado real de las consolidaciones.

**Verificación:** confirmada por el usuario (`cargo check`, tipos/build y pruebas funcionales).

---

## Tareas completadas (19 nov 2026 — Mejoras futuras de SSH: `recursive` y `Finished.exit_code` (3/4))

**Nota del usuario:** confirmó que todo está correcto y pidió pasar al plan 4/4. Detalle en `AGENTS.ssh-mejoras-transferencias.PLAN.md` (archivado en `.agents/.done/plans/`). La serie continúa con el plan 4/4 en **Planificando**; no se ejecuta sin autorización.

1. **Estado terminal explícito**: `RemoteConsoleEvent::Finished` pasa a `{ status, exit_code, duration_seconds, message }` y se emite en todos los casos terminales; en transferencias `exit_code` es 0/130/1 según éxito/cancelación/error y se mantiene el evento `error` por compatibilidad sin redundancia visible.
2. **`recursive` en upload**: `Some(true)` fuerza directorio, `Some(false)` fuerza archivo simple (`upload_single_file`) y `None` auto-detecta, alineado con download.
3. **Ejecución de comandos**: `ssh_execute_command` emite el nuevo `Finished` de éxito con el `exit_code` real del proceso, conservando su semántica de respuesta.
4. **Frontend y docs**: `useRemoteCommand.ts`, `AGENTS.backend.md`, `AGENTS.frontend.md` y §10 del diseño actualizados.

**Verificación:** confirmada por el usuario (bindings, tipos, build y pruebas funcionales).

---

## Tareas completadas (19 nov 2026 — Mejoras futuras de SSH: timeout total y cancelación multi-job (2/4))

**Nota del usuario:** confirmó que todo está correcto y pidió pasar al plan 3/4. Detalle en `AGENTS.ssh-mejoras-ejecucion.PLAN.md` (archivado en `.agents/.done/plans/`). La serie continúa con los planes 3/4 y 4/4 en **Planificando**; no se ejecutan sin autorización.

1. **Timeout total**: `run_command_streaming` envuelve el bucle completo en un único `tokio::time::timeout` con `timeout_secs` (300 s por defecto); el output ya no reinicia el reloj y se conservan chunks ~100 ms, `exit_code`, `Eof` y `duration_seconds`.
2. **Cancelación multi-job**: `ssh/cancel.rs` pasa a `AtomicU64` + `HashMap<u64, CancellationToken>` con `RemoteJobGuard` (RAII); `ssh_cancel_remote_job(job_id?: number)` cancela el job indicado o el último registrado.
3. **Evento y frontend**: `RemoteConsoleEvent::Started { job_id }` por el Channel; `useRemoteCommand.ts` expone `currentJobId` y `cancel(jobId?)`; bindings regenerados.
4. **Documentación**: `AGENTS.backend.md`, `AGENTS.frontend.md` y §10 del diseño actualizados, con las desviaciones registradas en el plan.

**Verificación:** confirmada por el usuario (bindings, tipos, build y pruebas funcionales).

---

## Tareas completadas (19 nov 2026 — Mejoras futuras de SSH: triple timeout y verificación de clave (1/4))

**Nota del usuario:** confirmó que todo está correcto y dio el plan por terminado. Detalle en `AGENTS.ssh-mejoras-conexion.PLAN.md` (archivado en `.agents/.done/plans/`). La serie continúa con los planes 2/4, 3/4 y 4/4 en **Planificando**; no se ejecutan sin que el usuario los pase a **Pendiente**.

1. **Timeout y errores**: única constante `SSH_CONNECT_TIMEOUT_SECS = 15` en `ssh/session.rs`; familia `tauri.ssh.*` centralizada en `ssh/error.rs` (`SshError`), con las claves antiguas retiradas de Rust, locales y frontend.
2. **Conexión centralizada**: `ssh/connect.rs` es el único punto de conexión; `test_connection` y `export_public_key` dejan de abrir pool de host y pasan por `ssh/`.
3. **Huella del servidor**: columna `host_key_fingerprint` con migración `20261119131612_host_key_fingerprint`; `check_server_key` compara `SHA256:<base64>` y la ausencia o el cambio exigen reconfirmación manual.
4. **Interfaz**: campo de solo lectura y botón *Comprobar y confirmar* en `HostForm.vue`, compartido por alta y edición mediante `useHostFingerprint.ts`; badge en la vista de detalle.
5. **Documentación**: `AGENTS.backend.md`, `AGENTS.frontend.md`, `docs/content/es/004.hosts/`, §10 del diseño y locales es/en.

**Verificación:** confirmada por el usuario.

---

## Tareas completadas (19 nov 2026 — Unificar SSH y remote: verificación y cierre)

**Nota del usuario:** confirmó que todo está correcto y pidió cerrar el plan. Detalle en `AGENTS.unificar-ssh-remote-cierre.PLAN.md` (archivado en `.agents/.done/plans/`).

1. **Bindings y rutas**: `tauri-types.d.ts` conserva `AuthType` y los 7 tipos `Remote*` sin `HostSystemInfo`; sin referencias a `commands/remote/` en `src-tauri/src/` ni en `docs/content/`.
2. **No regresión**: inventario §3.5 del diseño recorrido; los cuatro archivos trasladados solo difieren del original en los imports; sin consolidación de duplicaciones.
3. **Cierre**: plan de traslado archivado y registro centralizado en este historial.

**Verificación:** confirmada por el usuario (`vue-tsc --noEmit && vite build` sin errores y visto bueno funcional de consola remota, transferencias, `test_connection`, `export_public_key` y runner de comandos guardados).

---

## Tareas completadas (19 nov 2026 — Unificar SSH y remote: traslado literal)

**Nota del usuario:** dio por terminado el plan de traslado y pidió pasar al plan de cierre. Detalle en `AGENTS.unificar-ssh-remote-traslado.PLAN.md` (archivado en `.agents/.done/plans/`).

1. **Traslado literal**: `cancel.rs`, `exec.rs`, `transfer_commands.rs` y `types.rs` movidos a `ssh/`; hashes SHA256 verificados y solo ajustados los imports (`crate::ssh::...`). Upload/download sin cambios de lógica.
2. **Registro**: `ssh/mod.rs`, `commands/mod.rs` y `lib.rs` conectados; `commands/remote/` eliminado, sin referencias residuales en `src-tauri/src/`.
3. **Documentación**: `AGENTS.backend.md` y `AGENTS.frontend.md` actualizados con el módulo único SSH y la excepción de comandos Tauri en `ssh/`.

**Verificación:** el usuario confirmó que `vue-tsc --noEmit && vite build` termina sin errores (hubo que corregir `TrashDetails.vue` para pasar `modelValue` a `ItemCard`). La verificación funcional de SSH/SFTP queda pendiente y se recoge en el plan de cierre.

---

## Tareas completadas (18 nov 2026 — Parámetros de entrada en comandos)

**Nota del usuario:** dio por completado el plan de implementación al no quedar trabajo funcional pendiente. Detalle en `AGENTS.command-inputs-model.PLAN.md`, `AGENTS.command-inputs-runner.PLAN.md`, `AGENTS.command-inputs-form.PLAN.md`, `AGENTS.command-inputs-dialog.PLAN.md` y `AGENTS.command-inputs-docs.PLAN.md` (archivados en `.agents/.done/plans/`). Queda pendiente la verificación manual.

1. **Modelo y contrato** (`model`): `src/utils/inputs/*` (tipos, schema Zod y reexportaciones), locales es/en, columna `deployer_commands.inputs` con migración `20261118154818_commands_inputs`, `CommandDefinition.inputs`, `row.inputs` en el runner, validación al guardar, seed (`seedColumns`/`resetColumns` más los tres registros) y `inputs: []` en el alta.
2. **Motor** (`runner`): `resolveInputDefaults()`, `CommandRunOptions` con `params`, coacción y validación de valores, relleno de campos declarados sin valor y raíces `{ global, params }` en el runner.
3. **Editor** (`form`): `CommandInputsEditor.vue` entre `timeout` y el script (alta/baja, reordenación por botones, opciones de `select`, defaults y ayuda), `params` en linter/resaltado/autocompletado y refinamiento asíncrono de defaults.
4. **Ejecución** (`dialog`): `InputsForm.vue` compartido, bloque de parámetros en `CommandTestDialog.vue`, defaults al abrir, panel de errores y vista previa con `params`; `inputs` propagado por `useDialog` y las tres páginas.
5. **Documentación** (`docs`): página `6.inputs.md`; overview, manage, testing y built-in actualizados; ámbitos `params` en interpolación; `AGENTS.frontend.md` §3 y gotcha en `AGENTS.md`; changelog `0.4.x` provisional en es/en.

**Verificación:** pendiente de que la haga el usuario (`bunx vue-tsc --noEmit`, `bun run build`; opcional `cd docs && bun run build`). El changelog `0.4.0` sigue provisional hasta la release.

---

## Tareas completadas (18 nov 2026 — Auditoría del código Rust)

**Nota del usuario:** pidió pasar a la Fase 5 y dar el plan por finalizado. Detalle en `AGENTS.rust-code-audit.PLAN.md` (archivado en `.agents/.done/plans/`).

1. **Limpieza**: eliminados `patch.rs`, `ssh/glob.rs` y el parámetro `exclude`; retirado el comando `get_database_path`, conservando `get_database_path_internal`.
2. **Consolidación SSH**: helpers comunes para credenciales, escape de rutas, canal de comandos, pool de solo lectura y constantes; wrappers y semánticas intactos.
3. **Tipos y scopes**: 4 tipos de dominio movidos a `src/types/entities.ts`, `VaultHealthReport` generado con `ts-rs`, `EXPECTED_SCOPES` ampliado a 4 scopes (incluida `deployer_variables.value`).
4. **Documentación**: `AGENTS*.md` actualizados con el inventario real de 23 comandos y la obtención de sistema/métricas/actualizaciones por el frontend. Los changelogs históricos no se tocaron.
5. **Cierre**: plan archivado y referencia eliminada de `AGENTS.todo.md`.

**Verificación:** comprobaciones estáticas ejecutadas por el agente (`cargo check --all-targets`, `bun run i18n:types`, `bunx vue-tsc --noEmit`, `bun run build`, `cargo test export_bindings`); verificación funcional en `bun run tauri:dev` pendiente de confirmación por el usuario.

---

## Tareas completadas (16 nov 2026 — Pestaña Inactivos en los listados)

**Nota del usuario:** los listados separan las filas deshabilitadas en una pestaña propia. La prueba funcional manual en `bun run tauri:dev` queda pendiente y se hará junto con la del soft-delete.

1. **Tres pestañas**: **Activos** / **Inactivos** / **Borrados** en variables, hosts, commands y passkeys. `UTabs` usa `v-model` y `:content="false"`; el contenido se renderiza fuera para conservar filtros y estado al cambiar de pestaña.
2. **Filtrado**: Activos = `enabled === true` y no borradas; Inactivos = `enabled === false` y no borradas. El contador aparece solo en Inactivos y Borrados cuando es mayor que 0.
3. **Semáforo**: el indicador de `UTabs` toma el color del estado de la pestaña activa (`success`/`warning`/`error`) y los iconos de las pestañas no activas se tiñen con ese mismo color.
4. **Componente compartido** `src/components/table/EntityListTab.vue` (lista, vacío, carga y error; slot `expanded`) y `EmptyList` acepta `title`/`description`/`showAdd`. El vacío de Inactivos usa `components.empty_list.inactive.*` sin botón de alta.
5. **Documentación e i18n**: `AGENTS.frontend.md` y las páginas de variables, hosts, commands y passkeys en `docs/content/es/`; claves `es`/`en` (`common.tabs.inactive` y `components.empty_list.inactive.*`) y `bun run i18n:types` regenerado.
6. **Verificación**: Prettier, `bun run i18n:types`, `bunx vue-tsc --noEmit` y `bun run build` verdes (2026-11-16).

---

## Tareas completadas (16 nov 2026 — Soft delete estilo Doctrine: papelera y purga)

**Nota del usuario:** el plan `AGENTS.soft-delete.PLAN.md` se da por completado. Detalle en `AGENTS.soft-delete.PLAN.md` (archivado en `.agents/.done/plans/`). La prueba funcional manual en `bun run tauri:dev` queda pendiente y se hará aparte; `settings` sigue apartado y es ajeno al plan.

1. **API CRUD** (`src/composables/queries/crud.ts`, `shared.interfaces.ts`): `find(key, options)` unificado con `onlyDeleted`/`includeDeleted` (sin `findByKey()` privada), `remove(key, { purge, unlink })` como única vía de purga (exige fila en papelera), `purgeDeleted()` con recuento `purged`/`blocked`, `findReferences()`, guardas de estado con `returning()` y bloqueo de filas `internal`. Notificaciones `delete`/`purge`/`purgeAll` completas en `es`/`en`.
2. **Relaciones**: una fila referenciada no se borra hasta desvincularla (`unlink`); `useCrudDeleteConfirm` ofrece **Cancelar** y **Desvincular y eliminar**. Migración de `hosts.key_id` de `set null` a `restrict` (`drizzle/migrations/` + `src-tauri/migrations/`). `findVariableUsages()` (`src/utils/interpolation/usages.ts`) avisa de los comandos que usan una variable por `{{global.<slug>}}`.
3. **UI de papelera**: `TrashTable`/`TrashDetails` compartidos, página global `src/pages/dashboard/trash.vue` agrupada por tabla y pestañas **Activos**/**Borrados** en los listados de variables, hosts, commands y passkeys. Restaurar, purgar, purga masiva con confirmación doble (**Vaciar papelera** en la página global / **Eliminar borrados** en la pestaña, con `context="list"`) y toast con acción **Deshacer** tras el borrado lógico.
4. **Seeds e `internal`**: `seedValues`/`seedWhere` en los seeds y `deleted_at = null` para las filas internas, que no se pueden borrar ni purgar.
5. **Documentación e i18n**: `AGENTS.frontend.md` (API CRUD, papelera e `internal`), `docs/content/es/008.variables/1.overview.md` y `docs/content/es/003.passkeys/2.manage.md` actualizados; claves `es`/`en` completas y `bun run i18n:types` regenerado.
6. **Verificación**: `bun run i18n:types`, `bunx vue-tsc --noEmit` y `bun run build` verdes (2026-11-15/16).

---

## Tareas completadas (12 nov 2026 — Variables globales: inmutabilidad y endurecimiento del cifrado)

**Nota del usuario:** el análisis `AGENTS.variables.ANALYSIS.md` queda consolidado aquí y se elimina. El trabajo aplazado vive en `plans/AGENTS.futuro.PLAN.md` §2 (`FUT-VAR-*`).

1. **`slug` inmutable**: se elimina del esquema de update (`.omit({ slug: true })`) y `update()` escribe siempre el valor actual. El renombrado con búsqueda de referencias queda en `FUT-VAR-02`.
2. **`is_secret` unidireccional**: una variable secreta no puede volver a ser pública. La regla se aplica en validación (refine async) y en la capa de consultas, sin triggers de SQLite. `is_secret` viaja siempre en el mismo `UPDATE` que `value` para que el cifrado condicional del proxy funcione.
3. **Normalización centralizada**: nuevo `src/utils/variables.ts` (`VariableUpdateData`, `normalizeVariableUpdate()`), usado por `src/composables/queries/variables.ts`. Si la fila no existe, `update()` sale con aviso.
4. **Centinelas endurecidos**: `isCiphertextToken()` en `src/drizzle/lib/stronghold.ts` valida el formato real (`ENC:{version}:<base64>` y `ENC:<base64>` con ≥ 28 bytes decodificados). `stripEncryptedValues()` y `encryptParams()` solo descartan `BLANK_VALUE` y `''`; `decryptRow()` y `maskEncryptedFields()` usan la guarda estricta. Un `ENC:` de usuario se cifra en lugar de guardarse en claro.
5. **i18n**: clave `validation.variables.is_secret.immutable` en `es` y `en`; `bun run i18n:types` ejecutado.
6. **Verificación**: script temporal con 15 comprobaciones (detección de tokens, strip de centinelas, conservación de `slug`/`is_secret`) y `bun run build` verde.

**Pendiente:** round-trip real en Tauri (`FUT-TECH-01`). **Deuda y mejoras:** `FUT-VAR-01` a `FUT-VAR-11` en `plans/AGENTS.futuro.PLAN.md`.

---

## Tareas completadas (12 nov 2026 — Extraer las extensiones de CodeMirror de `CodeEditor.vue`)

**Nota del usuario:** el plan `AGENTS.codemirror-extensions.PLAN.md` se da por completado; la verificación manual en UI queda aceptada por decisión del usuario. Detalle en `AGENTS.codemirror-extensions.PLAN.md` (archivado en `.agents/.done/plans/`).

1. **Módulos reutilizables** en `src/plugins/codemirror/`: `types.ts`, `theme.ts`, `highlight.ts`, `editable.ts`, `setup.ts`, `languages.ts`, `lint/{index,json,yaml}.ts`, `autocomplete/{index,variables,php}.ts`, `bash/{blocks,format}.ts` y `index.ts` como barrel público.
2. **`CodeEditor.vue` adelgazado** de 783 a 317 líneas: solo orquestación Vue + template; nueva prop `extensions` (`Extension | readonly Extension[]`) en un `Compartment` propio y reactiva a cambios.
3. **`basicSetup` sustituido** por `createBaseExtensions` con toggle por funcionalidad (lineNumbers, history, foldGutter, closeBrackets, search, autocomplete, multipleSelections) y `createDarkThemeExtension` aparte; se retira el meta-paquete `codemirror` y se añade `@codemirror/search`. El tema propio cubre los widgets que aportaba `defaultHighlightStyle`.
4. **Autocompletado aditivo por lenguaje**: la prop `autocomplete` se registra vía `languageData` (ya no sustituye a las fuentes del lenguaje); helper `withAutocomplete` y `autocomplete/php.ts` con lista básica (mínimo real PHP 7.0, sin 8.x). JavaScript y HTML conservan su autocompletado nativo.
5. **Movido** `src/utils/interpolation/completion.ts` → `src/plugins/codemirror/autocomplete/variables.ts`; `CommandForm.vue` importa de la nueva ruta.
6. **Documentación**: `AGENTS.frontend.md` §1 y §9 actualizadas (estructura, props, dependencias, base del editor, tema, lint y autocompletado por lenguaje).

**Resultado:** comportamiento del editor sin cambios funcionales; verificación por inspección y `bunx vue-tsc --noEmit` con los módulos de este plan limpios. Queda como deuda ajena un error de tipos en `src/utils/tiptap/SchemaSanitizerExtension.ts` (`@tiptap/pm/model` inexistente, resto del editor Tiptap retirado).

---

## Tareas completadas (11 nov 2026 — Sistema de interpolación de variables globales)

**Nota del usuario:** el plan `AGENTS.variable-interpolation.PLAN.md` se da por completado; el autocompletado se verificó en la app. Detalle en `AGENTS.variable-interpolation.PLAN.md` (archivado en `.agents/.done/plans/`).

1. **Motor puro** (`src/utils/interpolation/`): formato `{{ámbito.ruta}}` sin espacios, escape `\{{`, raíces desconocidas literales, modo estricto (`unknown_variable`, `disabled_variable`, `scope_not_available`, `invalid_path`), secretas enmascaradas (`••••••`) salvo al ejecutar y redacción de errores.
2. **Carga de variables** (`src/drizzle/lib/variables.ts`): metadatos para UI/linter/preview y lectura cruda + descifrado puntual de secretas solo para ejecución (sin `withDecryption`).
3. **Ejecución**: `runner.ts` y `useRemoteCommand.ts` interpolan `command`/`working_dir` y redactan errores. Al cerrar el plan se corrigió que una variable global inexistente se resolviera como cadena vacía: ahora lanza `unknown_variable` y bloquea la ejecución.
4. **UI**: autocompletado en `CodeEditor` (`{{` lista los ámbitos disponibles; variables con nombre y `global.slug [valor]`, candado para secretas), resaltado de variables, linter solo con errores, cuadro de ayuda de disparadores y vista previa con pestañas *Interpolada*/*Original* en `CommandTestDialog`.
5. **Listado de variables**: muestra y copia `{{global.slug}}`.
6. **i18n y documentación**: claves `es`/`en` y `docs/content/es/008.variables/`.

**Resultado:** `bun run build` verde, Prettier OK y motor probado contra los casos de la verificación prevista.

---

## Tareas completadas (10 nov 2026 — Comandos guardados en BD: `deployer_commands` como fuente única)

**Nota del usuario:** el plan `AGENTS.commands-db.PLAN.md` se da por completado. Detalle en `AGENTS.commands-db.PLAN.md` (archivado en `.agents/.done/plans/`).

1. **Entidad + migración**: tabla `deployer_commands` (PK `key`; columnas `name`, `description`, `command`, `parser` JSON, `timeout`, `custom`, `internal`, `enabled`, timestamps) en `src/drizzle/entities/commands.ts`, exportada en `schema.ts`. Migración `20261028172340_commands_v0.2.0.sql` aplanada en `src-tauri/migrations/` y `TABLE_COMMANDS` regenerado en `tables.rs`.
2. **Runner desde BD**: carpeta `src/utils/commands/` (`types.ts`, `parsers.ts`, `results.ts`, `runner.ts`); sin `registry.ts` ni definiciones TS hardcodeadas en runtime. `runCommand(key, hostId)` lee la definición de `deployer_commands` y `runCustomCommand` sirve para pruebas ad-hoc del formulario.
3. **CRUD + loaders**: `src/composables/queries/commands.ts` (findAll/find/create/update/remove con notifier y soft-delete) y `src/loaders/commands.ts` (`useCommandsListAll`, `useCommandByKey`, `useCommandOptions`).
4. **UI de gestión**: panel `commands.vue`, listado `commands/index.vue` (tabla expandible, badge de parser, acciones probar/editar/borrar), `add.vue`, `[key]/edit.vue`, `CommandForm.vue` (selector parser raw/json/line-based/regex con reglas y grupos) y `CommandTestDialog.vue` vía `useDialog`.
5. **Consumidor en hosts**: `(view).vue` ejecuta `system_info`, `system_metrics` y `upgradable_packages` vía `runCommand<T>()`.
6. **i18n + menú**: claves es/en espejo (dialogs, form, notifications, pages, validation, seed) y entradas en `useNavigationMenu.ts` (sidebar, búsqueda y campo "+").
7. **Seed**: `src/composables/deployer/seed_data/commands.ts` (system_metrics, system_info, upgradable_packages) integrado en `SEED_SOURCES` con UI en `TabDatabaseSeed.vue`.
8. **Cierre del plan (10 nov 2026)**: `runCommand()` valida ahora `enabled` (los comandos deshabilitados no se ejecutan) y lanza errores traducidos vía i18n (`utils.commands.errors.not_found` / `disabled`, es+en) en lugar de un string en español hardcodeado. `bun run i18n:types` y `bun run build` verdes.

**Resultado:** la BD es la fuente única de comandos en runtime; se crean, editan, deshabilitan y borran desde la UI sin tocar código ni recompilar.

---
