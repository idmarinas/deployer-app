# Diseño: Gestor de archivos remoto — v2 (persistencia, concurrencia y reintento)

> **Estado: Implementado** (Propuesta → Aprobado → Implementado; solo el usuario cambia el estado).
> **Diseño de origen:** `.agents/.done/designs/AGENTS.remote-file-manager.DESIGN.md`
> **Última revisión:** 2026-11-24 — el usuario da por completado el diseño y su plan; se archiva como referencia.
> **Revisión (2026-11-23):** se elimina `localStorage` (todo en SQLite), se corrige el flujo de migraciones (entidad Drizzle + generación manual), se detalla la UI del `TreeFile` con iconos y sin checkbox, se trasladan ideas a `AGENTS.futuro.md` y se descartan las operaciones de escritura remota.
> **Revisión 2 (2026-11-23):** se añade el directorio base remoto a `deployer_hosts` como ruta por defecto, la selección pasa al icono (con carga recursiva de directorios) y se redefine la vista de transferencias en bloques siempre expandidos con la información a la izquierda del nombre.
> **Revisión 3 (2026-11-23):** revisión de coherencia con el código: se cablea `interrupted` en la cola, se añade `createdAt` para ordenar, se aclara la migración única de marcas, se ajusta el contrato de carga recursiva y la generación de tipos, y se corrige la afirmación sobre el envío de rutas.
> Este documento **no es un plan** y **no modifica** `AGENTS.todo.md`. No se ejecuta nada hasta la aprobación y la creación de los planes.

---

## 1. Tarea original (verbatim)

  > Vamos a mejorar este diseño `F:\Tools\deployer-app\.agents\.done\designs\AGENTS.remote-file-manager.DESIGN.md`
  >
  > Transferencias concurrentes, Preferencias persistentes, Persistencia de las listas y de las transferencias con localstorage atraves de Pinia. Para que persista incluso aunque recargues la app o la cierres.
  >
  > Es posible usar la BD SQLite en lugar de localStorage?

---

## 2. Objetivo y alcance

Actualizar el diseño del gestor de doble panel para reflejar lo que realmente hay en el código y ampliarlo con **persistencia completa**, **concurrencia configurable** y **reintento manual**. Todo el estado persistente pasa a **SQLite** a través de stores de Pinia; no se usa `localStorage` como almacén. La única excepción es una **lectura única y desechable** al arrancar para migrar las marcas «descargado» que hoy viven en `localStorage` (§6.3): después de migrar, esas claves se borran y el código no vuelve a leer ni a escribir `localStorage`.

**Incluido en esta versión:**

- Documentar el estado real del v1, incluidos los dos planes de correcciones cerrados el 2026-11-23 (scope local con `recursive: true`, botón de expansión sin marcar casillas, pre-listado recursivo y progreso por archivo).
- Persistir en SQLite, detrás de stores de Pinia: preferencias, ruta actual de ambos paneles, listados ya cargados, niveles hijos, nodos expandidos, selección y cola de transferencias.
- Añadir a `deployer_hosts` un **directorio base remoto** que sirva de ruta por defecto al abrir el panel remoto de ese host; es distinto del directorio de trabajo de los comandos.
- Seleccionar archivos y directorios haciendo clic en su **icono**, con cambio de icono al seleccionar; seleccionar un directorio implica cargar y seleccionar todo su contenido.
- Recuperar ese estado al recargar o cerrar y reabrir la app, revalidando los listados contra disco/SFTP.
- Mostrar la cola de transferencias en **bloques** del más reciente al más antiguo, con el detalle de archivos siempre expandido y la información a la izquierda del nombre.
- Convertir en `interrupted` (interrumpida) los jobs que estaban `pending`/`running` al cerrar, con reintento manual por ítem.
- Concurrencia de transferencias configurable (1-N, valor por defecto **2**) sobre un lote por host.
- Conservar la cola **sin límite de tiempo ni de número de ítems**, hasta que el usuario pulse «Limpiar terminados».
- Mantener intacta la consola remota (`RemoteConsoleEvent`, `useRemoteCommand`) y la capa de cifrado/vault.

**Fuera de alcance:** el usuario descarta expresamente las operaciones de escritura remota (crear/renombrar/borrar) y el editor de contenido remoto: no es el objetivo del gestor. El resto de exclusiones del diseño de origen siguen vigentes salvo decisión expresa; las ideas aplazadas se registran en `.agents/AGENTS.futuro.md` §4b.

Casos de uso iniciales:

- Cerrar la app con una descarga en curso, reabrirla y ver el ítem como interrumpido, con sus archivos y progreso, y poder relanzarlo.
- Reabrir el gestor con el árbol remoto tal como se dejó: rutas, niveles expandidos y selección, revalidados contra el servidor.
- Ajustar el número de transferencias simultáneas desde las preferencias y comprobar que el lote no supera ese límite.
- Recargar la app sin perder preferencias ni historial de transferencias, aunque haya cientos de ítems.

---

## 3. Conceptos

  - **Store de persistencia**: capa Pinia que expone preferencias, listados y cola como estado reactivo y delega el guardado en SQLite.
  - **Adaptador SQLite**: implementación basada en Drizzle en modo proxy (`db` → `query_raw`). Rust solo ejecuta SQL; no hay comandos Rust nuevos para este estado. El gestor solo se usa dentro de `/dashboard`, al que se accede después de `check_database_exists` y de que las migraciones estén al día, así que no hace falta un almacenamiento puente.
  - **Instantánea de listado**: entradas, niveles hijos (`childrenByKey`), niveles cargados, nodos expandidos, ruta actual y selección de un panel, identificada por `origin + host/ruta`.
  - **Revalidación (stale-while-revalidate)**: mostrar la instantánea guardada de inmediato y sustituir cada nivel por el listado real al consultar disco/SFTP; una entrada cambiada invalida su marca «descargado».
  - **Job interrumpido (`interrupted`)**: estado terminal asignado al restaurar un job que estaba `pending`/`running`; sus tokens de cancelación ya no existen en el backend.
  - **Reintento manual**: crear un nuevo job con nueva `key` a partir de los metadatos persistidos del job interrumpido, enlazado con `retryOf`. El job anterior se conserva como historial.
  - **Límite de concurrencia**: número máximo de ítems transferidos a la vez dentro de un lote; se envía al backend como `max_concurrency` y se lee de las preferencias.

---

## 4. Decisiones acordadas

| Fecha | Decisión | Elección y autor |
| --- | --- | --- |
| 2026-11-23 | Naturaleza del v2 | No editar el diseño archivado: crear un v2 con origen en `.agents/.done/designs/`; usuario. |
| 2026-11-23 | Contenido del v2 | Actualizar el estado real **y** añadir funcionalidad; usuario. |
| 2026-11-23 | Persistencia | SQLite para preferencias, listados y cola; sin `localStorage` ni almacenamiento puente (salvo lectura única de migración); usuario. |
| 2026-11-23 | Migraciones | Se añade la entidad Drizzle y la generación del SQL se ejecuta manualmente; usuario. |
| 2026-11-23 | Árbol de archivos | Reutilizar la utilidad de iconos por extensión, sin checkbox en el `TreeFile`; usuario. |
| 2026-11-23 | Ruta remota por defecto | Campo nuevo en `deployer_hosts` con el directorio base del host, distinto del directorio de trabajo; usuario. |
| 2026-11-23 | Selección en el árbol | Se hace clic en el icono (que cambia al seleccionar); al seleccionar un directorio se carga y se selecciona todo su contenido; usuario. |
| 2026-11-23 | Vista de transferencias | Bloques ordenados del más reciente al más antiguo, `TreeFile` siempre expandido y metadata a la izquierda del nombre; usuario. |
| 2026-11-23 | Operaciones de escritura remota | Descartadas (crear/renombrar/borrar y editor de contenido): no son objetivo del gestor; usuario. |
| 2026-11-23 | Estado de la cola al reabrir | Jobs activos pasan a `interrupted` y se ofrece reintento manual por ítem; usuario. |
| 2026-11-23 | Retención de la cola | Sin límite: conservar hasta «Limpiar terminados»; usuario. |
| 2026-11-23 | Concurrencia | Configurable, valor por defecto 2; usuario. |
| 2026-11-23 | Listados persistentes | Rutas, selección, entradas, niveles cargados y nodos expandidos; usuario. |
| 2026-11-23 | Planes | Crear los planes derivados después de aprobar el diseño; usuario. |
| 2026-11-23 | Capa SSH/SFTP | Heredada del v1: `russh 0.65.1` + `russh-sftp 2.3.0`, sin `russh-extra`; no se reabre. |
| 2026-11-23 | Estado sensible | No persistir credenciales, contenido de archivos ni secretos del vault; solo metadatos y rutas. |

**Alternativas descartadas:** `localStorage` y `tauri-plugin-store` (todo se unifica en SQLite/Pinia), reactivar automáticamente las transferencias al abrir (el usuario prefiere reintento manual), operaciones de escritura remota y editor de contenido, `russh-extra 0.1.7` y las demás librerías SFTP evaluadas en el v1.

---

## 5. Estado actual verificado en el código

  | Elemento | Estado real y referencias |
  | --- | --- |
  | Página | `src/pages/dashboard/file-manager.vue`: `UDashboardNavbar`, `UTabs` (Archivos/Transferencias), dos `FileManagerPanel`, botones `→`/`←`, `TransferQueue`. `defineOptions({ name: 'FileManagerPage' })` para el `<KeepAlive>` del layout. |
  | Persistencia hoy | `useStorage` directo en la página para pestaña, host, ruta local y ruta remota; selección en `ref` (no persiste). `src/stores/remoteFileMarks.ts` guarda las marcas «descargado» en `localStorage`. No hay store para listados ni para la cola. |
  | Hosts | `src/drizzle/entities/hosts.ts` (`deployer_hosts`) no tiene ruta base: solo conexión, autenticación, huella y metadatos. El formulario es `src/components/form/HostForm.vue` con validación en `src/composables/validation/useHostValidation.ts` e i18n en `src/locales/{es,en}/form/hosts.ts`. `working_dir` existe solo en la consola/comandos, no en el host. |
  | Paneles | `src/components/pages/file-manager/FileManagerPanel.vue`: `entries`, `childrenByKey`, `loadedKeys`, `loadingKeys` en `ref`; carga **un nivel** por `ssh_list_remote_dir` o `readDir`+`stat`; `open({ directory: true, recursive: true })` tras la corrección del scope; breadcrumb y error con ruta/motivo. |
  | Árbol | `src/components/pages/file-manager/FileTree.vue`: `TreeItem[]` + `UTree multiple`, `UCheckbox` en `#item-leading`, botón de expansión de un nivel en `#item-trailing`, slots `node-status`/`node-progress`/`node-actions`. |
  | Cola | `src/composables/useSshJobs.ts`: `reactive(Map<string, SshJob>)`, `runBatch()`, eventos `batch_started`/`item_started`/`file_list`/`file_started`/`file_progress`/`file_finished`/`progress`/`item_finished`/`batch_finished`, `SshJobFile[]` con bytes y estado por archivo, cancelación selectiva/en cascada. Todo en memoria. |
  | Vista de transferencias | `src/components/pages/file-manager/TransferQueue.vue`: lista de jobs en el orden de la `Map`, botón para contraer/expandir el detalle de archivos (`expandedKeys`) y metadata a la derecha del nombre; no usa `FileTree`. |
  | Fachada | `src/composables/useRemoteFileManager.ts`: instancia compartida por sesión de app, agrupación por host, marcas de descarga, `nextTransferKey()`. Sin persistencia. |
  | Backend | `src-tauri/src/ssh/file_manager_transfer.rs`: una conexión SFTP por lote, **ejecución secuencial**, tokens registrados al inicio, pre-listado recursivo (`list_local_files`/`list_remote_files`) y eventos por archivo con `FILE_PROGRESS_THROTTLE_MS = 100`. `MAX_DOWNLOAD_DEPTH = 32`, `SFTP_BUFFER_SIZE = 256 * 1024` en `ssh/transfer.rs`. |
  | BD | Bootstrap en `src/main.ts`: `check_database_exists` → setup o dashboard; `has_migrations_pending` → migraciones. Migraciones planas en `src-tauri/migrations/`; fuente Drizzle en `migrations/` (según `drizzle.config.ts`); acceso desde frontend con `db` (`query_raw`). La app no puede usar Drizzle antes de que exista la BD. |
  | Permisos | `src-tauri/capabilities/default.json`: `fs:allow-read-dir` y `fs:allow-stat`; sin permisos de escritura local desde el frontend. |
  | i18n y docs | `src/locales/{es,en}/pages/file_manager.ts` y `components/file_manager.ts`; documentación en `docs/content/es/008.file-manager/`; `AGENTS.frontend.md` §6 y `AGENTS.backend.md` §5 ya describen el gestor implementado. |

  **Consecuencia:** la persistencia nueva no necesita comandos Rust ni cifrado, pero sí una migración Drizzle (tres tablas nuevas y una columna en `deployer_hosts`) y un adaptador en el frontend. La concurrencia sí exige cambiar `ssh_file_manager_transfer`; debe preservar los eventos actuales y la cancelación por `job_id`.

---

## 6. Diseño técnico

### 6.1 Esquema y adaptador de persistencia

Tres tablas nuevas y una columna nueva en `deployer_hosts`. Se usa el helper `timestamps` de `src/drizzle/lib/columns.helpers.ts` (`created_at`/`updated_at`/`deleted_at`, sin triggers), aunque `deleted_at` no se usa como filtro: el historial se borra físicamente con «Limpiar terminados».

- `deployer_file_manager_preferences`: `key TEXT PRIMARY KEY`, `value TEXT` (JSON), `timestamps`. Un registro por preferencia; añadir claves no requiere migración.
- `deployer_file_manager_listings`: `scope_key TEXT PRIMARY KEY` (`local:<ruta normalizada>` o `remote:<host_id>:<ruta>`), `origin`, `host_id`, `path`, `snapshot TEXT` (JSON con `entries`, `childrenByKey`, `loadedKeys`, `expandedKeys`, `selection`), `truncated`, `timestamps`.
- `deployer_file_manager_transfers`: `job_key TEXT PRIMARY KEY`, `host_id`, `direction`, `source_path`, `target_path`, `label`, `status`, `retry_of`, `snapshot TEXT` (JSON con `jobId`, `files`, bytes, resultado, mensajes y metadatos de la solicitud), `timestamps`. Índice por `created_at` para ordenar la cola.
- `deployer_hosts.default_remote_path TEXT` (nullable, por defecto `NULL`): directorio base que se usa como ruta inicial del panel remoto al seleccionar ese host. **No es** el `working_dir` de la consola ni de los comandos; se documenta y etiqueta como «directorio base (file manager)» para evitar confusiones. Se añade en `src/drizzle/entities/hosts.ts`, `HostForm.vue`, `useHostValidation.ts` e i18n (`form.hosts`, `entity.host`, `pages.hosts`).

Reglas de esquema: se añade la entidad en `src/drizzle/entities/` y se ejecuta **manualmente** `bun run drizzle:generate` (drizzle-kit genera en `migrations/` y el script aplana el SQL a `src-tauri/migrations/`), además de `bun run tables:generate`. No se editan a mano `src/drizzle/schema.ts`, `relations.ts` ni `src-tauri/src/tables.rs`. No se crean comandos Rust: lecturas y escrituras van por `db` en el frontend.

Un único módulo `src/stores/fileManagerPersistence.ts` expone el acceso a SQLite mediante Drizzle. Los stores de dominio (`useFileManagerPreferences`, `useFileManagerListings`, `useFileManagerQueue`) solo hablan con ese módulo; no hay adaptador alternativo ni doble escritura. La única lectura de `localStorage` en todo el diseño es la migración puntual de marcas y de la clave de ruta remota descrita en §6.2 y §6.3, tras la cual esas claves se borran.

### 6.2 Preferencias y listados

- Preferencias persistidas: `max_concurrency` (2 por defecto, 1-N), raíz local, última ruta remota **por host**, pestaña activa, host seleccionado y opciones de transferencia (`overwrite`, `chmod`, `recursive`). Sustituyen las claves `useStorage` actuales de `file-manager.vue` sin cambiar el comportamiento visible. La clave actual de ruta remota es **única** (no por host): en la primera ejecución se lee una sola vez, se normaliza y se graba como preferencia del host seleccionado en ese momento; si no hay host seleccionado se descarta y se aplica la regla de `default_remote_path`. Después se borra la clave `useStorage` y no se vuelve a usar.
- Al elegir un host sin ruta remota guardada se usa `deployer_hosts.default_remote_path` (si está vacío, `/`); la ruta navegada después se guarda como preferencia por host y pasa a ser la inicial en la siguiente sesión. Cambiar el directorio base del host no sobrescribe la ruta ya guardada: solo afecta a hosts sin preferencia previa o cuando el usuario pulsa **«Restablecer ruta»** en el panel, que borra la preferencia de ese host, vuelve a `default_remote_path` (o `/`) y recarga el listado. El botón se incluye explícitamente en el bloque 1.
- `default_remote_path` se valida en `useHostValidation.ts` como **ruta absoluta**: en hosts Linux/Unix empieza por `/` y en Windows por letra de unidad + `\` o por `\\` (UNC); se rechazan rutas relativas, `..` sin resolver y valores con salto de línea. El campo es opcional: `NULL`/cadena vacía significa «usar `/`». La etiqueta y la ayuda del formulario lo identifican como «directorio base del gestor de archivos», no como directorio de trabajo de comandos.
- Cambiar de host **no descarta nada**: cada instantánea se clave con `origin + host_id + ruta`, así que al volver al host se reutiliza y se revalida. Solo se purgan los listados `remote:<host_id>:*` de un host borrado o deshabilitado; los listados `local:*` nunca se descartan por cambiar de host.
- `FileManagerPanel.vue` hidrata desde el store y aplica **stale-while-revalidate**: pinta la instantánea guardada y lanza `refresh()`; cada nivel se revalida al navegar/expandir. Si `truncated` es `true`, el nivel se marca como parcial en la UI.
- La selección se restaura, pero las entradas que ya no existen en el listado revalidado se quitan de la selección. El botón de expansión sigue sin alterar la selección (corrección del 2026-11-23); en el v2 no hay casilla: el control es el icono (§6.2.1).
- No se persiste contenido de archivos ni output de consola; solo metadatos de entradas y del estado de UI.

#### 6.2.1 UI del `TreeFile`

- **Iconos por nombre y extensión:** se reutiliza la lógica de `_archived.dist\src\lib\files.ts` (`getFileIcon`, `iconForExtension`, `iconForName`, `isImageEntry`, `TEXT_EXTENSIONS`), portada a `src/utils/icons.ts` y adaptada a `FileEntry` (que no trae `mime_type` ni `is_binary`, así que la decisión se toma por extensión y nombre). Los archivos de texto usan el icono `i-vscode-icons-*` correspondiente, las imágenes `i-vscode-icons-file-type-image`, el resto de binarios `i-vscode-icons-file-type-binary` y los desconocidos `i-vscode-icons-default-file`. El set `@iconify-json/vscode-icons` ya está en `package.json`; estos iconos se pasan tal cual a `UIcon` (`toIconify()` solo convierte `tabler`/`cib`). Directorios y symlinks conservan `ICONS.actions.folder`/`folderOpen` y `ICONS.actions.symlink`. **No se asigna `item.icon`**: el icono calculado se pasa solo al `UIcon` del slot `#item-leading`, que es el control de selección; así no se dibuja dos veces (uno por `labelKey`/`icon` del `TreeItem` y otro por el slot).
- **Selección desde el icono:** se elimina el `UCheckbox` de `#item-leading` y su lugar lo ocupa el icono del archivo/directorio como control de selección. Al hacer clic en el icono se alterna su estado y se sustituye por un icono de seleccionado (por ejemplo `ICONS.status.circleCheck`), con `title`/i18n para «Seleccionar»/«Deseleccionar». El clic en el resto de la fila **no** cambia la selección: se cancela el evento `select` del `UTree` con `preventDefault()` y el `modelValue` se sincroniza desde el store de selección. El `UTree` se configura con `multiple`, `selectionBehavior="toggle"`, `propagateSelect` y **`bubbleSelect`**, necesarios para que `selected`/`indeterminate` se propaguen correctamente y un directorio con algunos hijos marcados muestre el estado intermedio.
- **Selección de directorios:** al seleccionar un directorio se cargan primero todos sus niveles (reutilizando `loadedKeys` y `loadingKeys`, con spinner) y después se marcan él y todos sus descendientes. El contrato actual de `load-children` es un `emit` sin retorno, insuficiente para esto: pasa a ser una **prop función** `loadChildren(key: string): Promise<void>` en `FileTree`. El panel implementa esa función con la misma carga de un nivel que ya hace `FileManagerPanel.vue`, actualiza `childrenByKey`/`loadedKeys` y emite `children-loaded` para guardar la instantánea. La selección recursiva **espera la `Promise`** antes de marcar: primero resuelve todas las ramas y luego `propagateSelect` del `UTree` propaga hasta el último nivel; deseleccionar el directorio quita la selección de todo su contenido. Para directorios muy grandes se aplica un límite de profundidad/entradas con aviso i18n, de modo que la carga recursiva no bloquee la UI; lo que se haya cargado queda en la instantánea persistida.
- **Metadatos y slots:** `#item-trailing` conserva tamaño, fecha y permisos de `FileEntry`, el destino `→ <target>` de los symlinks y el spinner de carga. Se mantienen los slots `node-status`, `node-progress` y `node-actions` para que la cola inyecte marcas y progreso sin acoplar el componente. En la vista de transferencias esos metadatos se renderizan a la izquierda (§6.3.1).
- **Estado restaurado:** `expanded` deja de ser puramente local: se hidrata desde `snapshot.expandedKeys` y se guarda de vuelta en el store, igual que `selected` con `snapshot.selection`. El `key` del nodo es la ruta estable, así que ambos sobreviven a la revalidación.

### 6.3 Cola persistida, interrupción y reintento

- **API de `useSshJobs`:** se conservan las firmas públicas (`runBatch`, `run`, `cancel`, `clear`, eventos), pero no queda intacta: `SshJobStatus` es un tipo compartido con la consola y gana `interrupted`; `SshJob` gana `createdAt` (ISO, §6.3.1). Ningún job de la consola pasa a `interrupted` porque la consola no se persiste. `useRemoteFileManager` añade `hydrate()` y un observador de cambios que escribe el snapshot de cada job (con `debounce` para `file_progress`).
- Al restaurar, `pending`/`running` → `interrupted`; se limpia `jobId` porque el token en Rust ya no existe. Los estados terminales se conservan sin límite hasta `clearFinished()`, que borra también las filas SQLite.
- **`interrupted` hay que cablearlo en todos los puntos que hoy clasifican estados**, no solo añadir el valor al tipo: `FINISHED` y `ACTIVE` en `TransferQueue.vue`, `isActive()`, `statusColor()` y el contador de terminados de esa vista, `isActiveStatus()` en `useSshJobs.ts` (debe devolver `false`), y `clear()`, que ya lo elimina por ser distinto de `running`/`pending` y debe seguir haciéndolo. Así el botón **Reintentar** aparece, el color y el texto son coherentes y «Limpiar terminados» no queda deshabilitado con solo jobs interrumpidos.
- `interrupted` tiene clave i18n en `components.file_manager.status.*`; la cola muestra el motivo y un botón **Reintentar**. El reintento reconstruye `FileManagerTransferRequest` desde el snapshot (`hostId`, dirección, rutas, opciones, `remoteSource`), genera una clave nueva y guarda `retryOf` apuntando al job anterior.
- Si el host ya no existe o está deshabilitado, el botón de reintento se deshabilita con aviso i18n; no se intenta la conexión.
- **Migración única de marcas:** `src/stores/remoteFileMarks.ts` sigue vivo, pero en el arranque se lee su contenido `localStorage` **una sola vez**, se escribe en SQLite, se borran las claves antiguas y el store pasa a hablar solo con el módulo de persistencia. No se mantiene adaptador puente ni doble escritura; conserva la clave `host + ruta + tamaño + fecha` y el `prune()` actual.
- La consola remota no participa: sus jobs no se persisten y `useRemoteCommand.ts` no se modifica.

#### 6.3.1 Vista de transferencias

- `TransferQueue.vue` deja de pintar tarjetas con un botón que contrae/expande el detalle: dibuja **un bloque por job** con la cabecera actual (dirección, estado, bytes, rutas, mensaje de error y acciones **Cancelar**/**Reintentar**) y, debajo, el detalle de archivos en un `FileTree` de solo lectura.
- Los bloques se ordenan por `created_at` **descendente** (más reciente arriba, más antiguo abajo), incluidos los `interrupted`. Para que el orden exista también en memoria, `SshJob` gana `createdAt: string` (ISO, asignado al crear el job) que se mapea a la columna `created_at` y se restaura de ella; `startedAt`/`finishedAt` no sirven porque pueden ser `null` en jobs `pending`. Se desempata por la secuencia de `key` (`ssh-job-N`), de modo que la rehydratación conserva el mismo orden que la sesión viva.
- Cada bloque usa `FileTree` con un modo `readOnly`/`alwaysExpanded`: los `TreeItem` de directorio llevan `defaultExpanded: true`, el `expanded` se recalcula cuando llegan `file_list`/`file_started` y el evento `@toggle` se cancela con `preventDefault()` para que **no se pueda contraer**; se ocultan los botones de expansión y no hay selección. Las rutas relativas de `SshJobFile[]` se normalizan antes de construir el árbol: `relativePath` puede traer `\` desde Windows local y `/` desde SFTP, así que se convierten todos los separadores a `/` y se dividen por segmentos descartando vacíos y `.`; luego se reutilizan los iconos por extensión de §6.2.1.
- La información del archivo (bytes transferidos/tamaño, porcentaje y badge de estado) se muestra **a la izquierda del nombre**, en `#item-leading`, detrás del icono; la barra de progreso y el mensaje de error se conservan debajo de la fila. Para no romper el panel de archivos, `FileTree` añade un slot `node-leading-info` que solo se renderiza si el consumidor lo usa; la metadata sigue en `#item-trailing` por defecto en el panel de archivos.
- Desaparece el `expandedKeys` local de `TransferQueue.vue`: al estar siempre expandido, no hay estado de UI nuevo que persistir. Las claves nuevas de la vista van en `components.file_manager.queue.*` con espejo en `en`; el estado `interrupted` se añade a `components.file_manager.status.*` (§6.3).

### 6.4 Concurrencia del lote

- `RemoteTransferBatchInput` incorpora `max_concurrency: number | null` (normalizado a 1-N, `null` → **2**, el valor por defecto acordado). La fachada lo toma de `useFileManagerPreferences`. `src/types/tauri-types.d.ts` es autogenerado: se regenera con el flujo de generación de tipos del proyecto, no se edita a mano, y hay que verificar que su comentario deje de decir «se ejecutan en secuencia».
- El backend mantiene **una conexión SSH por lote** y un token por ítem registrado al inicio. Con `max_concurrency > 1` se ejecutan varios ítems a la vez; los eventos se correlacionan por `key` y se serializan antes de `channel.send()`.
- Riesgo a resolver en el plan: `run_item` toma `&SftpSession` y callbacks `FnMut` no `Send`. Antes de implementar se comprueba si `russh-sftp 2.3.0` permite compartir la sesión entre tareas (clonar el handle o usar un `Arc<Mutex<…>>`); si no es seguro, se abren sesiones SFTP adicionales sobre el mismo cliente SSH o se degrada a ejecución secuencial. **El comportamiento por defecto es concurrente con `max_concurrency = 2`**: la degradación a secuencial es un *fallback* documentado, con aviso i18n explícito, no el comportamiento normal ni una opción silenciosa. La corrección sigue siendo evitar una conexión SSH por archivo.
- Cancelación: `ssh_cancel_remote_job(job_id)` sigue siendo el único comando; `item_started` puede llegar desordenado y el frontend no debe asumir orden de inicio. Los ítems pendientes con token se cancelan igual que hoy.
- `progress`, `item_finished` y `batch_finished` se agregan por clave; `batch_finished` espera a todos los ítems. El gestor no usa `dependsOn` hoy; si se necesitara, se agruparían los ítems en lotes secuenciales por nivel de dependencia en lugar de modificar el motor de la consola.
- El límite debe reflejarse en la UI: como máximo N ítems en `running`, el resto en `pending`; no se promete orden de finalización.

### 6.5 Seguridad, i18n y documentación

- Las rutas y metadatos se guardan solo en el equipo local; **no se envían a servicios de terceros**, solo al host SSH configurado (en `ssh_list_remote_dir` y en cada transferencia, como ya hace el v1), y no se cifran con el vault porque no son secretos. Nunca se persisten contraseñas, claves ni contenido de archivos.
- Todas las claves nuevas van en `src/locales/es/` con espejo en `en`; se regenera `typed-locale.d.ts` con `bun run i18n:types`. El backend sigue devolviendo claves i18n, nunca texto en español.
- Actualizar `AGENTS.frontend.md` (stores, selección por icono y persistencia del gestor), `AGENTS.backend.md` (nuevo parámetro `max_concurrency` y concurrencia del lote), `AGENTS.md` si cambia alguna regla, `docs/content/es/004.hosts/` (directorio base remoto, distinto del directorio de trabajo) y `docs/content/es/008.file-manager/` con persistencia, reintento, concurrencia y la nueva vista de transferencias.

---

## 7. Bloques de implementación

  > Cada bloque será un plan independiente (`.agents/plans/`) cuando el diseño esté **Aprobado**. Un bloque = un plan.

  1. **Esquema, directorio base del host, preferencias y listados/árbol** — **Pendiente**: entidad Drizzle y generación manual de la migración (ejecutar `bun run drizzle:generate` y `bun run tables:generate`), creación de las **tres** tablas (`preferences`, `listings`, `transfers`) y de `deployer_hosts.default_remote_path`, campo en `HostForm` con validación de ruta absoluta, i18n y botón «Restablecer ruta», migración única de la clave `useStorage` de ruta remota, módulo de acceso SQLite, stores de preferencias y listados, iconos sin `item.icon` y selección por icono en el `TreeFile` (`bubbleSelect`, contrato `loadChildren` asíncrono, `children-loaded` y límite de carga recursiva), hidratación y revalidación en `file-manager.vue`/`FileManagerPanel.vue`, i18n y docs. Plan: pendiente de crear.
  2. **Cola persistida, estado `interrupted`, reintento manual y vista de transferencias** — **Pendiente**: **consumir** la tabla `deployer_file_manager_transfers` creada en el bloque 1 (sin nueva migración), observador de snapshots, `SshJob.createdAt` mapeado a `created_at`, hidratación de `useSshJobs`/`useRemoteFileManager`, cableado completo de `interrupted` (`FINISHED`, `ACTIVE`, `isActive()`, `statusColor()`, `isActiveStatus()`, `clear()`), botón de reintento, bloques ordenados por `created_at` con rutas normalizadas y `FileTree` siempre expandido (`defaultExpanded` + `@toggle` con `preventDefault`) y metadata a la izquierda, migración única de marcas con borrado de claves `localStorage`, i18n y docs. Depende del bloque 1 (esquema, convención de stores e iconos del `TreeFile`). Plan: pendiente de crear.
  3. **Concurrencia configurable en el lote SFTP** — **Pendiente**: `max_concurrency` en el input, regeneración de `src/types/tauri-types.d.ts`, estudio de seguridad de `SftpSession`, ejecución limitada, eventos y cancelación, cableado desde preferencias, aviso i18n solo si se degrada a secuencial, i18n y docs. Depende del bloque 1 para leer la preferencia; independiente del bloque 2. Plan: pendiente de crear.

---

## 8. Verificación prevista

> Orientativa. La verificación la ejecuta el usuario.

- Cambiar preferencias (concurrencia, rutas, opciones), cerrar y reabrir la app y comprobar que se conservan.
- Dejar el árbol remoto con varios niveles expandidos y archivos seleccionados, recargar la app y verificar que se restaura todo y que los niveles se revalidan contra SFTP.
- Modificar un archivo remoto marcado como «descargado» y comprobar que la marca se retira tras revalidar el listado.
- Iniciar una descarga, cerrar la app a mitad de transferencia, reabrirla y comprobar el estado `interrupted`, el detalle por archivo y el botón **Reintentar**; verificar que el reintento crea un job nuevo y conserva el anterior.
- Comprobar que «Limpiar terminados» elimina también las filas persistidas y que, al reabrir, no reaparecen.
- Ajustar `max_concurrency` a 1, 2 y un valor mayor; verificar que nunca hay más ítems en `running` que el límite y que la cancelación de un ítem pendiente sigue funcionando.
- Comprobar que la consola remota sigue funcionando igual (sin jobs persistidos ni eventos nuevos).
- Crear/editar un host con directorio base remoto, abrir el gestor y verificar que ese es el primer directorio del panel; navegar a otro, recargar y comprobar que se respeta la ruta guardada por host. Verificar que cambiar el `working_dir` de la consola no altera esa ruta base.
- Hacer clic en el icono de un archivo y de un directorio: el icono cambia al seleccionar, el directorio carga y selecciona todo su contenido, el clic en la fila no selecciona y deseleccionar el directorio limpia sus descendientes. Probar un directorio grande para ver el aviso del límite.
- En la vista de transferencias, comprobar que los bloques aparecen del más reciente al más antiguo, que el detalle de archivos no se puede contraer y que tamaño/estado/progreso están a la izquierda del nombre; recargar y verificar que se mantiene el orden.
- Comandos sugeridos al terminar: `bun run i18n:types`, `bunx vue-tsc --noEmit`, `bun run build` y `cargo check` (si se toca Rust). La migración `bun run drizzle:generate` y `bun run tables:generate` se ejecutan como pasos manuales del bloque 1.

---

## 9. Puntos abiertos

No hay decisiones pendientes del usuario: las opciones de producto están cerradas. Quedan detalles técnicos que se fijan al redactar los planes:

- Umbral exacto de profundidad y número de entradas a partir del cual la selección recursiva de un directorio se corta con aviso (bloque 1).
- Comando concreto del proyecto para regenerar `src/types/tauri-types.d.ts` tras añadir `max_concurrency` (bloque 3).
- Comprobación de seguridad de `SftpSession` y criterio para degradar a secuencial con aviso (bloque 3).

La viabilidad de compartir `SftpSession` entre tareas es un riesgo técnico del bloque 3, no una decisión de producto.

---

## 10. Sugerencias (no solicitadas, pendientes de aprobación)

Ninguna en este documento. Las ideas aplazadas —búsqueda/filtro (`FUT-FM-01`), virtualización (`FUT-FM-02`), drag & drop (`FUT-FM-03`) y sincronización con checksums (`FUT-FM-04`)— están registradas con su intención, funcionamiento y ventajas en `.agents/AGENTS.futuro.md` §4b. Las operaciones de escritura remota y el editor de contenido remoto quedan **descartados** (§2 y §4).

---

## 11. Diferencias diseño vs implementación

  | Tema | Diseño v1 | Implementación real |
  | --- | --- | --- |
  | Ubicación de componentes | `src/components/remote/file-manager/` | `src/components/pages/file-manager/`, según la regla de componentes por página de `AGENTS.md`. |
  | `SelectHost` | Barra de herramientas de la página, bajo `UDashboardNavbar` | Cabecera del panel remoto (`#header-actions`). |
  | Progreso | «No es byte a byte»; un evento al terminar cada ítem | Pre-listado recursivo y `file_progress` por archivo con throttle de 100 ms (plan `file-manager-fixes-progress`). |
  | Expansión del árbol | Clic en el nombre (marcaba la casilla) | Botón específico que expande un nivel sin alterar la selección (plan `file-manager-fixes-ui`). |
  | Scope local | `plugin-fs` + permisos `fs` | Igual, más `recursive: true` en `plugin-dialog` y mensaje de error con ruta y motivo. |
  | Eventos del lote | `batch_started`, `item_started`, `progress`, `item_finished`, `batch_finished` | Añade `file_list`, `file_started`, `file_progress` y `file_finished`. |
  | Profundidad de symlinks | `MAX_DOWNLOAD_DEPTH = 64` (propuesta) | `MAX_DOWNLOAD_DEPTH = 32` en `ssh/transfer.rs`. |
  | Preferencias | `plugin-store` solo si el usuario lo aprobaba | Hoy `useStorage` suelto en la página; el v2 las unifica en SQLite/Pinia. |
  | Persistencia | Solo marcas «descargado» en `localStorage` + ruta/pestaña/host | Igual; el v2 amplía a listados y cola en SQLite. |

---

## 12. Historial de revisiones

- **2026-11-23:** propuesta inicial del v2. Recoge el estado real del gestor y los planes de correcciones de 2026-11-23; incorpora persistencia completa en SQLite con Pinia, concurrencia configurable (default 2), reintento manual de jobs interrumpidos y retención sin límite, según las decisiones del usuario.
- **2026-11-23:** revisión de los comentarios `MC` del usuario. Se elimina `localStorage` y el adaptador puente, se corrige el flujo de migraciones (entidad + generación manual), se aclara que cambiar de host no descarta listados, se fija `null → 2` en `max_concurrency`, se detalla la UI del `TreeFile` (iconos reutilizados y sin checkbox), se separa la creación del esquema del consumo de la tabla de transferencias, se descartan las operaciones de escritura remota y se trasladan las ideas aplazadas a `.agents/AGENTS.futuro.md` §4b.
- **2026-11-23 (revisión 2):** nuevos comentarios `MC` atendidos. `deployer_hosts` gana un directorio base remoto como ruta por defecto (distinto del directorio de trabajo), la selección del árbol se hace desde el icono con carga y selección recursiva de directorios, y la vista de transferencias pasa a bloques ordenados del más reciente al más antiguo con `TreeFile` siempre expandido y metadata a la izquierda del nombre. Se actualizan estado real, decisiones, bloques, verificación y documentación.
- **2026-11-23 (aprobación):** el usuario aprueba el diseño y decide implementarlo con **un único plan de tres fases**, no con un plan por bloque. Se crea `.agents/.done/plans/AGENTS.remote-file-manager-v2.PLAN.md` (archivado el 2026-11-24).
- **2026-11-23 (revisión 3):** revisión de coherencia con el código real y la API de `UTree`. Se aclara la lectura única de `localStorage` para migrar marcas y la ruta remota actual, se añade validación de ruta absoluta y «Restablecer ruta», se evita el icono duplicado y se añaden `bubbleSelect` y un contrato `loadChildren` asíncrono, se cablea `interrupted` en todos los puntos de clasificación de estados, se añade `SshJob.createdAt` para ordenar por `created_at`, se normalizan separadores de `relative_path` y se fija «siempre expandido» con `defaultExpanded` + `@toggle` cancelado. Se corrige la afirmación sobre el envío de rutas (solo al host SSH, no a terceros), se exige regenerar los tipos autogenerados y se deja la degradación a secuencial como fallback documentado. Los umbrales y el comando de generación de tipos pasan al §9.
- **2026-11-24 (cierre):** el usuario confirma la verificación y da por completado el diseño junto con su único plan derivado. El diseño pasa a **Implementado** y se archiva en `.agents/.done/designs/` como referencia; no se modifica su contenido.
