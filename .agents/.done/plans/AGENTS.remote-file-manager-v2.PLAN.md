# Plan: Gestor de archivos remoto v2 — persistencia, concurrencia y reintento

> **Estado: Terminado** — el usuario lo dio por completado el 2026-11-24.
> **Diseño de origen:** `.agents/.done/designs/AGENTS.remote-file-manager-v2.DESIGN.md` (aprobado el 2026-11-23; cubre sus tres bloques).
> **Última revisión:** 2026-11-24 — cierre del plan y del diseño de origen tras la verificación del usuario. Historial completo al final (§12).

---

## 1. Instrucciones dadas (verbatim)

> Vamos a mejorar este diseño `F:\Tools\deployer-app\.agents\.done\designs\AGENTS.remote-file-manager.DESIGN.md`
>
> Transferencias concurrentes, Preferencias persistentes, Persistencia de las listas y de las transferencias con localstorage atraves de Pinia. Para que persista incluso aunque recargues la app o la cierres.
>
> Es posible usar la BD SQLite en lugar de localStorage?
>
> Crea el plan de implementación

---

## 2. Objetivo y alcance

Implementar el diseño v2 aprobado en un único plan con tres fases: persistencia en SQLite de preferencias/listados, cola persistida con reintento y nueva vista de transferencias, y concurrencia configurable en el lote SFTP.

**Incluido en este plan:** las tres tablas nuevas y la columna `default_remote_path`; selección por icono con carga recursiva; hidratación y revalidación de listados; migración única de `localStorage`; estado `interrupted` y reintento manual; bloques ordenados con `FileTree` siempre expandido; `max_concurrency` con default 2 y regeneración de tipos; i18n y documentación derivada.

**Fuera de alcance:** operaciones de escritura remota (crear/renombrar/borrar) y editor de contenido remoto, excluidas expresamente por el usuario; reactivación automática de transferencias al abrir; `localStorage` como almacén (solo se lee una vez para migrar); modificar la consola remota (`useRemoteCommand.ts`, `RemoteConsoleEvent`) ni la capa de cifrado/vault. Las ideas aplazadas siguen en `.agents/AGENTS.futuro.md` §4b.

---

## 3. Contexto técnico actual

- **Persistencia hoy:** `src/pages/dashboard/file-manager.vue` guarda pestaña (`deployer-file-manager-tab`), host (`deployer-file-manager-host`), ruta local y ruta remota con `useStorage`; las selecciones son `ref` y no sobreviven. `src/stores/remoteFileMarks.ts` usa `useStorage('deployer-remote-file-marks', …)` con clave compuesta `host + ruta + tamaño + fecha` y `KEY_PREFIX = 'deployer:file-manager:downloaded'`.
- **Paneles:** `src/components/pages/file-manager/FileManagerPanel.vue` mantiene `currentPath`, `entries`, `childrenByKey`, `loadedKeys` y `loadingKeys` en `ref`; `listDirectory()` usa `readDir`+`stat` en local y `ssh_list_remote_dir` (`max_entries: 1000`) en remoto; `loadChildren(entry)` ya es `async` pero se invoca desde el emit `@load-children` sin esperarlo; `watch(() => props.hostId)` resetea la ruta a `/`.
- **Árbol:** `src/components/pages/file-manager/FileTree.vue` asigna `icon` en `buildNode()`, usa `UCheckbox` en `#item-leading`, `UTree multiple` con `@toggle="handleToggle"` (que emite `load-children`), `selected` como `shallowRef`, `expanded` como `ref` local y expone solo `reset()`.
- **Cola:** `src/composables/useSshJobs.ts` guarda `jobs` en un `reactive(Map)`, expone `orderedJobs`, `clear()` (borra todo lo que no sea `running`/`pending`) y estados `pending|running|success|error|cancelled|skipped`; `SshJob` no tiene `createdAt`. `src/composables/useRemoteFileManager.ts` agrupa por host en `enqueue()`, genera claves `file-transfer-<timestamp>-N` y calcula `completed` filtrando estados terminales.
- **Clasificación de estados:** además de `TransferQueue.vue` (`FINISHED`, `ACTIVE`, `isActive()`, `statusColor()`, `expandedKeys`), la propia página `file-manager.vue` tiene `isActive()` y `statusColor()` para los slots `node-status`/`node-actions`; ambos sitios hay que tocarlos.
- **Backend:** `src-tauri/src/ssh/file_manager_transfer.rs` ejecuta los ítems en secuencia sobre una conexión SFTP; `RemoteTransferBatchInput` se define en `src-tauri/src/ssh/types.rs` y se exporta con ts-rs a `src/types/tauri-types.d.ts`. La cancelación usa `ssh_cancel_remote_job(job_id)`.
- **BD y generadores:** fuente del esquema en `src/drizzle/entities/`, SQL generado en `migrations/` y aplanado a `src-tauri/migrations/` con `bun run drizzle:generate`; `bun run tables:generate` regenera `src-tauri/src/tables.rs`; `cargo test export_bindings` regenera `src/types/tauri-types.d.ts`; `bun run i18n:types` regenera `typed-locale.d.ts`.
- **Permisos:** `src-tauri/capabilities/default.json` solo concede `fs:allow-read-dir` y `fs:allow-stat`.

Contexto aportado por el agente (análisis previo):

- `UTree` admite `multiple`, `selectionBehavior="toggle"`, `propagateSelect`, `bubbleSelect`, `defaultExpanded`, `@select` y `@toggle` con `preventDefault()`; valida el enfoque de selección por icono y de bloque siempre expandido.
- `FileManagerPanel.loadChildren` ya devuelve una `Promise`, pero el contrato del emit no la propaga: convertirlo en prop función permite que la selección recursiva espere a que el nivel esté en `childrenByKey` antes de propagar con `propagateSelect`.
- `nextTransferKey()` produce `file-transfer-<timestamp>-N`, no `ssh-job-N`: el desempate del orden por `created_at` debe apoyarse en la secuencia numérica de la clave de cada job.

---

## 4. Decisiones

| Fecha | Decisión | De quién |
| --- | --- | --- |
| 2026-11-23 | Aprobar el diseño v2 e implementarlo con **un plan único de tres fases** (no uno por bloque). | usuario |
| 2026-11-23 | Todo el estado persistente en SQLite vía Drizzle/Pinia; `localStorage` solo se lee una vez para migrar marcas y la clave de ruta remota. | usuario |
| 2026-11-23 | Concurrencia configurable con valor por defecto 2; la degradación a secuencial es un fallback documentado con aviso. | usuario |
| 2026-11-23 | Jobs activos al reiniciar → `interrupted`, con reintento manual por ítem; retención sin límite hasta «Limpiar terminados». | usuario |
| 2026-11-23 | No crear comandos Rust para la persistencia: lecturas y escrituras van por `db` (`query_raw`). | usuario (regla del proyecto) |
| 2026-11-23 | Umbral de la selección recursiva: profundidad máxima 5 niveles, 500 entradas por directorio y 5.000 nodos por selección; al superarlo se muestra un aviso i18n y se marca el nivel como parcial. | agente |
| 2026-11-23 | `SshJob.createdAt` (ISO) se asigna al crear el job y se mapea a `created_at`; se desempata por la secuencia final de la clave (`ssh-job-N` / `file-transfer-<timestamp>-N`). | agente |
| 2026-11-23 | La vista de transferencias usa el slot `node-leading-info` de `FileTree` para la metadata a la izquierda; `item-trailing` sigue siendo el valor por defecto en el panel de archivos. | agente |
| 2026-11-23 | Los tipos de Rust se regeneran con `cargo test export_bindings` (no se edita `src/types/tauri-types.d.ts` a mano). | agente (según `AGENTS.backend.md` §7) |

**Alternativas descartadas:** `localStorage` y `tauri-plugin-store` como almacén; adaptador puente/doble escritura; comandos Rust `crud_*` para el nuevo estado; reactivar automáticamente las transferencias al abrir; un plan por bloque (el usuario eligió uno único); añadir `createdAt` a la instantánea JSON en vez de a la columna `created_at`.

---

## 5. Problemas y riesgos

### P1 — Concurrencia sobre una única `SftpSession`

- `run_item` toma `&SftpSession` y callbacks `FnMut` no `Send`; no está demostrado que `russh-sftp 2.3.0` permita compartir la sesión entre tareas.
- **→ Riesgo ALTO.** En la fase 3 se comprueba clonar el handle o usar `Arc<Mutex<…>>`; si no es seguro, se abren sesiones SFTP adicionales sobre el mismo cliente SSH. Solo si ambas opciones fallan se degrada a secuencial, con aviso i18n y default 2 en condiciones normales. Debe preservarse la cancelación por `job_id` y el orden de los eventos por `key`.

### P2 — Reactividad del estado restaurado

- `jobs` es un `reactive(Map)`: mutar un objeto crudo no notifica; `selected` de `FileTree` es `shallowRef`, por lo que solo reasignarlo completo dispara el `watch`. Los snapshots de SQLite se hidratan en bloque.
- **→ Riesgo MEDIO.** Reasignar `selected.value`, `expanded.value` y `jobs` completos al hidratar; nunca mutar propiedades anidadas de refs shallow. Verificar con la recarga de la app.

### P3 — Migración única sin doble escritura

- Las marcas y la ruta remota actual viven en claves `useStorage`; si se migran pero no se borran, la app sigue dependiendo de `localStorage` y la preferencia por host puede quedar desfasada.
- **→ Riesgo MEDIO.** Migrar en el arranque, borrar las claves y comprobar que una segunda ejecución no vuelve a leerlas. Conservar la clave compuesta `host + ruta + tamaño + fecha` y el `prune()` actual.

### P4 — Contrato asíncrono del árbol

- `load-children` es un emit sin retorno; marcar un directorio antes de cargar sus hijos deja descendientes sin seleccionar.
- **→ Riesgo MEDIO.** Pasar a prop `loadChildren(key): Promise<void>` y esperarla; el `@select` se cancela con `preventDefault()` para que solo el icono cambie la selección. Probar directorios anidados y deselección.

### P5 — Orden de la cola y tipos autogenerados

- No hay `createdAt` en memoria y `RemoteTransferBatchInput` documenta aún ejecución secuencial.
- **→ Riesgo BAJO.** Añadir `createdAt` y regenerar `src/types/tauri-types.d.ts` con `cargo test export_bindings`; verificar que el comentario cambia y que `vue-tsc` no detecta usos rotos.

---

## 6. Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**. Los pasos marcados como *(manual)* los ejecuta el usuario.

### Fase 1 — Esquema, directorio base del host, preferencias y listados/árbol

1. Añadir la entidad `default_remote_path` en `src/drizzle/entities/hosts.ts` y las tres entidades nuevas en `src/drizzle/entities/` (`fileManagerPreferences`, `fileManagerListings`, `fileManagerTransfers`) con `timestamps`, índice por `created_at` en transfers y `scope_key` único en listings.
2. *(Manual)* Ejecutar `bun run drizzle:generate` y `bun run tables:generate`; comprobar que el SQL aplanado aparece en `src-tauri/migrations/` y no editar archivos autogenerados.
3. Añadir el campo a `HostForm.vue`, la validación de ruta absoluta en `useHostValidation.ts` y las claves i18n en `form.hosts`, `entity.host` y `pages.hosts` (es + en).
4. Crear `src/stores/fileManagerPersistence.ts` (único acceso Drizzle para este módulo) y los stores `useFileManagerPreferences`, `useFileManagerListings`, `useFileManagerQueue` en `src/stores/`.
5. Sustituir los `useStorage` de `file-manager.vue` por el store de preferencias; migrar la clave de ruta remota única a la preferencia del host seleccionado y borrarla. Implementar la ruta inicial por host (`default_remote_path` → `/`) y el botón «Restablecer ruta» en el panel remoto.
6. Hidratar `FileManagerPanel.vue` desde el store con stale-while-revalidate; persistir `entries`, `childrenByKey`, `loadedKeys`, `expandedKeys`, `selection`, ruta y `truncated` por `scope_key` (`local:<ruta>` / `remote:<host_id>:<ruta>`); no descartar listados al cambiar de host y purgar solo los de hosts borrados/deshabilitados.
7. Portar la utilidad de iconos de `_archived.dist/src/lib/files.ts` a `src/utils/icons.ts` adaptada a `FileEntry`; en `FileTree.vue` quitar `UCheckbox` y `item.icon`, usar el icono del slot `#item-leading` como control con icono de seleccionado, `bubbleSelect`, `propagateSelect`, `selectionBehavior="toggle"` y `@select.prevent`.
8. Convertir `load-children` en prop `loadChildren(key): Promise<void>`, añadir `children-loaded` para guardar la instantánea, cargar recursivamente antes de marcar un directorio con los umbrales de §4 y aviso i18n; mantener el botón de expansión sin alterar la selección.
9. *(Manual)* Ejecutar `bun run i18n:types` tras añadir claves, y documentar el directorio base en `docs/content/es/004.hosts/` y el resto en `docs/content/es/008.file-manager/`.

### Fase 2 — Cola persistida, `interrupted`, reintento y vista de transferencias

1. Crear el observador de snapshots en `useRemoteFileManager.ts` que escribe cada job en `deployer_file_manager_transfers` con `debounce` para `file_progress`; `hydrate()` restaura jobs y convierte `pending`/`running` en `interrupted` limpiando `jobId`. Añadir `SshJob.createdAt` en `useSshJobs.ts` y mapearlo a `created_at`.
2. Cablear `interrupted` en `SshJobStatus`, `FINISHED`/`ACTIVE` de `TransferQueue.vue`, sus `isActive()`, `statusColor()` y contador, los `isActive()`/`statusColor()` de `file-manager.vue`, `isActiveStatus()` y `clear()` de `useSshJobs.ts`, y `completed` de `useRemoteFileManager.ts`. Añadir la clave i18n en `components.file_manager.status.*`.
3. Implementar el botón **Reintentar** por job: reconstruir `FileManagerTransferRequest` desde el snapshot, nueva clave, `retryOf` al job anterior; deshabilitarlo con aviso si el host no existe o está deshabilitado. Mantener el job anterior en el historial y borrar las filas SQLite con «Limpiar terminados».
4. Migrar `src/stores/remoteFileMarks.ts`: lectura única de `deployer-remote-file-marks`, escritura en SQLite, borrado de la clave y store hablando solo con `fileManagerPersistence`; conservar `markKey`, `prune()` y `clear()`.
5. Rehacer `TransferQueue.vue`: un bloque por job ordenado por `created_at` descendente (incluidos `interrupted`), cabecera con dirección/estado/bytes/rutas/error y acciones **Cancelar**/**Reintentar**, y detalle en `FileTree` de solo lectura con `defaultExpanded` + `@toggle.prevent` (sin `expandedKeys`).
6. Normalizar `SshJobFile.relativePath` (`\` → `/`, descartar vacíos y `.`), construir `TreeItem` anidados y mostrar bytes/tamaño/porcentaje/estado a la izquierda del nombre mediante el slot `node-leading-info`; progress y error debajo de la fila. Claves nuevas en `components.file_manager.queue.*` con espejo en `en`.
7. *(Manual)* Ejecutar `bun run i18n:types` y actualizar `docs/content/es/008.file-manager/` con persistencia, reintento y nueva vista.

### Fase 3 — Concurrencia configurable en el lote SFTP

1. Añadir `max_concurrency: number | null` a `RemoteTransferBatchInput` en `src-tauri/src/ssh/types.rs` (normalización `null` → 2, rango 1-N) y leer la preferencia en `useRemoteFileManager.ts` para enviarla en cada lote.
2. *(Manual)* Regenerar tipos con `cargo test export_bindings` y verificar que `src/types/tauri-types.d.ts` ya no describe el lote como secuencial.
3. Estudiar el uso de `SftpSession` con `run_item`: probar handle clonable o `Arc<Mutex<…>>`; si no es seguro, abrir sesiones SFTP adicionales sobre el mismo cliente SSH. Limitar ítems en `running` a `max_concurrency`, dejar el resto `pending` y serializar `channel.send()`.
4. Mantener el registro de todos los tokens al inicio (`batch_started.job_ids`), `item_started` desordenado y la cancelación por `job_id`, incluidos ítems pendientes. Agregar `progress`, `item_finished` y `batch_finished` por clave sin asumir orden de inicio.
5. Mostrar el límite en la UI (máximo N `running`) y el aviso i18n solo si se degrada a secuencial. Actualizar `AGENTS.backend.md` y `docs/content/es/008.file-manager/`.

---

## 7. Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/drizzle/entities/hosts.ts` | Columna `default_remote_path`. |
| `src/drizzle/entities/` (3 nuevos) | Entidades de preferences, listings y transfers. |
| `src/components/form/HostForm.vue` | Campo «directorio base (file manager)». |
| `src/composables/validation/useHostValidation.ts` | Validación de ruta absoluta. |
| `src/stores/fileManagerPersistence.ts` (nuevo) | Único acceso SQLite del módulo. |
| `src/stores/useFileManagerPreferences.ts`, `useFileManagerListings.ts`, `useFileManagerQueue.ts` (nuevos) | Stores de dominio. |
| `src/stores/remoteFileMarks.ts` | Migración única y persistencia en SQLite. |
| `src/pages/dashboard/file-manager.vue` | Preferencias, selección/rutas persistentes, botón «Restablecer ruta», estados `interrupted`. |
| `src/components/pages/file-manager/FileManagerPanel.vue` | Hidratación, `loadChildren` async, ruta inicial por host. |
| `src/components/pages/file-manager/FileTree.vue` | Iconos, selección por icono, `bubbleSelect`, slot `node-leading-info`, modo siempre expandido. |
| `src/components/pages/file-manager/TransferQueue.vue` | Bloques ordenados, `interrupted`, reintento, `FileTree` de solo lectura. |
| `src/composables/useSshJobs.ts` | `SshJob.createdAt`, `interrupted`, `isActiveStatus()`, `clear()`. |
| `src/composables/useRemoteFileManager.ts` | `hydrate()`, observador, reintento, `max_concurrency`. |
| `src/utils/icons.ts` | Utilidades de iconos por extensión portadas desde `_archived.dist/src/lib/files.ts`. |
| `src/types/tauri-types.d.ts` | Regenerado (no editado a mano) con `max_concurrency`. |
| `src-tauri/src/ssh/types.rs` | `max_concurrency` en `RemoteTransferBatchInput`. |
| `src-tauri/src/ssh/file_manager_transfer.rs` | Ejecución limitada, eventos y cancelación. |
| `src/locales/es/**` y `src/locales/en/**` | Claves nuevas de hosts, árbol, cola y estados. |
| `typed-locale.d.ts` | Regenerado con `bun run i18n:types`. |
| `migrations/**`, `src-tauri/migrations/**`, `src-tauri/src/tables.rs` | Generados por los comandos manuales. |
| `AGENTS.frontend.md`, `AGENTS.backend.md`, `docs/content/es/004.hosts/`, `docs/content/es/008.file-manager/` | Documentación derivada. |

---

## 8. Verificación y criterios de aceptación

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

- [x] Cambiar concurrencia, rutas y opciones; cerrar y reabrir la app; comprobar que se conservan.
- [x] Dejar varios niveles expandidos y archivos seleccionados, recargar y verificar que se restaura todo y se revalida contra SFTP.
- [x] Seleccionar un directorio por su icono: se cargan y marcan todos sus descendientes; el clic en la fila no selecciona; al superar el umbral aparece el aviso.
- [x] Pulsar «Restablecer ruta» y comprobar que vuelve a `default_remote_path` (o `/`) sin afectar a otros hosts ni al `working_dir` de la consola.
- [x] Modificar un archivo marcado como «descargado» y verificar que la marca se retira tras revalidar; comprobar que no quedan claves `localStorage` del gestor.
- [x] Cerrar una descarga a mitad, reabrir y ver el job `interrupted` con su detalle y botón **Reintentar**; el reintento crea un job nuevo y conserva el anterior.
- [x] Comprobar que «Limpiar terminados» borra también las filas SQLite, incluidos los `interrupted`, y que no reaparecen.
- [x] Ver la pestaña Transferencias: bloques del más reciente al más antiguo, detalle que no se puede contraer y metadata a la izquierda del nombre; el orden se mantiene tras recargar.
- [x] Ajustar `max_concurrency` a 1, 2 y un valor mayor; verificar que nunca hay más ítems en `running` que el límite y que la cancelación de un pendiente sigue funcionando.
- [x] Comprobar que la consola remota sigue igual (sin jobs persistidos ni estados nuevos) y que el comentario de `RemoteTransferBatchInput` ya no dice «se ejecutan en secuencia».

---

## 9. Desviaciones

- **2026-11-23:** el usuario decide ejecutar él mismo los cuatro generadores (`bun run drizzle:generate`, `bun run tables:generate`, `bun run i18n:types` y `cargo test export_bindings`). El agente escribe el código fuente y deja los comandos indicados; hasta que se ejecuten, los archivos autogenerados (`schema.ts`, `relations.ts`, `tables.rs`, migraciones, `typed-locale.d.ts` y `tauri-types.d.ts`) no reflejarán los cambios.

---

## 10. Puntos abiertos

Ninguno. Los umbrales, el desempate del orden, el slot de metadata y el comando de regeneración de tipos quedan fijados en §4; la viabilidad de compartir `SftpSession` es un riesgo técnico resuelto dentro de la fase 3, no una decisión pendiente del usuario.

---

## 11. Sugerencias (no solicitadas, pendientes de aprobación)

Ninguna en este plan. Las ideas aplazadas siguen en `.agents/AGENTS.futuro.md` §4b y las operaciones de escritura remota y el editor de contenido quedan descartados por decisión del usuario.

---

## 12. Historial de revisiones

- **2026-11-23:** Plan creado en estado **Planificando** a partir del diseño v2 aprobado, con tres fases en un único plan por decisión del usuario.
- **2026-11-23:** el usuario ordena «Implementa el plan»; se pasa a **Ejecutando** y se inicia la fase 1.
- **2026-11-23:** revisión final del código de las tres fases. Se corrige el literal de `TransferResult` usado en el relleno de huecos del lote, se añade `#[serde(default)]` a `RemoteTransferBatchInput.max_concurrency` para no romper clients antiguos y se sustituye el texto de concurrencia por un `UInputNumber` (1-16, default 2) sobre la cola con clave i18n propia. Se actualizan `AGENTS.frontend.md`, `AGENTS.backend.md` y `docs/content/es/` (008.file-manager/{1,2,3} y 004.hosts/2.manage). El plan sigue **Ejecutando** hasta que el usuario ejecute los generadores (`bun run drizzle:generate`, `bun run tables:generate`, `bun run i18n:types`, `cargo test export_bindings`) y las verificaciones (`vue-tsc`, `build`, `cargo check`) y confirme los criterios de §8.
- **2026-11-24:** corrección de los generadores y de `vue-tsc` informados por el usuario: patrón `Progress { .. }` en el forwarder de Rust, claves primarias definidas a nivel de tabla en las tres entidades nuevas, eliminación del workaround de `Host` en `edit.vue` y del cast de `max_concurrency` tras regenerar bindings.
- **2026-11-24:** bug detectado en pruebas: al descargar una carpeta aparecían dos bloques copiando el mismo archivo. `UTree` propaga la selección a los descendientes y la página creaba un job por entrada. Nueva utilidad `topLevelEntries()` en `src/utils/paths.ts`, aplicada a `upload()`/`download()` para conservar solo entradas superiores y deduplicar claves. Se documenta en `AGENTS.frontend.md` y `docs/content/es/008.file-manager/2.transfers.md`.
- **2026-11-24:** estabilización de la sesión de desarrollo: patrón `**/*.sqlite*` en `vite.config.ts` para evitar recargas por `deployer-app.sqlite-journal`, modo **WAL** con `busy_timeout` de 5 s en los pools de escritura (`src-tauri/src/helpers.rs`), `QueryRawError` con el motivo real de SQLite y manejo explícito de los errores de persistencia de la cola. El usuario confirma que desaparecen las recargas y los errores `database is locked`.
- **2026-11-24:** el usuario confirma que la concurrencia por elementos seleccionados funciona (varios archivos sueltos se descargan en paralelo hasta el límite configurado; una carpeta sigue siendo un único job con sus archivos secuenciales, según el alcance acordado). Da por completado el plan y el diseño de origen; se archivan en `.agents/.done/`.
