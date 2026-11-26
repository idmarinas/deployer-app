# Diseño: Gestor de archivos remoto de doble panel

> **Estado: Implementado** (Propuesta → Aprobado → Implementado; solo el usuario cambia el estado).
> Este documento **no es un plan** y **no modifica** `AGENTS.todo.md`.
> No se ejecuta nada hasta que el usuario apruebe el diseño y se redacten los planes correspondientes.
>
> **Revisión (2026-11-20):** propuesta inicial. Incluye el hallazgo sobre `TreeFiles`, el estado real del código SFTP y la comparativa de `russh-extra 0.1.7`.
> **Revisión (2026-11-20):** decisiones del usuario: árbol nuevo con `UTree` (sin restaurar el `TreeFiles` histórico), `russh-extra` descartado y capa SSH/SFTP sin cambios, panel local con `plugin-fs`, página nueva bajo «Consola remota» con el selector de host en la misma posición, y primera versión limitada a navegar/transferir/cancelar.
> **Revisión (2026-11-20):** comentarios `c1` y `c2`: cada ítem del árbol mostrará estado/progreso y acciones, el origen remoto se marcará como descargado tras una descarga correcta, y `plugin-fs` ya está instalado por el usuario (npm + Cargo), quedando los permisos `fs` por confirmar.
> **Revisión (2026-11-20):** respuestas a las dos dudas: la marca «descargado» se persiste en `localStorage` mediante un store de Pinia, y los permisos `fs` de `capabilities/default.json` los añade el plan de interfaz.
> **Revisión (2026-11-20):** comentario `c1`: `pinia` ya está declarado como dependencia directa (`^4.1.0`) en `package.json`; se cierra el punto abierto sobre su declaración.
> **Revisión (2026-11-20):** el usuario aprueba el diseño y pide crear los planes. Se corrige la ruta de documentación propuesta a `docs/content/es/008.file-manager/` (`007` ya corresponde a variables).
> **Revisión (2026-11-22):** los tres planes de la serie están terminados y verificados por el usuario; pasa a **Implementado** y se archiva en `.agents/.done/designs/`.

---

## 1. Tarea original (verbatim)

  > Si prepara un plan para el diseño de gestor de doble panel, ten encuenta que tenemos un componente que es para mostrar un árbol de archivos TreeFiles.
  >
  > En cuanto a esto russh-extra 0.1.7 prepara una comparativa para determinar si es conveniente usarlo, sí tiene todo lo que usamos, y así no tener que mantener código propio.

  Contexto adicional de la conversación: el gestor debe servir para **Many items / uso intensivo**, porque los componentes actuales de subida/descarga están pensados para operaciones puntuales de pocos ítems.

---

## 2. Objetivo

Sustituir el uso puntual de `RemoteFileUpload` / `RemoteFileDownload` por un gestor tipo FileZilla: **panel local + panel remoto**, navegación en árbol y una **cola de transferencias** con progreso y cancelación, capaz de manejar muchos archivos en una sola sesión de trabajo.

**Alcance de la primera versión (propuesto):**

- Navegar directorios locales y remotos con árbol, ruta actual y actualización manual.
- Ver metadatos básicos (nombre, tipo, tamaño, fecha, enlaces simbólicos).
- Seleccionar uno o varios archivos/carpetas y enviarlos en ambas direcciones mediante botones y, si la API lo permite, arrastrar y soltar.
- Cola de transferencias con estado por ítem, bytes transferidos, cancelación individual y limpieza de terminados; ese mismo estado y esas acciones se reflejan **en cada ítem del árbol de archivos**, no solo en un panel aparte.
- Tras una descarga correcta, el **archivo de origen remoto queda marcado en el árbol como «descargado»** (insignia/estado visual). La marca se **persiste en `localStorage` mediante un store de Pinia** (estado local de UI, no estado servidor) y se asocia a host + ruta + tamaño/fecha para invalidarla si el archivo remoto cambia.
- Reutilizar la infraestructura SSH/SFTP, i18n y cancelación ya existente.

**Queda fuera de la primera versión (salvo decisión contraria):** editar contenido remoto, renombrar, crear/borrar directorios o archivos remotos, permisos/chmod interactivo, sincronización de directorios y búsqueda.

Casos de uso iniciales:

- Subir un directorio local con cientos de archivos al servidor remoto sin abrir una conexión SSH por archivo.
- Descargar un directorio remoto con enlaces simbólicos al equipo local.
- Cancelar una transferencia concreta de la cola sin afectar a las demás.
- Navegar un árbol remoto grande sin cargar todos los subdirectorios de una vez.

---

## 3. Estado actual relevante (verificado en el código)

  | Elemento | Estado real |
  | --- | --- |
  | Transferencias SFTP | `src-tauri/src/ssh/transfer_commands.rs` expone `ssh_upload_file` y `ssh_download_file`. Cada llamada abre una conexión nueva (`connect_sftp` → `connect_to_host_by_id` + `ensure_connected` + `open_sftp_session`) y la cierra al terminar. No hay lote ni sesión reutilizable. |
  | Navegación remota | **No existe** ningún comando para listar un directorio remoto. `open_sftp_session` ya está disponible en `src-tauri/src/ssh/helpers.rs`; la lógica de `readdir`/`metadata` hay que añadirla. |
  | Cancelación | `src-tauri/src/ssh/cancel.rs` registra tokens (`RemoteJobCancel::register`) y cancela por `job_id` —o el último— desde `ssh_cancel_remote_job`. Solo cancela **un** job por llamada; la cascada se resuelve hoy en el frontend. |
  | Motor de jobs | `src/composables/useSshJobs.ts` es genérico y multi-job: `reactive(Map<string, SshJob>)`, `dependsOn`, `cancel(key)` en cascada, `cancelAll()`, `clear(key?)`, interpolación inyectable y `appendOutput()`. `useRemoteCommand.ts` es solo la fachada de consola. |
  | UI de consola | `src/pages/dashboard/console.vue` tiene tres pestañas (`UTabs`) y un `useRemoteCommand` con claves fijas (`console-command`, `console-upload`, `console-download`); comparte `RemoteOutput.vue`. No hay página de gestor de archivos. |
  | `TreeFiles` | **No existe en el código activo.** `git log --all -- src/components/form/files/TreeFiles.vue` muestra `dafe73e`, `e71f954`, `f2819fb` y su eliminación en `f10bb71` («código y archivos que no forman parte de la versión 0.1.0»). El componente histórico era un **editor en memoria** de `ManagedFile[]` (contenido, `FileContentEditor`, `TreeFilePicker`), no un navegador de sistema de archivos; sus dependencias (`src/lib/files.ts`, `TreeFilesViewer.vue`, `TreeFilePicker.vue`, `FileContentEditor.vue`) también fueron eliminadas. Hoy el único patrón de árbol vivo es `src/components/overlay/forms/ReviewFilesDialog.vue`, que construye `TreeItem[]` y usa `UTree` de `@nuxt/ui`. |
  | Panel local | `@tauri-apps/plugin-fs` **ya instalado por el usuario**: `^2.0` en `package.json` y `tauri-plugin-fs = "2"` en `src-tauri/Cargo.toml`. `src-tauri/capabilities/default.json` todavía no concede permisos `fs` (solo `dialog:default`, `store:default` y stronghold); **los añadirá el plan de interfaz**. `@tauri-apps/plugin-dialog` ya está disponible para elegir rutas. |
  | Dependencias SSH | `src-tauri/Cargo.toml`: `russh 0.65.1`, `russh-sftp 2.3.0`, `base64 0.23.1`, `tokio`, `tokio-util`, `ts-rs 12.0.1`. |
  | Contrato IPC | `src-tauri/src/ssh/types.rs` define inputs/resultados/eventos con `#[derive(TS)]` y `CommandResponse<T>`; los eventos viajan por `tauri::ipc::Channel<RemoteConsoleEvent>` (`started`, `output_chunk`, `finished`, `error`). Las claves de error son i18n (`tauri.ssh.*`, `keys::*`) y el backend nunca devuelve texto en español. |
  | Cifrado y credenciales | `connect_to_host_by_id` obtiene la contraseña/clave del host desde la BD y el vault Stronghold; `variables` y campos sensibles cifra/descifra el frontend con `src/drizzle/lib/stronghold.ts`. Ninguna librería SSH sustituye esta capa. |
  | i18n / docs | Fuente en `src/locales/es/`; espejo en `src/locales/en/`. Documentación de usuario en `docs/content/es/` (p. ej. `006.console/2.files.md`); las traducciones se hacen solo cuando el usuario lo confirma. |

  **Consecuencia:** el gestor nuevo no puede reutilizar los comandos puntuales tal cual (abrirían una conexión por archivo), pero sí puede reutilizar toda la infraestructura de conexión, cifrado, eventos, cancelación y jobs. El único componente «TreeFiles» recuperable es la **idea** de árbol, no el archivo.

---

## 4. Decisiones acordadas

| Decisión | Elección |
| --- | --- |
| UI del gestor | La construye el frontend en Vue/Tauri (doble panel + cola). No existe librería que proporcione una UI tipo FileZilla; Rust aporta solo el protocolo SFTP. |
| Capa SSH/SFTP | Mantener `russh` + `russh-sftp` **tal y como está**. `russh-extra 0.1.7` queda descartado por decisión del usuario (ver §6.1). |
| Rutas remotas | Siempre con `/`, usando `join_remote_path()`; nunca `Path::join` con separadores de Windows. |
| Enlaces simbólicos | Mantener la política ya corregida en `src-tauri/src/ssh/transfer.rs`: `metadata()` (STAT) para autodetectar, `symlink_metadata()` + `canonicalize()` para enlaces, omisión de enlaces rotos con aviso y `MAX_DOWNLOAD_DEPTH = 64`. |
| Reactividad de jobs | Los jobs se crean con `reactive<SshJob>({...})` antes de insertarlos en el `Map`; de lo contrario el estado «ejecutando» queda pegado. |
| Cancelación | `useSshJobs` sigue siendo genérico; `cancel(key)` cancela el job indicado y sus dependientes en cascada, sin clave conserva la compatibilidad y nunca cancela todos por defecto. |
| Idioma y documentación | Escritura en español; i18n `es` como fuente y `en` como espejo; documentación de usuario solo en `docs/content/es/` hasta confirmación. |
| Árbol del gestor | Componente **nuevo** inspirado en `TreeFiles`, construido con `TreeItem` + `UTree` como `ReviewFilesDialog.vue`. No se restaura el archivo histórico. |
| Panel local | `@tauri-apps/plugin-fs` para listar/leer, junto con `@tauri-apps/plugin-dialog` para elegir la raíz. El usuario ya instaló las dependencias (npm y Cargo); el plan debe verificarlas y no duplicarlas. **El plan de interfaz añade los permisos `fs`** en `capabilities/default.json`. |
| Marca «descargado» | Se persiste en `localStorage` con un store de Pinia (no con `plugin-store`); Pinia ya está declarado en `package.json` (`^4.1.0`) e inicializado en `src/main.ts`. Es estado local de UI, por lo que no se usa `@pinia/colada`. |
| Ubicación | Página nueva `dashboard/file-manager` en `src/composables/useNavigationMenu.ts`, **justo debajo de «Consola remota»**, con `SelectHost` en la misma posición de la barra de herramientas que en `console.vue`. |
| Alcance de la primera versión | Solo navegar, transferir y cancelar; sin crear/renombrar/borrar ni editar contenido remoto. |
| Verificación | La ejecuta el usuario: `bun run i18n:types`, `bunx vue-tsc --noEmit`, `bun run build`; `cargo check` si se toca Rust. |

**Alternativas descartadas para el transporte SFTP** (evaluadas previamente): `openssh-sftp-client` (alto nivel, pero atado al ecosistema `openssh`), `opendal-service-sftp` (depende de `openssh` y docs.rs indica «only works on unix»), `ssh2` (síncrono), `bssh-russh-sftp` (fork de `russh-sftp 2.4.0` con I/O pipelined, pero el proyecto `bssh` no soporta Windows como cliente). Ninguna elimina la capa de aplicación de DeployerApp.

---

## 5. Conceptos

  - **Panel local**: vista del sistema de archivos de la máquina donde corre Tauri. Raíz elegible con `plugin-dialog`; listado con `plugin-fs` (propuesta).
  - **Panel remoto**: vista de un host de la BD, navegada vía SFTP. Las rutas que se envían al backend usan `/`.
  - **Árbol**: representación jerárquica de un directorio. Se carga **por nivel**, al expandir un nodo, para no materializar miles de entradas de golpe.
  - **Ítem de transferencia**: par (origen, destino) con dirección `upload`/`download`, claves de cliente para correlacionar eventos y estado propio.
  - **Cola**: conjunto de ítems con estado (`pending`, `running`, `success`, `error`, `cancelled`, `skipped`), progreso en bytes y cancelación selectiva.
  - **Job**: unidad de trabajo ya existente en `useSshJobs`. El lote nuevo debe conservar su forma (`key`, `jobId`, `status`, `output`, `result`, `finishStatus`) para no romper la fachada de consola.

---

## 6. Diseño técnico

### 6.1 Transporte SFTP: decisión cerrada

La comparativa solicitada de `russh-extra 0.1.7` se entregó en la propuesta inicial: cubre las primitivas SFTP (`open`, `read`, `write`, `metadata`, `opendir`, `readdir`, `rename`, `canonicalize`, `symlink`…), pero **no cubre** la integración de DeployerApp (`Channel` de Tauri, `CommandResponse`, `ts-rs`, Stronghold, consulta de hosts, reintentos, `SshError`/i18n, cancelación multi-job, progreso, redacción/interpolación ni la cola), y declara `russh ^0.60.3` frente al `0.65.1` actual con MSRV 1.95.

**Por decisión del usuario se olvida esta vía y se deja la capa SSH/SFTP tal y como está**: `russh 0.65.1` + `russh-sftp 2.3.0`, con el código propio de `src-tauri/src/ssh/`. No se añade la dependencia ni se planea migración.

### 6.2 Backend: listado remoto

Nuevo comando en `src-tauri/src/ssh/` (módulo único del dominio, ver `AGENTS.backend.md` §5), registrado en `mod.rs` y reexportado desde `lib.rs`:

- `ssh_list_remote_dir(input: RemoteListInput) -> Result<CommandResponse<RemoteListing>, String>`
- `RemoteListInput`: `host_id`, `path`, `ssh_reconnect_attempts`, opcionalmente `max_entries`.
- `RemoteListing`: `path`, `entries: Vec<RemoteEntry>`, `truncated: bool`.
- `RemoteEntry`: `name`, `path` (siempre con `/`), `kind` (`file` | `dir` | `symlink` | `other`), `size`, `modified`, `permissions`, `target` (para symlinks).
- Implementación: reutilizar `connect_to_host_by_id` + `ensure_connected` + `open_sftp_session`; `opendir`/`readdir` y `metadata`/`symlink_metadata` por entrada; ordenar por tipo y nombre; sin recursión automática.
- Todos los tipos con `#[derive(TS)]` en `ssh/types.rs` y claves de error con `SshError`/`keys::*`. Sin migraciones SQL: no se persiste nada en la BD (las marcas «descargado» viven en `localStorage`, lado frontend).

### 6.3 Backend: transferencia en lote

Para Many items, un `invoke` por archivo abriría una conexión SSH por archivo. Se propone un comando de lote:

- `ssh_file_manager_transfer(input: RemoteTransferBatchInput, channel: Channel<RemoteFileManagerEvent>, state: State<RemoteJobCancel>) -> Result<CommandResponse<RemoteBatchResult>, String>`
- El input incluye `host_id`, `ssh_reconnect_attempts` y la lista de ítems con la **clave de cliente** de cada uno, dirección, rutas y opciones (`overwrite`, `chmod`, `recursive`).
- Una sola conexión SSH/SFTP para todo el lote; los archivos se procesan en orden, con un límite de concurrencia configurable (propuesta inicial: 2-4).
- Eventos nuevos con `ts-rs`: `batch_started`, `item_started { key, job_id }`, `progress { key, bytes, total }`, `item_finished { key, status, result }`, `batch_finished`. Se mantiene `RemoteConsoleEvent` intacto para la consola actual.
- Cancelación: `RemoteJobCancel::register()` por ítem; `ssh_cancel_remote_job(job_id)` sigue siendo el comando único, y el evento `item_started` entrega el `job_id` para que el frontend sepa qué job cancelar. La cancelación del lote completo se resuelve en el frontend con las claves de los ítems (misma semántica que `useSshJobs.cancel(key)`).
- Se reutilizan `upload_dir`, `download_dir`, `upload_single_file`, `download_single_file` y la política de symlinks de `transfer.rs`; no se duplica la lógica de transferencia.
- Riesgo técnico a resolver en el plan de backend: concurrencia sobre un único `SftpSession` (según la API real de `russh-sftp 2.3.0`, puede requerir clones o ejecución secuencial). Si no es segura, el lote se ejecuta secuencialmente; la corrección sigue siendo evitar una conexión por archivo.

### 6.4 Frontend

- Página nueva `src/pages/dashboard/file-manager.vue` (ruta generada por `unplugin-vue-router`), añadida en `src/composables/useNavigationMenu.ts` **inmediatamente debajo de «Consola remota»** (`navigationMenuFooter`). El selector de host (`SelectHost`) va en la misma posición de la barra de herramientas que en `console.vue`: dentro de `UDashboardToolbar`, bajo el `UDashboardNavbar`. La consola actual se deja intacta; no se añade una cuarta pestaña.
- Componentes bajo `src/components/remote/file-manager/`: `FileManagerPanel.vue` (local/remoto), `FileTree.vue` y `TransferQueue.vue`.
- `FileTree.vue`: adaptación de la **idea** de `TreeFiles` usando `TreeItem` + `UTree` como en `ReviewFilesDialog.vue`; carga incremental por nivel, iconos (`ICONS`) y slots para acciones. No se restaura el `TreeFiles` histórico tal cual: era un editor de `ManagedFile[]` en memoria y sus dependencias ya no existen.
- Cada nodo del árbol muestra, cuando tiene una transferencia asociada, el estado (`pending`/`running`/`success`/`error`/`cancelled`), los bytes transferidos/total y las acciones disponibles en la cola (cancelar y limpiar terminados; reintentar queda fuera de la primera versión). El panel de cola mantiene la vista agregada y el detalle.
- Marca «descargado»: al recibir `item_finished` con éxito de una transferencia `download`, se marca el nodo del **origen remoto** con una insignia/estado visual. Un store de Pinia guarda las marcas en `localStorage` con clave `host_id + ruta + tamaño + fecha`; al navegar se compara con el `RemoteEntry` y la marca obsoleta se descarta. `pinia` ya está declarado en `package.json` (`^4.1.0`) e inicializado en `src/main.ts`, así que no hay que añadir dependencias nuevas para el store.
- Panel local: `@tauri-apps/plugin-fs` (`readDir`, `stat`) + `@tauri-apps/plugin-dialog` para elegir la raíz. Las dependencias ya están instaladas por el usuario; el plan de UI verifica `package.json` y `src-tauri/Cargo.toml` y **añade los permisos `fs`** en `src-tauri/capabilities/default.json`.
- Panel remoto: consume `ssh_list_remote_dir`; al expandir un directorio se pide solo ese nivel; la ruta actual se muestra como breadcrumb.
- Selección y acciones: botones `→` / `←` como mecanismo principal; arrastrar y soltar entre paneles como mejora. En Tauri, Sortable.js exige `forceFallback: true` y contenedores condicionales `watchElement: true` (gotcha de `AGENTS.md`).
- Cola: `TransferQueue.vue` muestra por ítem dirección, origen, destino, estado, bytes/total y botón de cancelación; `clear` solo quita terminados.
- `useSshJobs.ts`: añadir un adaptador de lote que permita a un único `invoke` alimentar varios jobs por clave, conservando la API actual (`execute`/`upload`/`download`/`cancel`) y sin acoplarlo al gestor. `useRemoteCommand.ts` no se modifica.
- Drag & drop, selección múltiple y virtualización se implementan solo si la API de `UTree` y el rendimiento real lo confirman; en caso contrario se usa una lista plana con casillas de selección dentro de cada directorio.

### 6.5 Seguridad, i18n y documentación

- El backend sigue devolviendo claves i18n y `message_params`; el frontend lee `result.message_params.reason` o `t(result.message_key, result.message_params)` como en la consola corregida.
- No se persisten rutas ni credenciales nuevas en la BD; la configuración del gestor (raíz local, última ruta remota) puede guardarse con `plugin-store` solo si el usuario lo aprueba.
- Nuevas claves en `src/locales/es/pages/file-manager.ts` y `src/locales/es/components/file-manager.ts`, espejo en `en`; se regenera `typed-locale.d.ts` con `bun run i18n:types`.
- Documentación de usuario nueva en `docs/content/es/` (`008.file-manager/`; `007` ya es variables), sin traducir hasta confirmación.
- Actualizar `AGENTS.frontend.md` (patrones del gestor y UTree), `AGENTS.backend.md` (comandos de listado/lote) y `AGENTS.docs.md` si cambia la estructura de documentación.

---

## 7. Bloques de implementación

  > Cada bloque será un plan independiente (`.agents/plans/`) cuando el diseño esté **Aprobado**. Serie propuesta `remote-file-manager`.

  1. **Backend de navegación SFTP**: `ssh_list_remote_dir`, tipos `ts-rs`, registro en `mod.rs`/`lib.rs`, política de rutas y symlinks, errores i18n. Sin cambios en BD.
  2. **Interfaz de doble panel**: página nueva en el menú bajo «Consola remota» con `SelectHost` como en consola, permisos `fs` en `capabilities/default.json`, panel local con `plugin-fs`/`dialog`, panel remoto con `UTree` adaptado de la idea de `TreeFiles`, navegación, selección y acciones de transferencia; preparación de los slots del árbol para estado/progreso/acciones por nodo (sin cola todavía).
  3. **Cola de transferencias y cierre**: comando de lote, eventos y cancelación, adaptador en `useSshJobs`, estado/progreso/acciones por nodo del árbol y en `TransferQueue.vue`, store de Pinia + `localStorage` para la marca «descargado» del origen remoto, i18n `es`/`en`, documentación y actualización de `AGENTS*.md`.

Dependencias: el bloque 2 consume el comando del bloque 1; el bloque 3 consume ambos. El bloque 1 se puede ejecutar y verificar por separado.

---

## 8. Verificación prevista

> Orientativa. La verificación la hace el usuario.

- Listar un directorio remoto con cientos de entradas y expandir varios niveles sin cargar todo el árbol de golpe.
- Navegar un directorio local con muchos archivos y verificar tamaños/fechas y rutas con espacios.
- Enviar una carpeta en ambas direcciones con una sola conexión SSH (comprobar en el output que no se abre una sesión por archivo).
- Ver progreso por ítem, cancelar uno sin afectar a los demás y limpiar terminados, tanto en el árbol como en la cola.
- Comprobar que, tras descargar un archivo, su nodo remoto aparece marcado como «descargado», que la marca sobrevive a una recarga de la página y que se retira si el archivo remoto cambia.
- Descargar `/home/debian/backup/current` (caso con symlinks) y comprobar enlaces rotos, profundidad y destino final; reconstruir Tauri antes de repetir la prueba.
- Confirmar que los mensajes de error siguen mostrando `reason` y no quedan estados «ejecutando» pegados.
- Comandos sugeridos al usuario al terminar: `bun run i18n:types`, `bunx vue-tsc --noEmit`, `bun run build` y `cargo check`.

---

## 9. Puntos abiertos / futuras fases

  **Decisiones ya cerradas por el usuario** (no reaperturadas en los planes): árbol nuevo con `UTree`, capa SSH/SFTP sin cambios (`russh-extra` descartado), panel local con `plugin-fs` (permisos `fs` los añade el plan de UI), marca «descargado» persistida en `localStorage` con Pinia, página nueva bajo «Consola remota» y primera versión solo de navegación/transferencia/cancelación.

  1. **Modelo de sesión**: ¿lote con una sola conexión (recomendado) o pool de sesiones SFTP por host? El pool mejora la navegación, pero añade gestión de ciclo de vida y caducidad.
  2. **Concurrencia y límites**: número de transferencias simultáneas y tamaño máximo de listado por directorio.
  3. **Persistencia de preferencias**: raíz local y última ruta remota con `plugin-store` (fuera del alcance propuesto).
  4. Funcionalidades futuras: búsqueda/filtro, sincronización de carpetas, editor de texto remoto, comprobación de checksums, reintentos por ítem y operaciones de escritura remota (crear/renombrar/borrar).
