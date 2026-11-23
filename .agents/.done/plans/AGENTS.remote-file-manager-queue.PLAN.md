# Plan: Gestor de archivos remoto de doble panel (3/3) — Cola de transferencias y cierre

## Estado

**Terminado** — verificado por el usuario el 2026-11-22.

**Diseño de origen:** `.agents/.done/designs/AGENTS.remote-file-manager.DESIGN.md`. Corresponde al bloque 3 de la sección 7 del diseño.
**Serie:** `remote-file-manager` — plan 3 de 3. Hermanos: `AGENTS.remote-file-manager-backend.PLAN.md`, `AGENTS.remote-file-manager-ui.PLAN.md`.
**Dependencia:** requiere `AGENTS.remote-file-manager-backend.PLAN.md` (infraestructura SSH y helpers de transferencia) y `AGENTS.remote-file-manager-ui.PLAN.md` (página, paneles y slots del árbol).
**Orden de ejecución:** 3 de 3. No hay planes posteriores; al cerrarlo se avisa al usuario para que pase el diseño a **Implementado**.

> **Revisión (2026-11-20):** corregido el origen del progreso: `transfer.rs` solo ofrece callbacks `FnMut(&str)` (líneas de texto) y devuelve `TransferResult` al terminar, así que los bytes no pueden emitirse desde ese callback. `progress` queda como avance por ítem completado; el progreso continuo en bytes se decide más adelante. Corregida también la profundidad máxima de descarga a 32.

---

## Instrucciones dadas (verbatim)

> "Si prepara un plan para el diseño de gestor de doble panel, ten encuenta que tenemos un componente que es para mostrar un árbol de archivos TreeFiles.
>
> En cuanto a esto russh-extra 0.1.7 prepara una comparativa para determinar si es conveniente usarlo, sí tiene todo lo que usamos, y así no tener que mantener código propio."

Instrucciones posteriores (verbatim):

> "He agregado comentarios"
>
> "Me gusta, si lo entendí bien, eso quiere decir que en el TreeFile se verá en cada item esa información y las opciones.
> Sería útil si se marcase el archivo de origen como que ya se a descargado."
>
> "Persistir, pero en el localstorage, con pinia."
>
> "Solo transferir y cancelar (Recomendado)"
>
> "Ya he agregado Pinia como dependencia directa."
>
> "Bien, ya puedes crear el plan."

Contexto aportado por el agente (análisis previo):

- `ssh_upload_file`/`ssh_download_file` abren una conexión SSH por llamada: con Many items eso sería una conexión por archivo.
- `useSshJobs.ts` ya es multi-job y genérico, con `reactive` en los jobs, `cancel(key)` en cascada, `cancelAll()` y `clear(key?)`; `useRemoteCommand.ts` es solo la fachada de consola y no debe modificarse.
- `RemoteJobCancel` registra un token por job y `ssh_cancel_remote_job(job_id)` cancela un job concreto; la cascada se decide en el frontend.
- Pinia está declarado en `package.json` (`^4.1.0`) e inicializado en `src/main.ts`; es estado local de UI, por lo que no se usa `@pinia/colada`.
- La documentación de usuario nueva va en `docs/content/es/008.file-manager/` (`007` ya corresponde a variables).

---

## Objetivo

Añadir la cola de transferencias con una sola conexión SFTP por lote, progreso y cancelación por ítem, reflejar ese estado en cada nodo del árbol y persistir la marca «descargado» del origen remoto en `localStorage` con Pinia. Cerrar además i18n `es`/`en`, documentación de usuario y guías `AGENTS*.md`.

**No entra en este plan:** editar, renombrar, crear o borrar archivos remotos; `chmod` interactivo; sincronización de carpetas; búsqueda; reintentos; pool persistente de sesiones.

---

## Contexto técnico actual

- `src-tauri/src/ssh/transfer.rs` contiene `upload_dir`, `download_dir`, `upload_single_file`, `download_single_file` y la política de symlinks (`STAT`, `canonicalize`, enlaces rotos omitidos, `MAX_DOWNLOAD_DEPTH = 32`). `join_remote_path` ya es `pub(crate)` desde el plan 1.
- Las funciones de `transfer.rs` reciben `on_output: &mut F where F: FnMut(&str)` (solo líneas de texto) y devuelven `TransferResult { bytes_transferred, files_transferred }` al terminar; además leen los archivos con `read_to_end`, por lo que hoy no hay bytes parciales que emitir.
- `src-tauri/src/ssh/transfer_commands.rs` usa `Channel<RemoteConsoleEvent>`, `CommandResponse<T>` y `RemoteJobCancel`; los eventos actuales son `started`, `output_chunk`, `finished` y `error`.
- `src-tauri/src/ssh/cancel.rs` expone `RemoteJobCancel::register()` y `ssh_cancel_remote_job(job_id)`; el `job_id` se entrega al frontend en el evento `started`.
- `src/composables/useSshJobs.ts` mantiene un `reactive(Map<string, SshJob>)`; cada job conserva `key`, `jobId`, `status`, `output`, `result`, `finishStatus`, `startedAt` y `finishedAt`.
- `src/pages/dashboard/file-manager.vue` y `src/components/remote/file-manager/FileTree.vue` existen desde el plan 2 y exponen slots por nodo para estado/progreso/acciones.
- `src/locales/es/` es la fuente i18n y `src/locales/en/` el espejo; `typed-locale.d.ts` es autogenerado.
- `docs/content/es/` contiene `007.variables`, por lo que el gestor se documentará en `008.file-manager/`.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-20 | Un único comando de lote con una sola conexión SSH/SFTP para todos los ítems (decisión del agente, ratificada en el diseño). |
| 2026-11-20 | Eventos nuevos con `ts-rs` (`batch_started`, `item_started`, `progress`, `item_finished`, `batch_finished`), sin tocar `RemoteConsoleEvent` (decisión del diseño). `progress { key, bytes, total }` se emite al completar cada ítem usando `TransferResult.bytes_transferred`, **no** desde el callback `FnMut(&str)`: es avance por ítem, no streaming de bytes. |
| 2026-11-20 | No ampliar `transfer.rs` con un callback de bytes en esta versión: sus funciones leen con `read_to_end`, así que el progreso continuo exigiría cambiar el bucle de lectura y todas las firmas. |
| 2026-11-20 | Cancelación: un token por ítem en `RemoteJobCancel`; `ssh_cancel_remote_job(job_id)` sigue siendo el único comando; la cascada se resuelve en `useSshJobs` (decisión del diseño). |
| 2026-11-20 | Estado y acciones por nodo del árbol además del panel de cola; sin reintentos en la primera versión (decisión del usuario vía comentario). |
| 2026-11-20 | Marca «descargado» persistida en `localStorage` con un store de Pinia, clave `host_id + ruta + tamaño + fecha` (decisión del usuario). |
| 2026-11-20 | Documentación de usuario solo en `docs/content/es/008.file-manager/` hasta confirmación (regla del proyecto). |

**Alternativas descartadas:** un `invoke` por archivo (abre una conexión por ítem), pool de sesiones SFTP por host (diferido a fases futuras), `plugin-store` para las marcas (decisión del usuario), persistencia en BD (no aplica: es estado de UI), reintentos automáticos (fuera de la primera versión).

---

## Problemas y riesgos encontrados

### P1 — Concurrencia sobre `SftpSession`

- `russh-sftp 2.3.0` puede no permitir varias transferencias simultáneas sobre la misma sesión sin clones o sincronización.
- **→ Riesgo ALTO.** Procesar los ítems en secuencia por defecto; solo activar concurrencia (2-4) si se comprueba que la API lo permite de forma segura. El objetivo de una sola conexión se cumple en cualquier caso.

### P2 — Correlación de eventos con jobs del frontend

- Un único `invoke` debe alimentar varios jobs; los eventos deben llegar con la clave de cliente correcta.
- **→ Riesgo MEDIO.** Incluir `key` en cada evento e insertar el `job_id` de `item_started` en `SshJob.jobId`; mantener `useSshJobs` genérico con un adaptador de lote, sin acoplarlo al gestor.

### P3 — Semántica de cancelación

- El backend cancela un solo `job_id`; el frontend debe poder cancelar un ítem, la cascada de dependencias y el lote completo.
- **→ Riesgo MEDIO.** `cancel(key)` sigue resolviendo dependencias en `useSshJobs`; la cancelación del lote se hace cancelando las claves de sus ítems. Sin clave, `cancel()` no cancela todos por defecto.

### P4 — Caducidad de la marca «descargado»

- Un `localStorage` puede acumular marcas de archivos que ya no existen o que cambiaron.
- **→ Riesgo MEDIO.** La clave incluye `host_id`, ruta, tamaño y fecha; al navegar se compara con `RemoteEntry` y se descarta la marca obsoleta; el store expone una función de limpieza.

### P5 — Generados y documentación

- `src/types/tauri-types.d.ts` y `typed-locale.d.ts` son autogenerados; la documentación nueva debe ceñirse al código.
- **→ Riesgo BAJO.** Regenerar tipos con los mecanismos del proyecto (paso manual del usuario) y verificar cada afirmación documental contra componentes y comandos reales.

### P6 — Progreso en bytes

- El callback de `transfer.rs` es `FnMut(&str)` (mensajes de texto), no bytes; los bytes solo están disponibles en el `TransferResult` devuelto al final de cada ítem, y las lecturas usan `read_to_end`.
- **→ Riesgo MEDIO.** Emitir `progress { key, bytes, total }` al terminar cada ítem/archivo desde `TransferResult` y mostrar en la cola el avance por archivos completados. No prometer una barra que crezca byte a byte; el streaming real queda como mejora futura.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Comando de lote en el backend

1. Añadir en `src-tauri/src/ssh/types.rs`: `RemoteTransferBatchInput` (`host_id`, `ssh_reconnect_attempts`, ítems), `RemoteTransferItemInput` (`key`, `direction`, `local_path`, `remote_path`, `overwrite`, `chmod`, `recursive`), `RemoteTransferItemResult`, `RemoteBatchResult` y el enum `RemoteFileManagerEvent` con `batch_started`, `item_started { key, job_id }`, `progress { key, bytes, total }` (al completar cada ítem), `item_finished { key, status, result }` y `batch_finished`. Derivar `TS` y exportar a `tauri-types.d.ts`.
2. Crear `src-tauri/src/ssh/file_manager_transfer.rs` con `ssh_file_manager_transfer(input, channel, state) -> Result<CommandResponse<RemoteBatchResult>, String>`.
3. Abrir **una sola** conexión con `connect_to_host_by_id` → `ensure_connected` → `open_sftp_session`; registrar un `CancellationToken` por ítem con `RemoteJobCancel::register()` y retirarlo con `RemoteJobGuard`.
4. Ejecutar cada ítem con las funciones existentes de `transfer.rs` (`upload_dir`, `download_dir`, `upload_single_file`, `download_single_file`), secuencialmente por defecto. El callback `on_output: &mut F where F: FnMut(&str)` solo entrega líneas de texto: acumularlas en `output` y emitir `progress { key, bytes, total }` **al terminar el ítem** desde el `TransferResult` devuelto, no desde ese callback.
5. Emitir `item_started`, `item_finished` y `batch_finished` con el `job_id` y la clave de cliente; mapear errores a `SshError`/`keys::*` y respetar `token.is_cancelled()`.
6. Declarar/reexportar el módulo en `src-tauri/src/ssh/mod.rs` y registrar el comando en `src-tauri/src/lib.rs`. No crear migraciones SQL.

### Fase 2 — Motor de jobs y composable

1. Ampliar `useSshJobs.ts` con un adaptador de lote: un único `invoke` puede crear/actualizar varios jobs por `key`, conservando la forma de `SshJob` y la API pública (`execute`, `upload`, `download`, `cancel`, `clear`, `appendOutput`).
2. Asignar `jobId` desde `item_started`, actualizar el estado desde `item_finished` y el progreso (por ítem completado) desde `progress`, usando el acumulador `output` o un campo de progreso sin romper la fachada de consola.
3. Crear `src/composables/useRemoteFileManager.ts` como fachada del gestor: recibe los eventos de transferencia desde la página, construye la cola de ítems y expone `enqueue`, `cancel(key)`, `clearFinished` y el estado agregado. No modificar `useRemoteCommand.ts`.

### Fase 3 — Store de marcas «descargado»

1. Crear `src/stores/remoteFileMarks.ts` con `defineStore` y persistencia en `localStorage` (directamente o con `useStorage` de `@vueuse/core`, ya disponible).
2. Clave compuesta por `host_id + ruta remota + tamaño + fecha`; API: `markDownloaded(entry)`, `isDownloaded(entry)` y `prune(entries)`.
3. Llamar a `markDownloaded` al recibir `item_finished` con éxito de un ítem `download`; al navegar el panel remoto, usar `prune` con las entradas del `RemoteListing`.

### Fase 4 — Cola y árbol

1. Crear `src/components/remote/file-manager/TransferQueue.vue`: lista de ítems con dirección, origen, destino, estado, bytes/total al completar cada ítem (avance por archivos, no byte a byte) y botón de cancelación; `clear` solo elimina terminados.
2. Rellenar los slots preparados en `FileTree.vue` con el mismo estado/progreso y las acciones disponibles (cancelar y limpiar; sin reintentos).
3. Conectar en `src/pages/dashboard/file-manager.vue` los eventos de los botones `→`/`←` con `useRemoteFileManager`; comprobar que `cancel(key)` y la cascada funcionan sin cancelar todo por defecto.

### Fase 5 — i18n, documentación y guías

1. Añadir las claves de la cola, estados, progreso y errores en `src/locales/es/pages/file-manager.ts` y `src/locales/es/components/file-manager.ts`, con espejo en `en`; el backend sigue enviando claves y `message_params`.
2. Crear `docs/content/es/008.file-manager/` con páginas de navegación, transferencias, cola y marcas, verificando cada afirmación contra el código; no traducir a otros idiomas sin confirmación.
3. Actualizar `AGENTS.backend.md` (comando de lote, eventos y cancelación) y `AGENTS.docs.md` si cambia la estructura de documentación.
4. Dejar indicado al usuario que ejecute `bun run i18n:types` y regenere los tipos `ts-rs` (pasos manuales).

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src-tauri/src/ssh/types.rs` | Tipos del lote y del evento `RemoteFileManagerEvent` con `ts-rs`. |
| `src-tauri/src/ssh/file_manager_transfer.rs` | Nuevo comando `ssh_file_manager_transfer`. |
| `src-tauri/src/ssh/mod.rs`, `src-tauri/src/lib.rs` | Registro del módulo y del comando. |
| `src-tauri/src/ssh/error.rs`, `src/locales/{es,en}/tauri.ts` | Solo si hacen falta claves de error nuevas. |
| `src/types/tauri-types.d.ts` | Regenerado por `ts-rs` (no editar a mano). |
| `src/composables/useSshJobs.ts` | Adaptador de lote sin romper la fachada de consola. |
| `src/composables/useRemoteFileManager.ts` | Nueva fachada del gestor. |
| `src/stores/remoteFileMarks.ts` | Nuevo store Pinia con `localStorage`. |
| `src/components/remote/file-manager/TransferQueue.vue` | Nueva cola de transferencias. |
| `src/components/remote/file-manager/FileTree.vue` | Rellenar slots de estado/progreso/acciones. |
| `src/pages/dashboard/file-manager.vue` | Conectar botones y cola. |
| `src/locales/es/pages/file-manager.ts`, `src/locales/es/components/file-manager.ts` y espejos `en` | Claves de cola, estados y errores. |
| `docs/content/es/008.file-manager/` | Documentación de usuario nueva. |
| `AGENTS.backend.md`, `AGENTS.docs.md` | Comandos/eventos y estructura documental. |
| `typed-locale.d.ts` | Autogenerado; no editar a mano. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Enviar una carpeta con cientos de archivos en ambas direcciones y comprobar que se abre **una sola** conexión SSH para todo el lote.
2. Ver el estado y los bytes transferidos al terminar cada ítem (avance por archivos completados) tanto en la cola como en cada nodo del árbol; comprobar que no se muestra una barra que prometa bytes en tiempo real.
3. Cancelar un ítem concreto y comprobar que los demás continúan; probar también la cancelación en cascada desde `useSshJobs` y verificar que `cancel()` sin clave no cancela todo.
4. Confirmar que solo los ítems terminados se pueden limpiar y que no hay estados «ejecutando» pegados.
5. Descargar un archivo y comprobar que su nodo remoto queda marcado como «descargado»; recargar la página y verificar que la marca persiste; cambiar el archivo remoto y comprobar que la marca se retira.
6. Repetir la descarga de `/home/debian/backup/current` tras reconstruir Tauri: enlaces simbólicos, enlaces rotos y profundidad.
7. Comprobar que los errores muestran `reason` y que no aparecen textos sin traducir al cambiar entre `es` y `en`.

---

## Criterios de aceptación

- [ ] `ssh_file_manager_transfer` procesa el lote con una sola conexión SSH/SFTP.
- [ ] Los eventos `item_started`/`progress`/`item_finished` llegan con `key` y `job_id` y alimentan los jobs de `useSshJobs`; `progress` se origina en `TransferResult`, no en el callback de texto.
- [ ] La cola y cada nodo del árbol muestran estado y progreso; la cancelación es individual y en cascada, nunca global por defecto.
- [ ] `useRemoteCommand.ts` y la consola actual siguen intactos.
- [ ] El store Pinia persiste las marcas en `localStorage` y las invalida por tamaño/fecha.
- [ ] i18n `es`/`en` y `docs/content/es/008.file-manager/` están completos y `AGENTS*.md` actualizados.
- [ ] No hay migraciones SQL nuevas ni escritura remota fuera del alcance.

### Desviaciones

- `batch_started` incorpora `job_ids: Record<string, number>`: el plan solo preveía `total`, pero sin entregar los `job_id` de los ítems pendientes no se podía cumplir la cancelación individual de un ítem que aún no ha empezado (P3). `item_started` sigue entregando `{ key, job_id }`.
- `RemoteTransferItemResult` añade `output`: el callback `FnMut(&str)` de `transfer.rs` solo da líneas de texto y el plan pedía acumularlas; sin este campo se perdían.
- `prune(hostId, entries)` solo invalida las marcas de las rutas **listadas** cuyo tamaño/fecha cambiaron (o desaparecieron de esa ruta), en lugar de borrar todas las marcas no presentes en el nivel: lo contrario destruiría las marcas de otros directorios al navegar.
- Los módulos i18n son `pages/file_manager.ts` y `components/file_manager.ts` (snake_case), no los nombres con guion del plan: el generador de `typed-locale.d.ts` necesita identificadores TS válidos.
- El lote se ejecuta **secuencialmente** por decisión del diseño; no se activa concurrencia 2-4 sobre `SftpSession` (P1 sigue abierto).

---

## Puntos abiertos

1. Límite de concurrencia dentro del lote (por defecto secuencial; valor propuesto 2-4 solo si la API de `SftpSession` lo permite).
2. Tamaño máximo del lote y del listado por directorio.
3. Reintentos por ítem y cancelación con reconexión (futuras fases).
4. Pool de sesiones SFTP por host para acelerar la navegación (futura fase).
5. Traducción de la documentación a otros idiomas: pendiente de confirmación del usuario.
6. Progreso continuo en bytes: exigiría ampliar `transfer.rs` (leer por chunks en vez de `read_to_end` y añadir un callback de bytes), con impacto en todas las firmas y callers. Fuera de esta versión.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-20 | Plan creado en estado **Planificando** a partir del diseño aprobado. |
| 2026-11-20 | Revisión técnica: `progress` se deriva de `TransferResult` (el callback es `FnMut(&str)`), `MAX_DOWNLOAD_DEPTH` corregido a 32 y riesgo P6 añadido. |
| 2026-11-22 | Ejecutadas las fases 1-5: comando de lote con una conexión y tokens por ítem, adaptador `runBatch`, fachada `useRemoteFileManager`, store Pinia de marcas, `TransferQueue`, slots del árbol, cableado de la página, i18n es/en, documentación `008.file-manager` y actualización de `AGENTS*.md`. |
| 2026-11-22 | El usuario confirmó «Todo ok» y dio por completado el diseño; plan terminado y archivado. Serie `remote-file-manager` completa (3/3). |
