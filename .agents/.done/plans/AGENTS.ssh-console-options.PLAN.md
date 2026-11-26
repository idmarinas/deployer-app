# Plan: Completar opciones SSH en la consola remota

> **Revisión (2026-11-20):** atendidos los tres primeros comentarios (c1, c2 y c3) y los dos comentarios sobre i18n. Se crea un composable **genérico y reutilizable** (pensado para Nodes Workflow), llamado `useSshJobs.ts`, y se completan los componentes actuales; la cancelación pasa a ser **selectiva y en cascada** sobre los comandos dependientes. Las descargas guardan en el destino local manteniendo la estructura, como un cliente FTP (FileZilla), y `ssh_reconnect_attempts` se añade también a `CommandRunOptions` en `src/utils/commands/runner.ts`. Respecto a i18n: `typed-locale.d.ts` es necesario solo en DEV (lo regeneran `bun run dev`/`bun run tauri:dev`, no `bun run build`) y las claves se crean primero en `es` y se reflejan en espejo en el resto de idiomas de la UI, a diferencia de la documentación.

## Estado

**Terminado** (2026-11-20) — el usuario confirmó que todo está corregido y dio el plan por finalizado.

**Diseño de origen:** ninguno (alcance acotado a la capa de frontend existente; no introduce arquitectura nueva).

---

## Instrucciones dadas (verbatim)

  > "src-tauri\src\ssh
  >
  > Existe composable/componente para el frontend para gestionar la ejecución de un comando?
  >
  > Tiene que permitir todas las opciones disponibles de ssh.
  >
  > Si no existe o está incompleto crea un plan para crearlo o actualizarlo."

  Aclaraciones del usuario a las preguntas de alcance (2026-11-20):

  > "¿Qué incluye exactamente «todas las opciones disponibles de SSH» para este composable/componente?" → **Campos + operaciones SSH**.
  >
  > "¿Qué forma debe tener la solución?" → **Completar la actual**.

  Contexto aportado por el agente (análisis previo):

  - **Backend completo**: `src-tauri/src/ssh/` expone cuatro comandos Tauri con sus inputs tipados (`src-tauri/src/ssh/types.rs`): `ssh_execute_command` (`RemoteCommandInput`: `host_id`, `command`, `working_dir`, `timeout_secs`, `ssh_reconnect_attempts`), `ssh_upload_file` (`RemoteUploadInput`: `host_id`, `local_path`, `remote_path`, `overwrite`, `chmod`, `recursive`, `ssh_reconnect_attempts`), `ssh_download_file` (`RemoteDownloadInput`: `host_id`, `remote_path`, `local_path`, `overwrite`, `recursive`, `ssh_reconnect_attempts`) y `ssh_cancel_remote_job` (por `job_id` o el último registrado).
  - **Frontend existente**: `src/composables/useRemoteCommand.ts` ya envuelve los cuatro comandos y expone estado reactivo (`output`, `isRunning`, `lastExitCode`, `errorMessage`, `currentJobId`) y acciones (`execute`, `upload`, `download`, `cancel`, `clear`). Los componentes están en `src/components/remote/` (`RemoteCommand.vue`, `RemoteFileUpload.vue`, `RemoteFileDownload.vue`, `RemoteOutput.vue`) y se ensamblan en `src/pages/dashboard/console.vue`.
  - **Existe pero está incompleto**: tres opciones están fijadas en el código y no se pueden configurar desde la UI (`ssh_reconnect_attempts: 3` en los tres componentes; `overwrite: true` en subida y descarga); las pestañas de subir/descargar están deshabilitadas en `console.vue` (`disabled: true`) aunque backend y componentes ya están implementados; la cancelación ignora `currentJobId` (se cancela el último job, no el del evento `started`); y `content_base64` de la descarga se descarta en la UI aunque el placeholder de i18n promete devolver el contenido.
  - **Documentación desactualizada**: `docs/content/es/006.console/1.usage.md` afirma que el timeout es por evento, pero `src-tauri/src/ssh/exec.rs` aplica un plazo total al bucle completo; `docs/content/es/006.console/2.files.md` marca las pestañas como WIP; y `AGENTS.frontend.md` §6 describe un componente `RemoteConsole.vue` que no existe (los reales son los cuatro listados arriba, con `SelectHost` en la página).
  - **Revisión c1/c2/c3**: el usuario matiza la forma de la solución: crear un composable **genérico y reutilizable** (con vistas al sistema de Nodes Workflow, en diseño), llamado `useSshJobs.ts`, y completar los componentes actuales. Además, cancelar un comando debe cancelar también los comandos que dependen de él. Las descargas deben guardarse en el destino local manteniendo la estructura, igual que un cliente FTP (FileZilla); el backend ya lo hace cuando se envía `local_path`. Por último, `ssh_reconnect_attempts` debe poder configurarse también desde `CommandRunOptions` en `src/utils/commands/runner.ts`, que hoy lo fija a `null`. El diseño `AGENTS.node-workflows.DESIGN.md` ya prevé el registro multi-job y la cancelación por `job_id` (§15.2), las aristas de dependencia del grafo (§7.1) y las raíces de interpolación `params`/`nodes`/`workflow` (§9.2).

---

## Objetivo

Crear un **composable genérico y reutilizable** para operaciones SSH (multi-job, con soporte para dependencias) y **completar los componentes actuales** de la consola para que la UI permita **todos los campos de los tres inputs SSH y las cuatro operaciones** (ejecutar, subir, descargar, cancelar). Sin modificar el backend.

**Queda fuera de alcance:**

- Cambios en `src-tauri/src/ssh/` (ya expone todo lo necesario).
- Crear un **componente** genérico nuevo: se completan los componentes actuales; la pieza reutilizable es el **composable** (revisión c1).
- Cambios en el parseo o en las definiciones de los comandos guardados (`system_info`, `update_packages`, etc.): solo se parametriza `ssh_reconnect_attempts` en `CommandRunOptions` (revisión c3); el resto del runner queda intacto.
- Opciones de conexión del host (puerto, auth, huella): viven en la entidad `hosts`, no en los inputs de ejecución, y ya se gestionan en el formulario de hosts.

---

## Contexto técnico actual

  | Capa | Situación actual |
  | --- | --- |
  | `src-tauri/src/ssh/types.rs` | Define los tres inputs y los eventos `RemoteConsoleEvent` (`started`, `output_chunk`, `finished`, `error`). `finished` incluye `status: success\|error\|cancelled`. |
  | `src/composables/useRemoteCommand.ts` | `run()` crea el `Channel`, acumula output y llama a `invoke`. `execute()` interpola `{{global.*}}` y redacta secretos; `upload()`/`download()` pasan el input tal cual. `cancel(jobId?)` invoca sin id por defecto. |
  | `RemoteCommand.vue` | Expone `working_dir` (default `/`), `timeout_secs` y comando. Fija `ssh_reconnect_attempts: 3`. |
  | `RemoteFileUpload.vue` / `RemoteFileDownload.vue` | Exponen rutas, `recursive` y `chmod` (solo subida). Fijan `overwrite: true` y `ssh_reconnect_attempts: 3`. Reciben `cancel` como prop pero no renderizan botón de cancelación. |
  | `console.vue` | `SelectHost` en la toolbar; pestañas command/upload/download con las dos últimas `disabled: true`; un único `RemoteOutput` compartido. No desestructura `currentJobId`. |
  | `RemoteOutput.vue` | Muestra output, error, código de salida y botón Limpiar. No distingue el estado `cancelled`. |
  | `src-tauri/src/ssh/transfer_commands.rs` | `ssh_download_file`: con `local_path` guarda en disco (`download_dir` para directorios, `download_single_file` para archivos, `download` con autodetección) y devuelve `saved_to`; sin `local_path` devuelve `content_base64` solo para archivos simples. `recursive` es tri-estado (`Some(true)` directorio, `Some(false)` archivo, `None` autodetección) y `download_dir` conserva la estructura relativa bajo el destino. |
  | `src/utils/commands/types.ts` / `runner.ts` | `CommandRunOptions` expone `working_dir`, `timeout_secs` y `params`; el runner fija `ssh_reconnect_attempts: null` en el input de `ssh_execute_command` (revisión c3: se parametriza). |
  | Diseño de Nodes Workflow | `AGENTS.node-workflows.DESIGN.md` §15.2: `RemoteJobCancel` ya es multi-job, el `job_id` lo genera Rust y llega en `started`; la cancelación por ejecución recorre los `job_id` uno a uno. §7.1 define aristas `source → target` sin ciclos y §9.2 las raíces de interpolación previstas. |

  Convenciones que aplican: iconos desde `@/utils/icons` (`ICONS`), claves i18n en `snake_case` con `es` como fuente y espejo en el resto de idiomas de la UI (`en/`) con `satisfies LocaleMessageValue`, estilos PCB sin hexadecimales, y regeneración de `typed-locale.d.ts` solo en DEV (`bun run dev`/`bun run tauri:dev`, o `bun run i18n:types` manual; `bun run build` no lo genera).

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-20 | Alcance: **campos + operaciones SSH** (decisión del usuario). |
| 2026-11-20 | Crear un **composable completo, genérico y reutilizable** para otras operaciones/componentes (incluido Nodes Workflow) y, además, **completar el componente actual** (decisión del usuario, revisión c1; matiza la respuesta «Completar la actual»). |
| 2026-11-20 | El composable genérico es independiente de la consola: registro multi-job por clave de cliente, `job_id` recibido en `started`, adaptador de interpolación configurable y cancelación por dependencias (decisión del agente, revisión c1). |
| 2026-11-20 | `useRemoteCommand.ts` pasa a ser una **fachada** sobre el composable genérico, conservando la API que usan los componentes (`execute`/`upload`/`download`/`cancel`/`clear`) y añadiendo las opciones y el estado de cancelación (decisión del agente). |
| 2026-11-20 | Habilitar las pestañas de subida/descarga en `console.vue`: backend y componentes ya están implementados, y el usuario pidió todas las operaciones (decisión del agente). |
| 2026-11-20 | `cancel(key)` cancela el **comando seleccionado** y, en cascada, **todos los comandos que dependen de él**: cancela los descendientes en curso por su `job_id` y marca como `skipped` los dependientes aún no iniciados (decisión del usuario, revisión c2). Sin clave se conserva la compatibilidad de la consola (job actual/último), nunca «todos» por defecto. |
| 2026-11-20 | El composable genérico se llama **`useSshJobs.ts`** (decisión del usuario, revisión c1). |
| 2026-11-20 | Las descargas se guardan siempre en el destino local indicado por `local_path`, conservando la estructura de directorios como un cliente FTP (FileZilla) (decisión del usuario, revisión c2). La UI exigirá destino; `content_base64` queda como respuesta del backend para usos alternativos, no como flujo principal de la consola. |
| 2026-11-20 | Añadir `ssh_reconnect_attempts?: number` a `CommandRunOptions` y usarlo en el input del runner en lugar del `null` fijo; no se toca el parseo ni las definiciones de comandos (decisión del usuario, revisión c3). |
| 2026-11-20 | No modificar el backend (`src-tauri/src/ssh/`) en este plan (decisión del agente). |
| 2026-11-20 | `typed-locale.d.ts` es un artefacto de DEV: lo regeneran `bun run dev`/`bun run tauri:dev` (o `bun run i18n:types` manualmente), no `bun run build` (decisión del usuario, comentario i18n c1). |
| 2026-11-20 | Los locales de la UI se crean primero en `es` (fuente principal) y se reflejan en espejo en el resto de idiomas; la documentación traducida se crea solo tras aprobación (decisión del usuario, comentario i18n c2). |

**Alternativas descartadas:** crear un **componente** genérico nuevo y migrar la consola a él (revisión c1: se completan los componentes actuales; lo reutilizable es el composable); seguir ampliando solo `useRemoteCommand.ts` como pieza única (no sirve para otros componentes ni para Nodes Workflow, revisión c1); añadir comandos Rust nuevos (el módulo `ssh/` ya cubre todo); tocar la entidad `hosts` para exponer opciones de conexión (fuera del alcance elegido); volcar `content_base64` al terminal como mecanismo principal de descarga (revisión c2: se guarda en destino con estructura); dejar `ssh_reconnect_attempts: null` fijo en el runner (revisión c3: se parametriza en `CommandRunOptions`).

---

## Problemas y riesgos encontrados

### P1 — Opciones fijadas en los componentes

  - `ssh_reconnect_attempts: 3` en los tres componentes y `overwrite: true` en subida/descarga.
  - **→ Riesgo MEDIO.** Exponer ambos como campos con el valor actual por defecto; ajustar los tests funcionales para comprobar que el valor llega al backend.

### P2 — Pestañas deshabilitadas

  - `console.vue` marca upload/download como `disabled: true` y la documentación lo refleja como WIP.
  - **→ Riesgo MEDIO.** Habilitarlas y actualizar `docs/content/es/006.console/2.files.md`. Verificar cada operación de extremo a extremo con un host real.

### P3 — Cancelación selectiva y en cascada

  - El botón llama a `cancel()` sin id; con jobs concurrentes o tras reconexión puede cancelarse el job equivocado. `currentJobId` ya se recibe en el evento `started` pero no se usa.
  - Revisión c2: al cancelar un comando hay que cancelar también **los comandos que dependen de él** (descendientes en el grafo). En la consola no hay dependencias registradas, pero el composable genérico debe soportarlas para Nodes Workflow.
  - **→ Riesgo MEDIO.** El composable registra `job_id` + dependencias por trabajo; `cancel(key)` cancela el job seleccionado y, en cascada, los descendientes en curso (marcando `skipped` los aún no iniciados). Mostrar el estado `cancelled`/`skipped` en la salida.

### P4 — Descargas guardadas en destino (comportamiento FileZilla)

  - La UI no ofrece claramente el destino local y el placeholder i18n promete «obtener el contenido si se deja vacío», pero solo muestra un toast. El backend ya guarda en disco cuando recibe `local_path` y conserva la estructura con `download_dir` (revisión c2).
  - **→ Riesgo MEDIO.** Hacer obligatorio el destino local (`local_path`) en la UI de descarga (selector de carpeta o archivo destino) y enviarlo siempre. El backend elige `download_dir`/`download_single_file`/`download` según `recursive` y el tipo remoto, creando los directorios intermedios. Mostrar `saved_to` y las líneas de progreso (`Descargando: … → …`) en `RemoteOutput`. No volcar `content_base64` al terminal como flujo principal; documentar que esa respuesta del backend queda para usos sin destino (no expuesta en la consola).

### P5 — Documentación y guías desactualizadas

  - Timeout documentado como por evento (es total), pestañas marcadas WIP, `AGENTS.frontend.md` nombra un componente inexistente.
  - **→ Riesgo BAJO.** Actualizar las guías en el mismo trabajo, según la regla «Documentación a actualizar» de `AGENTS.md`.

### P6 — Claves i18n nuevas

  - `typed-locale.d.ts` solo es necesario en DEV: `bun run build` no lo genera, pero `bun run dev` (y por tanto `bun run tauri:dev`, cuyo `beforeDevCommand` es `bun run dev`) sí lo regenera. Si se trabaja sin dev server, hay que ejecutar `bun run i18n:types` manualmente.
  - **→ Riesgo BAJO.** Mantener el paso de regeneración explícito en la verificación. Las claves se crean primero en `es` (fuente principal) y se reflejan en modo espejo en el resto de idiomas de la UI (`en/`). Esto es distinto de la documentación: `docs/content/es/` se crea siempre y sus traducciones a otros idiomas solo tras aprobación.

### P7 — Composable genérico multi-job

  - Debe dar soporte a varios trabajos concurrentes, con clave de cliente, `job_id` del evento `started`, adaptador de interpolación configurable y cancelación por dependencias, sin acoplarse a la consola ni al runner de comandos guardados.
  - **→ Riesgo MEDIO.** Definir la API en la Fase 1 y validarla con dos trabajos y una dependencia antes de cablear los componentes. Referencia: `AGENTS.node-workflows.DESIGN.md` §§7.1, 9.2 y 15.2.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Composable genérico de operaciones SSH

1. Crear `src/composables/useSshJobs.ts`: motor reutilizable, independiente de la consola, con un registro reactivo de trabajos por clave de cliente (`key`, `jobId` del evento `started`, operación, estado, output, `exitCode`, error, resultado y tiempos).
2. Exponer `execute`/`upload`/`download` con **todos** los campos de los inputs (`working_dir`, `timeout_secs`, `ssh_reconnect_attempts`, `overwrite`, `chmod`, `recursive`, `local_path`/`remote_path`), pasando el input íntegro al backend. En descarga, `local_path` es obligatorio en la UI (destino local) y `recursive` se envía como tri-estado: `true` (directorio), `false` (archivo) o `null` (autodetección, como FileZilla).
3. Aceptar metadatos por trabajo (`key`, `dependsOn`, etiqueta) y un adaptador de interpolación configurable (por defecto `{ global: await loadGlobalScopeForExecution() }`, con `collectSecretValues`/`redactSecrets`) para poder reutilizarlo en Nodes Workflow con otras raíces (`params`, `nodes`, `workflow`...).
4. Implementar `cancel(key, { cascade?: boolean } = { cascade: true })`: cancela el job seleccionado por su `job_id` y, en cascada, todos sus descendientes en curso; marca como `skipped` los dependientes aún no iniciados. Sin clave, usa el trabajo actual/último (compatibilidad de consola), nunca «todos» por defecto.
5. Exponer `cancelAll()`, `clear(key?)`, `lastFinishStatus`, `appendOutput(text)` y el estado agregado que consume la consola (`output`, `isRunning`, `lastExitCode`, `errorMessage`, `currentJobId`).
6. Refactorizar `src/composables/useRemoteCommand.ts` como fachada delgada sobre `useSshJobs`, conservando la API que ya usan los componentes y añadiendo las opciones y el estado de cancelación.

### Fase 2 — Componentes: completar la consola sobre el composable

1. `RemoteCommand.vue`: añadir control numérico para `ssh_reconnect_attempts` (vacío → `null`, default visible 3) y pasarlo en el input; conservar `working_dir` y `timeout_secs`.
2. `RemoteFileUpload.vue`: añadir controles para `overwrite` y `ssh_reconnect_attempts`, pasarlos en el input y renderizar botón de cancelación mientras `isRunning`.
3. `RemoteFileDownload.vue`: hacer obligatorio el destino local `local_path`, añadir controles para `overwrite`, `recursive` (tri-estado) y `ssh_reconnect_attempts`, botón de cancelación, y mostrar en la salida `saved_to` junto al progreso de archivos; no decodificar `content_base64` en el terminal (revisión c2).
4. `src/pages/dashboard/console.vue`: quitar `disabled: true` de las pestañas upload/download; registrar cada operación con su clave de trabajo y pasar a los tres componentes una función `cancelCurrent` que llame a `cancel(claveActual)` (la consola no registra dependencias, así que la cascada no cancela otros trabajos).
5. `src/utils/commands/types.ts` y `src/utils/commands/runner.ts`: añadir `ssh_reconnect_attempts?: number` a `CommandRunOptions` (reintentos de conexión SSH) y sustituir el `ssh_reconnect_attempts: null` fijo del input por el valor de `options` (default `null` para conservar el comportamiento actual del backend; revisión c3). Comprobar que los llamadores de `runCommand`/`runCustomCommand` siguen funcionando sin cambios.
6. Comprobar que los componentes siguen recibiendo las mismas props (no se crea un componente genérico nuevo; revisión c1).

### Fase 3 — i18n, guías y documentación

1. Añadir primero en `src/locales/es/components/console.ts` (fuente principal) las claves para reintentos de conexión, sobrescribir, destino local, modo recursivo, guardado en destino, cancelado y omitido (misma jerarquía `components.console.*`), y reflejarlas en espejo en el resto de idiomas de la UI (`src/locales/en/components/console.ts`). Regenerar `typed-locale.d.ts`: lo hace `bun run dev` / `bun run tauri:dev`; si se trabaja sin dev server, ejecutar `bun run i18n:types` manualmente (`bun run build` no lo genera).
2. Corregir `AGENTS.frontend.md` §6 «Consola remota»: sustituir `RemoteConsole.vue` por los cuatro componentes reales, indicar que `SelectHost` vive en `console.vue`, describir las opciones disponibles y documentar `useSshJobs` como composable genérico reutilizable (con cancelación por dependencias) y `useRemoteCommand` como fachada de la consola.
3. Actualizar `docs/content/es/006.console/1.usage.md` (timeout **total** de `timeout_secs`, reintentos, cancelación selectiva del job y en cascada de dependientes) y `docs/content/es/006.console/2.files.md` (pestañas habilitadas, destino local obligatorio en descarga con estructura tipo FileZilla, `overwrite`, `recursive` tri-estado, `chmod`, reintentos). Documentar en `AGENTS.frontend.md` que el runner de comandos guardados acepta `ssh_reconnect_attempts` vía `CommandRunOptions`. A diferencia de los locales de la UI, la traducción a `docs/content/en/006.console/` se deja para cuando el usuario lo confirme, según `AGENTS.docs.md`.

---

## Archivos afectados

  | Archivo | Cambio previsto |
  | --- | --- |
  | `src/composables/useSshJobs.ts` | Nuevo composable genérico: registro multi-job, todas las opciones SSH, interpolación configurable, cancelación selectiva y en cascada. |
  | `src/composables/useRemoteCommand.ts` | Fachada sobre `useSshJobs`: conserva la API de la consola y expone las nuevas opciones/estado. |
  | `src/components/remote/RemoteCommand.vue` | Control de `ssh_reconnect_attempts`. |
  | `src/components/remote/RemoteFileUpload.vue` | Controles de `overwrite` y `ssh_reconnect_attempts`, botón Cancelar. |
  | `src/components/remote/RemoteFileDownload.vue` | Destino local obligatorio, controles de `overwrite`, `recursive` (tri-estado) y `ssh_reconnect_attempts`, botón Cancelar y salida con `saved_to`/progreso (sin volcado de `content_base64`). |
  | `src/pages/dashboard/console.vue` | Habilitar pestañas, registrar claves de trabajo y cablear `cancelCurrent`. |
  | `src/utils/commands/types.ts` | Nueva opción `ssh_reconnect_attempts?: number` en `CommandRunOptions`. |
  | `src/utils/commands/runner.ts` | Usar la opción en el input de `ssh_execute_command` en lugar del `null` fijo. |
  | `src/locales/es/components/console.ts` | Fuente principal de las nuevas claves i18n. |
  | `src/locales/en/components/console.ts` | Espejo de las nuevas claves (resto de idiomas de la UI). |
  | `AGENTS.frontend.md` | Corregir §6 «Consola remota» y documentar ambos composables. |
  | `docs/content/es/006.console/1.usage.md` | Corregir timeout y documentar opciones/cancelación. |
  | `docs/content/es/006.console/2.files.md` | Quitar aviso WIP y documentar opciones de transferencia. |
  | `typed-locale.d.ts` | Regenerado en DEV por `bun run dev`/`bun run tauri:dev` o `bun run i18n:types` manual (autogenerado, no editar a mano; `bun run build` no lo crea). |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Abrir `/dashboard/console` con un host habilitado: la pestaña **Ejecutar comando** muestra ahora el campo de reintentos; cambiarlo y ejecutar un comando simple, comprobando que la salida y el código de salida siguen funcionando.
2. Probar la interpolación `{{global.slug}}` y un secreto en comando/directorio, verificando que se resuelven y se redactan como antes.
3. Cambiar a **Subir archivos** y **Descargar archivos**: comprobar que las pestañas son seleccionables, que `overwrite`/`recursive`/`chmod` y reintentos se pueden cambiar, y que el botón Cancelar aparece solo mientras se ejecuta la operación.
4. Descargar un archivo y un directorio indicando destino local: los archivos se crean en el destino manteniendo la estructura relativa (como FileZilla), se respetan `overwrite` y `recursive`, y el terminal muestra el progreso y `saved_to`. Comprobar que la UI no permite descargar sin destino.
5. Iniciar un comando largo y pulsar Cancelar: se cancela **ese** job (no otro), el estado «cancelado» se refleja en la salida y no queda un job pendiente.
6. Con dos trabajos y una dependencia registrada, cancelar el padre: el hijo en curso se cancela y el pendiente queda «omitido»; un trabajo independiente sigue ejecutándose.
7. Ejecutar un comando guardado pasando `ssh_reconnect_attempts` en `CommandRunOptions` y comprobar que llega al backend; sin la opción, se conserva el comportamiento anterior (`null`).
8. Tras arrancar `bun run tauri:dev` (o ejecutar `bun run i18n:types` manualmente), comprobar que no hay claves i18n sin traducir en consola (avisos de `warnMissingKeys` en DEV) y que el build de tipos pasa con `typed-locale.d.ts` regenerado. Recordar que `bun run build` no lo genera.

---

## Criterios de aceptación

  - [ ] Existe un composable genérico reutilizable con registro multi-job, todas las opciones SSH e interpolación configurable, independiente de la consola.
  - [ ] `cancel(key)` cancela el job seleccionado y, en cascada, sus dependientes en curso; los pendientes quedan `skipped`.
  - [ ] `useRemoteCommand` (fachada) expone el estado de finalización y cancela el job del evento `started` por defecto.
  - [ ] Los tres componentes de operación pasan **todos** los campos de su respectivo input (`RemoteCommandInput`, `RemoteUploadInput`, `RemoteDownloadInput`) sin valores fijos en el código.
  - [ ] Las cuatro operaciones SSH (ejecutar, subir, descargar, cancelar) son accesibles desde `/dashboard/console`.
  - [ ] Toda descarga desde la consola guarda archivos en el destino indicado conservando la estructura (comportamiento FileZilla) y muestra `saved_to`/progreso.
  - [ ] `CommandRunOptions` permite configurar `ssh_reconnect_attempts` y el runner lo envía a `ssh_execute_command`.
  - [ ] Claves i18n creadas primero en `es` y reflejadas en espejo en el resto de idiomas de la UI, con `typed-locale.d.ts` regenerado por el dev server o manualmente.
  - [ ] Guías `AGENTS*.md` y documentación `docs/content/es/006.console/` actualizadas y verificadas contra el código.

### Realizado (2026-11-20)

  - Fase 1: creado `useSshJobs.ts` (registro multi-job, todas las opciones, adaptador de interpolación, `cancel(key, { cascade })`/`cancelAll()`); `useRemoteCommand.ts` convertido en fachada con claves de trabajo opcionales.
  - Fase 2: los tres componentes de operación pasan todos los campos y muestran Cancelar; la descarga exige destino, envía `recursive` tri-estado y reporta `saved_to`; `RemoteOutput` muestra `cancelled`/`skipped`; `console.vue` habilita las pestañas y cablea el job activo. Añadido `ssh_reconnect_attempts` a `CommandRunOptions` y al input del runner.
  - Fase 3: claves i18n en `es` y espejo `en`, `AGENTS.frontend.md` §6 corregido y páginas `docs/content/es/006.console/{1.usage,2.files}.md` actualizadas contra el código.
  - Verificación (2026-11-20): el usuario ejecutó `bun run build`; se corrigieron 6 errores de TS (argumentos de `run()` en `useSshJobs`, estrechamiento de `job.status` en el `finally` y tipado mutable de `items` en `RemoteFileDownload`) y el build pasa (`vue-tsc --noEmit` + `vite build`). Siguen pendientes la regeneración de `typed-locale.d.ts` en DEV y la prueba manual.

### Desviaciones

  - El punto abierto sobre el origen de las dependencias se resolvió con la propuesta del plan: `dependsOn: string[]` (claves de trabajo) en los metadatos de cada job, sin consumir `WorkflowEdge[]` directamente.
  - `typed-locale.d.ts` no se regeneró: es un artefacto de DEV y el agente deja el generador (`bun run dev`/`bun run tauri:dev` o `bun run i18n:types`) como paso manual del usuario.

---

## Puntos abiertos

1. **Origen de las dependencias:** se propone declararlas con `dependsOn: string[]` al registrar cada trabajo, como precursores directos del grafo `WorkflowGraph.edges` del diseño. ¿Debe el composable consumir directamente `WorkflowEdge[]` o basta la lista de claves?

---

## Historial

  | Fecha | Cambio |
  | --- | --- |
  | 2026-11-20 | Plan creado en estado **Planificando** a partir de la petición del usuario y sus aclaraciones de alcance. |
  | 2026-11-20 | Revisión MC c1 y c2: composable genérico reutilizable + componentes actuales; cancelación selectiva y en cascada sobre dependientes. |
  | 2026-11-20 | Revisión MC c1, c2 y c3: nombre `useSshJobs.ts`, descargas tipo FileZilla con destino local y `ssh_reconnect_attempts` en `CommandRunOptions`. |
  | 2026-11-20 | Revisión de comentarios i18n: `typed-locale.d.ts` solo en DEV (regenerado por `dev`/`tauri:dev` o manualmente), claves creadas en `es` y reflejadas en espejo en los locales de la UI, a diferencia de la documentación. |
  | 2026-11-20 | El usuario autorizó la implementación: plan movido a **Ejecutando**. El punto abierto sobre el origen de las dependencias se resuelve con la propuesta `dependsOn: string[]` (claves de trabajo), anotada como suposición. |
  | 2026-11-20 | El usuario confirmó que todo está corregido: plan movido a **Terminado** y archivado. |
