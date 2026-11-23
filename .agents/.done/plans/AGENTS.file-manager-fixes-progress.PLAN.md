# Plan: Correcciones del gestor de archivos (2/2) — Progreso por archivo

## Estado

**Terminado** — verificado y cerrado por el usuario el 2026-11-23.

**Diseño de origen:** ninguno (mejora puntual de la serie `remote-file-manager`, ya cerrada).

**Serie:** `file-manager-fixes` — plan 2 de 2. Hermanos: `AGENTS.file-manager-fixes-ui.PLAN.md`.
**Dependencia:** ninguna (independiente del plan 1).
**Orden de ejecución:** 2 de 2. Ningún plan consume su resultado; puede ejecutarse antes o después del plan 1.

---

## Instrucciones dadas (verbatim)

> "Cuando se descarga una carpeta, se tiene que ver todos los archivos que contenien en el progreso, de forma recursiba, y marcar el progreso por archivo, actualmente no se ve que progreso se lleva al descargar un archivo, solo se ve que está en curso, es poca información."

Contexto aportado por el agente (análisis previo):

- Hoy `RemoteFileManagerEvent::progress { key, bytes, total }` se emite **una vez al terminar cada ítem** desde `TransferResult.bytes_transferred`; la cola solo ve el avance por ítem completado.
- `src-tauri/src/ssh/transfer.rs` lee los archivos con `read_to_end`, por lo que no hay bytes parciales que emitir; sus funciones reciben `on_output: &mut F where F: FnMut(&str)` (líneas de texto) y son compartidas por la consola remota.
- Las decisiones del usuario para este plan: aplicar el progreso a **descargas y subidas**, con **pre-listado completo recursivo antes de transferir** (todos los archivos y tamaños visibles desde el inicio), seguido de progreso por archivo.
- El pre-listado debe reutilizar la política de `transfer.rs` (resolución de symlinks, enlaces rotos omitidos y `MAX_DOWNLOAD_DEPTH = 32`) para que la lista coincida con lo que se transfiere.

---

## Objetivo

Mostrar en la cola, antes de empezar cada transferencia de carpeta, la lista recursiva completa de archivos con sus tamaños, y durante la transferencia el avance bytes a bytes y el estado de cada archivo, tanto en descargas como en subidas.

**No entra en este plan:** cambiar la API de la consola remota (`RemoteConsoleEvent` y sus comandos), reintentos, transferencias concurrentes, drag & drop, virtualización, crear/renombrar/borrar archivos ni editar contenido remoto.

---

## Contexto técnico actual

### Backend

- `src-tauri/src/ssh/types.rs` define `RemoteFileManagerEvent` con `batch_started { job_ids }`, `item_started { key, job_id }`, `progress { key, bytes, total }`, `item_finished { key, status, result }` y `batch_finished { … }`, todos derivados de `TS` y exportados a `tauri-types.d.ts`.
- `src-tauri/src/ssh/file_manager_transfer.rs` abre una sola conexión SSH/SFTP para el lote, registra un `CancellationToken` por ítem y delega en `run_item()` (líneas 182–248), que elige `upload_dir`/`upload_single_file`/`download_dir`/`download_single_file` según `direction` y `recursive`. El adaptador `emit` es un `FnMut(&str)` que acumula líneas de texto en el `output` del ítem.
- `src-tauri/src/ssh/transfer.rs`:
  - `SFTP_BUFFER_SIZE = 256 * 1024`, `CANCELLED_MSG` y `MAX_DOWNLOAD_DEPTH = 32`.
  - `upload_single_file` y `download_single_file` usan `read_to_end`; `upload_dir` y `download_dir(_inner)` recorren entradas y delegan en ellos.
  - `resolve_remote_symlink`, el manejo de enlaces rotos y el control de profundidad viven aquí.
- `src-tauri/src/ssh/transfer_commands.rs` (consola remota) usa las mismas utilidades con el callback `FnMut(&str)`: **sus firmas no deben romperse**.

### Frontend

- `src/composables/useSshJobs.ts`, `runBatch()` (líneas 396+): crea un `reactive<SshJob<RemoteTransferItemResult>>` por ítem en un `reactive(Map)`, conecta un `Channel<RemoteFileManagerEvent>` y actualiza `status`, `jobId`, `bytesTransferred`, `bytesTotal`, `result`, etc. en el `switch (event.event)`.
- `src/components/remote/file-manager/TransferQueue.vue` muestra una fila por job con dirección, rutas, estado, bytes acumulados y botón de cancelación; **no muestra detalle por archivo**.
- `src/components/remote/file-manager/FileTree.vue` ya expone los slots `node-status`, `node-progress` y `node-actions`, que la página reenvía; no es obligatorio modificarlos en este plan.
- `src/composables/useRemoteFileManager.ts` es la fachada de cola, marcas y cancelación; la cancelación de un ítem pasa por `jobId` y `ssh_cancel_remote_job`.
- `src/locales/es/components/file_manager.ts` y `en` contienen `queue.*` y `status.*`; `src/types/tauri-types.d.ts` es autogenerado.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-23 | El progreso por archivo cubre **descargas y subidas** (decisión del usuario). |
| 2026-11-23 | **Pre-listado completo recursivo** antes de transferir: el backend enumera todos los archivos y tamaños y emite la lista; después avanza archivo a archivo (decisión del usuario). |
| 2026-11-23 | El pre-listado reutiliza la política de `transfer.rs` para que la lista y la transferencia recorran exactamente los mismos archivos (decisión del agente). |
| 2026-11-23 | Añadir funciones **nuevas** en `transfer.rs` con callback de bytes, dejando intactas las firmas actuales que usa la consola remota (decisión del agente). |
| 2026-11-23 | Leer y escribir en chunks de `SFTP_BUFFER_SIZE` (256 KB) y emitir `FileProgress` con throttling de ~100 ms por archivo; comprobar cancelación entre chunks (decisión del agente). |
| 2026-11-23 | Conservar `progress { key, bytes, total }` como avance **agregado del ítem** (suma de bytes de archivos terminados) para no romper la cola actual; el detalle viaja en los eventos nuevos (decisión del agente). |
| 2026-11-23 | El `file_id` será la ruta relativa del archivo dentro del ítem, estable y legible en la UI (decisión del agente). |
| 2026-11-23 | Documentación de usuario solo en `docs/content/es/008.file-manager/` hasta confirmación (regla del proyecto). |

**Alternativas descartadas:** descubrimiento incremental de archivos (el usuario quiere verlos todos desde el inicio), solo descargas (el usuario eligió ambos sentidos), cambiar `read_to_end` directamente en las funciones compartidas (rompería la consola remota), emitir un evento por chunk sin throttling (riesgo de saturar el canal), eliminar `progress` (rompería `SshJob.bytesTransferred` y el resumen de la cola).

---

## Problemas y riesgos encontrados

### P1 — El pre-listado puede divergir de lo que realmente se transfiere

- Las descargas resuelven symlinks, omiten enlaces rotos y limitan la profundidad a 32; una enumeración independiente podría mostrar archivos que luego no se copian (o al revés).
- **→ Riesgo ALTO.** Extraer de `transfer.rs` una función de enumeración compartida (`list_remote_files` para SFTP y `list_local_files` para local) que devuelva la misma lista que recorren las transferencias, aplicando `resolve_remote_symlink`, el filtro de enlaces rotos y `MAX_DOWNLOAD_DEPTH`. Las descargas recursivas ya usan `read_dir` sobre la ruta resuelta: reutilizar ese mismo punto de decisión.

### P2 — Sobrecarga del canal de eventos

- Un chunk de 256 KB sobre un archivo de cientos de MB produciría miles de eventos y podría bloquear la UI.
- **→ Riesgo MEDIO.** Emitir `FileProgress` como máximo cada ~100 ms por archivo (mediante `tokio::time::Instant`) y siempre al terminar el archivo; la UI recibe actualizaciones fluidas sin inundarse.

### P3 — Cancelación a mitad de archivo

- Hoy el token se comprueba entre archivos; con streaming hay que poder detenerse dentro de un archivo.
- **→ Riesgo MEDIO.** Comprobar `token.is_cancelled()` en cada iteración del bucle de chunks, devolver `CANCELLED_MSG`, emitir `FileFinished` con estado `cancelled` para el archivo en curso y dejar los restantes como pendientes/cancelados según corresponda.

### P4 — Compatibilidad con la consola remota

- `transfer.rs` es compartido; cambiar `FnMut(&str)` o `read_to_end` afectaría a `ssh_upload_file`/`ssh_download_file`.
- **→ Riesgo ALTO.** Mantener las funciones actuales como envoltorios de las nuevas pasando un callback de bytes que no emite nada. `transfer_commands.rs` no se modifica.

### P5 — Coherencia de bytes agregados y por archivo

- La cola usa `job.bytesTransferred`/`bytesTotal` para el resumen; si cada archivo emite sus propios bytes hay riesgo de doble conteo.
- **→ Riesgo MEDIO.** `FileProgress` actualiza solo el campo del archivo; `progress` sigue calculándose en el backend como suma de archivos **terminados** y se emite tras cada `FileFinished`. El resumen de la cola no cambia de origen.

### P6 — Fallo en el pre-listado

- Si no se puede enumerar el origen (permisos, ruta desaparecida), no tiene sentido iniciar la transferencia.
- **→ Riesgo MEDIO.** Emitir el error con la clave i18n correspondiente y marcar el ítem como `error` antes de `item_started`, sin emitir `FileList`. La cola muestra el motivo con el mecanismo actual (`message_key`).

### P7 — Reactividad del estado por archivo

- `useSshJobs` usa jobs `reactive`, pero el gotcha del proyecto advierte sobre `shallowRef` en Pinia Colada.
- **→ Riesgo BAJO.** No usar Pinia Colada aquí: reasignar `job.files = [...]` al recibir `FileList` y mutar/reasignar cada entrada reactiva en los eventos de archivo, manteniendo el patrón existente de `runBatch`.

### P8 — Tipos autogenerados

- `src/types/tauri-types.d.ts` se genera desde `ts-rs`; no se edita a mano.
- **→ Riesgo BAJO.** El usuario ejecuta `cargo test export_bindings` tras los cambios en `types.rs`.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Tipos y eventos nuevos

1. En `src-tauri/src/ssh/types.rs`, añadir `RemoteTransferFileInfo { id, path, relative_path, size, kind }` (derivado de `TS`) y ampliar `RemoteFileManagerEvent` con:
   - `FileList { key, files: Vec<RemoteTransferFileInfo>, total_bytes: u64, total_files: u32 }`
   - `FileStarted { key, file_id, path, bytes }`
   - `FileProgress { key, file_id, bytes, total }`
   - `FileFinished { key, file_id, status: RemoteFinishStatus, bytes, message_key?, message_params? }`
2. Mantener `progress { key, bytes, total }` y el resto de variantes sin cambios de forma. Exportar todo a `tauri-types.d.ts` (el usuario regenera el archivo).

### Fase 2 — Pre-listado recursivo en el backend

1. En `src-tauri/src/ssh/transfer.rs`, extraer la lógica de enumeración ya presente en `download_dir_inner` a `list_remote_files(sftp, src, depth) -> Result<Vec<RemoteTransferFileInfo>, String>`, reutilizando `resolve_remote_symlink`, el filtro de enlaces rotos y `MAX_DOWNLOAD_DEPTH`. La función `download_dir_inner` pasa a usarla para no duplicar criterios.
2. Añadir `list_local_files(src) -> Result<Vec<RemoteTransferFileInfo>, String>` con `tokio::fs::read_dir`/`metadata`, omitiendo enlaces rotos y aplicando el mismo criterio de directorios vacíos y rutas relativas.
3. En `src-tauri/src/ssh/file_manager_transfer.rs`, antes de ejecutar cada ítem, llamar al listado correspondiente según `direction` y emitir `FileList` con la lista completa y el total de bytes. Si falla, emitir el error i18n y marcar el ítem como `error` sin iniciar la transferencia.

### Fase 3 — Streaming por chunks y eventos por archivo

1. En `src-tauri/src/ssh/transfer.rs`, añadir variantes con callback de bytes (p. ej. `upload_single_file_stream`/`download_single_file_stream`) que sustituyan `read_to_end` por un bucle de lectura/escritura de `SFTP_BUFFER_SIZE`, comprueben `token.is_cancelled()` entre chunks y llamen a `on_bytes(bytes_acumulados)` con throttling de ~100 ms y siempre al terminar el archivo.
2. Propagar el callback de bytes desde `upload_dir`/`download_dir` (y sus versiones stream) a cada archivo, con el `file_id` de la lista; conservar las firmas actuales como envoltorios que no emiten bytes para `transfer_commands.rs`.
3. En `file_manager_transfer.rs`, conectar el callback de bytes con el canal: `FileStarted` al empezar cada archivo, `FileProgress` en cada emisión (con el `total` del archivo) y `FileFinished` al terminarlo. Actualizar `progress` agregado tras cada archivo con la suma de bytes terminados.
4. Respetar la cancelación existente: `RemoteJobCancel`/`RemoteJobGuard`, `CANCELLED_MSG` y el mapeo de errores a `SshError`/`keys::*`; no crear comandos Rust nuevos.

### Fase 4 — Estado por archivo en el frontend

1. En `src/composables/useSshJobs.ts`, ampliar `SshJob` con `files: SshJobFile[]` (`id`, `path`, `relative_path`, `size`, `bytes`, `status`, `message?`) e inicializarlo como `[]` en `runBatch()`.
2. Añadir los casos nuevos al `switch (event.event)`:
   - `FileList`: reasignar `job.files = event.files.map(...)` con `status: 'pending'`, `bytes: 0` y `bytesTotal` del total de la lista.
   - `FileStarted`: marcar el archivo como `running`.
   - `FileProgress`: actualizar solo `bytes` del archivo; no tocar `job.bytesTransferred`.
   - `FileFinished`: marcar `success`/`error`/`cancelled`, fijar `bytes` finales y guardar el mensaje de error si lo hay.
3. Reasignar el array completo en cada actualización para garantizar reactividad; mantener el callback `onEvent` y el comportamiento actual de `progress`, `item_started` y `item_finished`.

### Fase 5 — Interfaz de la cola e i18n

1. En `src/components/remote/file-manager/TransferQueue.vue`, añadir bajo cada fila un detalle desplegable con la lista de archivos: nombre/ruta relativa, tamaño, barra de progreso por archivo, bytes transferidos y estado (pendiente/en curso/completado/error/cancelado). El resumen de la cabecera sigue mostrando los bytes agregados por ítem.
2. Ocultar o mostrar el detalle con un control ligero (por ejemplo, un botón de chevron por fila) para que las transferencias de un solo archivo no añadan ruido; la lista de una carpeta aparece completa desde el `FileList`.
3. Añadir claves i18n en `src/locales/es/components/file_manager.ts` y su espejo `en` para el encabezado del detalle, columnas, estados por archivo y el error de pre-listado. Regenerar `typed-locale.d.ts` (paso del usuario).

### Fase 6 — Documentación y cierre

1. Actualizar `docs/content/es/008.file-manager/2.transfers.md` y `3.queue.md`: pre-listado recursivo, avance por archivo en ambos sentidos, throttling, cancelación a mitad de archivo y coherencia del resumen agregado.
2. Verificar contra el código cada afirmación documental y dejar que el usuario ejecute las comprobaciones de la sección *Verificación* de `AGENTS.md`.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src-tauri/src/ssh/types.rs` | `RemoteTransferFileInfo` y nuevas variantes de `RemoteFileManagerEvent` con `TS`. |
| `src-tauri/src/ssh/transfer.rs` | Enumeración compartida local/remota y funciones de streaming por chunks con callback de bytes; envoltorios para no romper la consola. |
| `src-tauri/src/ssh/file_manager_transfer.rs` | Pre-listado por ítem, emisión de `FileList`/`FileStarted`/`FileProgress`/`FileFinished` y `progress` agregado. |
| `src-tauri/src/ssh/transfer_commands.rs` | Solo se revisa que no cambie su comportamiento; **sin cambios previstos**. |
| `src/composables/useSshJobs.ts` | `SshJob.files` y manejo de los cuatro eventos nuevos en `runBatch()`. |
| `src/components/remote/file-manager/TransferQueue.vue` | Detalle por archivo con barra, bytes y estado. |
| `src/components/remote/file-manager/FileTree.vue` | Sin cambios previstos; se reutilizan sus slots de progreso. |
| `src/locales/es/components/file_manager.ts` | Claves nuevas de detalle por archivo y error de pre-listado. |
| `src/locales/en/components/file_manager.ts` | Espejo de las claves nuevas. |
| `docs/content/es/008.file-manager/2.transfers.md` | Pre-listado y progreso por archivo en descargas y subidas. |
| `docs/content/es/008.file-manager/3.queue.md` | Detalle por archivo, estados y resumen agregado. |
| `src/types/tauri-types.d.ts` | Regenerado por el usuario con `cargo test export_bindings` (no editar a mano). |
| `typed-locale.d.ts` | Regenerado por el usuario al añadir claves i18n (no editar a mano). |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa. Aquí solo van los pasos funcionales; los comandos de la clave *Verificación* de la configuración del proyecto no se listan.

1. Descargar una carpeta con varios niveles y archivos grandes: antes de empezar, la cola muestra **todos** los archivos recursivos con sus tamaños; después cada uno muestra su barra y su estado sin saturar la interfaz.
2. Comprobar que el resumen agregado de la cola sigue contando bytes a medida que terminan los archivos y que no se duplica con el progreso individual.
3. Subir una carpeta local con subcarpetas: misma lista previa y mismo avance por archivo.
4. Cancelar una descarga y una subida a mitad de archivo: el archivo en curso queda como cancelado, no se escriben datos parciales visibles como completados y el resto no continúa.
5. Provocar un error en el pre-listado (ruta remota sin permisos o directorio local desaparecido): el ítem pasa a error con motivo i18n y no empieza la transferencia.
6. Ejecutar una transferencia desde la consola remota y comprobar que su salida y su progreso actual no han cambiado.
7. Verificar que una selección de un solo archivo sigue mostrando el flujo actual sin ruido adicional.

---

## Criterios de aceptación

- [ ] Antes de transferir, la cola lista todos los archivos de forma recursiva con tamaños, en descargas y subidas.
- [ ] Durante la transferencia se ve el avance bytes a bytes y el estado de cada archivo, con emisiones limitadas (~100 ms) y sin bloquear la UI.
- [ ] El resumen agregado por ítem sigue siendo correcto y no hay doble conteo.
- [ ] La cancelación funciona dentro de un archivo, con estado `cancelled` y sin reintentos.
- [ ] La consola remota mantiene su comportamiento actual; no hay comandos Rust nuevos.
- [ ] i18n `es`/`en`, tipos regenerados y documentación `es` actualizados.

### Desviaciones

1. El error del pre-listado reutiliza `SshError::transfer_failed` (clave i18n `tauri.ssh.errors.transfer_failed`, con el motivo como parámetro) en lugar de crear una clave nueva. No hacía falta ampliar los locales `tauri.ssh.errors.*`.
2. Se añadió limpieza del archivo parcial al cancelar dentro de un chunk: `sftp.remove_file()` en subidas y `tokio::fs::remove_file()` en descargas. El plan solo pedía detener la transferencia; la documentación advierte que el parcial se descarta.
3. `FileFinished.message_key` existe en el evento pero hoy siempre llega `None`: un fallo de archivo termina el **ítem** completo con su propia clave i18n en `ItemFinished`. El campo queda preparado para un futuro fallo por archivo.
4. `FileTransferEvent` lleva `String` en lugar de `&str` para evitar lifetimes genéricos en los hooks; el coste es una asignación corta por evento, con un máximo de ~10 eventos/s por archivo gracias al throttling.
5. El throttling de 100 ms se aplica en el adaptador de `file_manager_transfer.rs` (quien conoce el canal), no dentro de `transfer.rs`. Las funciones de transferencia solo notifican cada chunk.
6. `file_id` es un índice secuencial (`"0"`, `"1"`…) en lugar de la ruta relativa prevista en la decisión del plan. La ruta legible viaja en `path` y `relative_path`; un índice evita colisiones entre nombres con caracteres especiales y reduce el tamaño de cada evento.
7. `FileFinished` solo incluye `message_key` (no `message_params`): un fallo de archivo termina el ítem completo y se reporta por `ItemFinished`, que ya usa el mecanismo i18n de la cola.
8. `ItemStarted` se emite antes del pre-listado (el plan preveía el error antes de `item_started`). Un fallo de enumeración se reporta como `ItemFinished` con estado `error`, el camino que la cola ya entiende; no se emite `FileList`.
9. El detalle por archivo se actualiza mutando entradas del array reactivo (`file.status = …`, `file.bytes = …`) en lugar de reasignar el array en cada evento. `job.files` sí se reasigna al llegar `FileList`. `useSshJobs` no usa Pinia Colada, así que basta la reactividad profunda de `reactive()`.
10. Se añadió `FileTransferEvent::Cancelled { path, bytes }` para que una cancelación dentro de un chunk cierre también el archivo en curso con `FileFinished { status: cancelled }` y sus bytes parciales, tal como pedía el riesgo P3.

---

## Puntos abiertos

1. Ninguno: sentidos, pre-listado y alcance del progreso ya fueron decididos por el usuario.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-23 | Plan creado en estado **Planificando**. |
| 2026-11-23 | Pasado a **Ejecutando** por instrucción del usuario. |
| 2026-11-23 | Fases 1–6 implementadas: tipos y eventos, pre-listado recursivo, streaming por chunks con throttling, estado por archivo, detalle en la cola, i18n `es`/`en` y documentación `es`. |
| 2026-11-23 | Revisión estática: `file_started` deja los bytes en 0 hasta el primer progreso; la cancelación dentro de un chunk emite `FileFinished(cancelled)`; el pre-listado local usa `file_type()` para coincidir con la subida. |
| 2026-11-23 | Corregido E0277 detectado por `cargo test export_bindings`: `TransferHooks.on_file_event`, el genérico `B` de `*_with_progress` y el de `run_item` exigen `Send` porque el future de un comando Tauri debe serlo. |
| 2026-11-23 | Verificación confirmada por el usuario («Todo ok»); plan dado por terminado y archivado. Serie `file-manager-fixes` completa (2/2). |
