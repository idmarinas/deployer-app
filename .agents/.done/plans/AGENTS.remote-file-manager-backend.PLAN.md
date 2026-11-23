# Plan: Gestor de archivos remoto de doble panel (1/3) — Backend de navegación SFTP

## Estado

**Terminado** — verificado por el usuario el 2026-11-22.

**Diseño de origen:** `.agents/.done/designs/AGENTS.remote-file-manager.DESIGN.md`. Corresponde al bloque 1 de la sección 7 del diseño.
**Serie:** `remote-file-manager` — plan 1 de 3. Hermanos: `AGENTS.remote-file-manager-ui.PLAN.md`, `AGENTS.remote-file-manager-queue.PLAN.md`.
**Dependencia:** ninguna.
**Orden de ejecución:** 1 de 3. Lo consume el plan de interfaz (2/3) y, de forma indirecta, el plan de cola (3/3).

> **Revisión (2026-11-20):** se corrige el listado a la API real de `russh-sftp 2.3.0` (`read_dir()`/`ReadDir`/`DirEntry`), se refuerza la carga de un solo nivel y se decide mostrar los archivos ocultos por defecto. Se documenta qué es `statvfs` y se difiere a fase futura el listado en streaming/placeholders por lotes (`c4`).

---

## Instrucciones dadas (verbatim)

  > "Si prepara un plan para el diseño de gestor de doble panel, ten encuenta que tenemos un componente que es para mostrar un árbol de archivos TreeFiles.
  >
  > En cuanto a esto russh-extra 0.1.7 prepara una comparativa para determinar si es conveniente usarlo, sí tiene todo lo que usamos, y así no tener que mantener código propio."

  Instrucciones posteriores (verbatim):

  > "Olvidalo, lo dejamos tal y como está."
  >
  > "He agregado comentarios"
  >
  > "Bien, ya puedes crear el plan."

  Contexto aportado por el agente (análisis previo):

  - No existe ningún comando para listar un directorio remoto; `open_sftp_session` ya está disponible en `src-tauri/src/ssh/helpers.rs`.
  - `join_remote_path` existe en `src-tauri/src/ssh/transfer.rs` pero es privada; hay que exponerla como `pub(crate)` para reutilizarla sin duplicar lógica de rutas.
  - `russh-extra 0.1.7` fue descartado por el usuario: la capa SSH/SFTP se mantiene con `russh 0.65.1` + `russh-sftp 2.3.0`.
  - El gestor nuevo no puede reutilizar `ssh_upload_file`/`ssh_download_file` tal cual para Many items; este plan solo cubre el listado, no las transferencias.

---

## Objetivo

Añadir un comando Tauri que liste **un nivel** de un directorio remoto por SFTP y devuelva entradas tipadas al frontend, con rutas normalizadas con `/`, metadatos básicos y manejo de errores acorde al contrato existente.

**No entra en este plan:** UI, selección, cola, transferencias, cancelación de listados, persistencia y cambios de BD.

---

## Contexto técnico actual

  - `src-tauri/src/ssh/` es el módulo único del dominio SSH (`mod.rs` declara `cancel`, `connect`, `error`, `events`, `exec`, `helpers`, `session`, `transfer`, `transfer_commands`, `types`).
  - `src-tauri/src/ssh/types.rs` define los inputs/resultados/eventos con `#[derive(TS)]` y `export_to = "tauri-types.d.ts"`.
  - `src-tauri/src/ssh/transfer_commands.rs` muestra el patrón a seguir: `connect_sftp` usa `connect_to_host_by_id(app, host_id, ssh_reconnect_attempts, true)`, `ensure_connected()` y `open_sftp_session()`; devuelve `CommandResponse<T>` con claves i18n de `keys`.
  - `src-tauri/src/ssh/error.rs` concentra `SshError` y `keys::*`; `src/locales/es/tauri.ts` y su espejo `en` contienen los mensajes; el backend nunca devuelve texto en español.
  - `src-tauri/src/lib.rs` registra los comandos en `tauri::generate_handler!` (actualmente `ssh_upload_file`, `ssh_download_file`, `ssh_execute_command`, `ssh_cancel_remote_job`, …).
  - `src-tauri/src/ssh/transfer.rs` ya resuelve symlinks con `metadata()`/`symlink_metadata()`/`canonicalize()` y contiene `join_remote_path` (privada).
  - API verificada de `russh-sftp 2.3.0`: `SftpSession::read_dir(path)` devuelve `SftpResult<ReadDir>`, un `Iterator<Item = DirEntry>`; `DirEntry::file_name()`, `file_type()`, `metadata()` y `path()` son **síncronos** (los atributos vienen en la respuesta `READDIR`, sin una petición SFTP por entrada) y `path()` ya usa `/` como separador.
  - La misma API ofrece `SftpSession::fs_info(path) -> SftpResult<Option<Statvfs>>`, basado en la extensión `statvfs@openssh.com` v2; devuelve `None` si el servidor no la soporta. No aporta al listado de entradas (es información de espacio del filesystem).
  - No hay migraciones nuevas: no se persiste nada en SQLite.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-20 | Mantener `russh 0.65.1` + `russh-sftp 2.3.0`; `russh-extra` descartado por el usuario. |
| 2026-11-20 | Listado de un solo nivel, sin recursión automática, con límite opcional de entradas y flag `truncated`; la interfaz pide solo el nivel en el que está, nunca el árbol completo (decisión del usuario, `c3`). |
| 2026-11-20 | Los archivos y directorios ocultos (nombre que empieza por `.`) se muestran por defecto; el comando no los filtra (decisión del usuario, `c1`). |
| 2026-11-20 | Listado en streaming / placeholders por lotes **diferido a fase futura**; esta versión mantiene listado por niveles con `max_entries`/`truncated` (decisión del usuario, `c4`). |
| 2026-11-20 | Rutas remotas siempre con `/`, reutilizando `join_remote_path` hecha `pub(crate)`. |
| 2026-11-20 | Tipos nuevos con `ts-rs` y errores mediante `SshError`/`keys::*`; sin SQL. |

**Alternativas descartadas:** usar `ssh_execute_command("ls …")` (salida no estructurada y dependiente del shell remoto), adoptar `russh-extra` (decisión del usuario), `openssh-sftp-client`/`opendal-service-sftp`/`ssh2`/`bssh-russh-sftp` (evaluadas previamente: ecosistema, plataforma o modelo síncrono).

---

## Problemas y riesgos encontrados

### P1 — Volumen de entradas y carga por niveles

  - `read_dir()` devuelve un `ReadDir` que solo se puede recorrer; cada `DirEntry` ya trae `file_name()`, `file_type()` y `metadata()` **sin peticiones SFTP adicionales** por entrada (a diferencia del planteamiento inicial con `opendir`/`readdir`).
  - **→ Riesgo MEDIO.** Un directorio con miles de entradas puede tardar en recorrerse y en transferirse al frontend. El comando acepta `max_entries`, ordena por tipo/nombre y marca `truncated`, y devuelve **solo el nivel pedido, sin recursión**. La interfaz carga el contenido del nivel en el que está y no construye el árbol completo (plan 2, fase 4).
  - **Placeholders por lotes (`c4`):** SFTP no expone un recuento de entradas de un directorio: `ReadDir` es un iterador y `size_hint()` no proporciona el total. Por tanto no se puede pedir primero cuántos hay para crear todos los placeholders y después solicitar la información por lotes; los atributos ya llegan con cada entrada. La alternativa viable sería un **listado en streaming** (emitir lotes a medida que se leen, con total desconocido hasta agotar el directorio o alcanzar `max_entries`), lo que exige cambiar el contrato del comando. Decidido **diferir a fase futura**; esta versión mantiene listado por niveles + `max_entries`.

### P2 — Symlinks y rutas

  - Un enlace roto puede fallar al resolverlo con `canonicalize`; las rutas con separadores de Windows romperían el listado.
  - **→ Riesgo MEDIO.** Clasificar con `DirEntry::file_type()` (o `symlink_metadata()` cuando haga falta) y usar `read_link()`/`canonicalize()` solo para rellenar `target`; si falla, dejar `target` vacío sin abortar el listado. `DirEntry::path()` ya usa `/` como separador; aun así, construir con `join_remote_path` cualquier ruta derivada.

### P3 — Contrato de errores

  - Los errores de SFTP deben llegar al frontend como claves i18n, no como texto.
  - **→ Riesgo BAJO.** Reutilizar `SshError::transfer_failed` o añadir una clave nueva en `error.rs` + `tauri.ts` (es/en) si hace falta un caso específico.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Tipos expuestos al frontend

1. Añadir en `src-tauri/src/ssh/types.rs`: `RemoteListInput` (`host_id`, `path`, `ssh_reconnect_attempts`, `max_entries`), `RemoteListing` (`path`, `entries`, `truncated`), `RemoteEntry` (`name`, `path`, `kind`, `size`, `modified`, `permissions`, `target`) y el enum `RemoteEntryKind` (`file`, `dir`, `symlink`, `other`).
2. Derivar `Debug`, `Clone` cuando aplique, `Serialize`/`Deserialize` según corresponda y `TS` con exportación a `tauri-types.d.ts`.
3. Regenerar `src/types/tauri-types.d.ts` con el mecanismo `ts-rs` del proyecto (paso manual del usuario).

### Fase 2 — Comando de listado

1. Crear `src-tauri/src/ssh/list.rs` con `ssh_list_remote_dir(input: RemoteListInput) -> Result<CommandResponse<RemoteListing>, String>`.
2. Abrir la conexión con el mismo patrón de `connect_sftp` en `transfer_commands.rs`: `connect_to_host_by_id` → `ensure_connected` → `open_sftp_session`; hacer `disconnect` al terminar.
3. Normalizar `path` (por defecto `/` si está vacío), abrir el directorio con `sftp.read_dir(path)` e iterar `ReadDir` hasta `max_entries`; clasificar cada `DirEntry` con `file_type()`/`metadata()` y resolver `target` de los symlinks con `read_link()`/`canonicalize()` sin abortar si falla. **No filtrar las entradas ocultas**: se muestran por defecto.
4. Usar `DirEntry::path()` (ya devuelve la ruta con `/`) y `join_remote_path` para cualquier ruta derivada; ordenar por tipo (directorios primero) y nombre y rellenar `truncated` cuando se alcance el límite. El resultado contiene solo el nivel solicitado.
5. Mapear cualquier error a `SshError`/`keys::*` y devolver `CommandResponse::err` con la clave correspondiente.

### Fase 3 — Registro y documentación técnica

1. Cambiar `join_remote_path` a `pub(crate)` en `src-tauri/src/ssh/transfer.rs` y reutilizarla desde `list.rs`.
2. Declarar y reexportar el módulo en `src-tauri/src/ssh/mod.rs`.
3. Registrar `ssh_list_remote_dir` en `tauri::generate_handler!` en `src-tauri/src/lib.rs`.
4. Actualizar `AGENTS.backend.md` (§5 y inventario de comandos SSH) con el nuevo comando, el hecho de que no hay migración y la política de rutas/symlinks.
5. Si se añade una clave de error nueva, replicarla en `src/locales/es/tauri.ts` y `src/locales/en/tauri.ts`.

---

## Archivos afectados

  | Archivo | Cambio previsto |
  | --- | --- |
  | `src-tauri/src/ssh/types.rs` | Nuevos tipos de listado con `ts-rs`. |
  | `src-tauri/src/ssh/list.rs` | Nuevo comando `ssh_list_remote_dir`. |
  | `src-tauri/src/ssh/transfer.rs` | `join_remote_path` pasa a `pub(crate)`. |
  | `src-tauri/src/ssh/mod.rs` | Declarar y reexportar el módulo `list`. |
  | `src-tauri/src/lib.rs` | Registrar el comando en `generate_handler!`. |
  | `src-tauri/src/ssh/error.rs` | Solo si hace falta una clave de error nueva. |
  | `src/locales/es/tauri.ts`, `src/locales/en/tauri.ts` | Solo si se añade una clave nueva. |
  | `src/types/tauri-types.d.ts` | Regenerado por `ts-rs` (no editar a mano). |
  | `AGENTS.backend.md` | Documentar comando, rutas y ausencia de migración. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Invocar `ssh_list_remote_dir` contra un host válido y un directorio conocido; comprobar que devuelve nombre, ruta con `/`, tipo, tamaño, fecha y permisos.
2. Probar un directorio con enlaces simbólicos: verificar que aparecen como `symlink` y que un enlace roto no aborta el listado.
3. Probar `max_entries` bajo y confirmar que `truncated` es `true` y que el número de entradas coincide con el límite.
4. Probar una ruta inexistente y un host deshabilitado; comprobar que el mensaje mostrado usa la clave i18n y no texto quemado.
5. Comprobar que no se crea ninguna migración SQL ni se modifica la BD.

---

## Criterios de aceptación

  - [x] `ssh_list_remote_dir` está registrado y devuelve `CommandResponse<RemoteListing>`.
  - [ ] Los tipos están exportados a `src/types/tauri-types.d.ts` y el frontend puede importarlos. **Pendiente:** el usuario debe ejecutar `cargo test export_bindings` (mecanismo `ts-rs` del proyecto).
  - [x] Las rutas devueltas usan `/` y los enlaces simbólicos se clasifican sin fallar.
  - [x] El listado es de un solo nivel, con `max_entries` y `truncated`, y la interfaz no precarga niveles hijos.
  - [x] Los archivos ocultos aparecen por defecto.
  - [x] Los errores usan `SshError`/`keys::*` y sus claves existen en `es` y `en`.
  - [x] `AGENTS.backend.md` describe el comando y no hay migraciones nuevas.

### Desviaciones

  - Se añadió la clave de éxito `keys::LIST_OK` (`tauri.ssh.success.list`) con su mensaje en `es`/`en`; el plan solo preveía claves nuevas para errores, pero reutilizar `upload`/`download`/`exec` sería engañoso para un listado.
  - `max_entries` por defecto = 1000 (resuelve el punto abierto 1) y se fuerza un mínimo de 1 para evitar un listado vacío silencioso.
  - No se usa `Channel` ni `RemoteJobCancel`: el listado es una petición síncrona desde la perspectiva del frontend y no entra en la cancelación multi-job de la consola.
  - El `target` de los symlinks se intenta resolver primero con `canonicalize()` y, si falla (enlace roto), se conserva el texto de `read_link()`, haciendo absoluto el relativo con `join_remote_path`. Así un enlace roto nunca aborta el listado.
  - Se aprovechó la revisión documental para corregir `AGENTS.backend.md`: `russh 0.62` → `0.65.1` y `MAX_DOWNLOAD_DEPTH = 64` → `32`, datos que estaban obsoletos.

---

## Puntos abiertos

1. ~~Valor por defecto de `max_entries` cuando el frontend no lo envía.~~ Resuelto en la ejecución: 1000 (mínimo 1).
2. `statvfs` es la extensión SFTP `statvfs@openssh.com` v2: informa del espacio del sistema de archivos remoto (total, usado, libre), no de las entradas del directorio. En `russh-sftp 2.3.0` se consulta con `SftpSession::fs_info(path)` y devuelve `Option<Statvfs>` (`None` si el servidor no la soporta). No es necesario para navegar ni transferir, así que se mantiene fuera del alcance inicial salvo petición contraria.

---

## Historial

  | Fecha | Cambio |
  | --- | --- |
  | 2026-11-20 | Plan creado en estado **Planificando** a partir del diseño aprobado. |
  | 2026-11-20 | Revisión: `read_dir`/`DirEntry` en lugar de `opendir`/`readdir`; ocultos visibles por defecto (`c1`); carga de un solo nivel (`c3`); explicado `statvfs` (`c2`); `c4` diferido a fase futura. |
  | 2026-11-22 | Autorizado por el usuario; plan pasado a **Ejecutando**. |
  | 2026-11-22 | Implementados tipos `ts-rs`, `ssh_list_remote_dir`, registro en `lib.rs`, claves i18n y documentación `AGENTS.backend.md`. Queda pendiente la regeneración de `tauri-types.d.ts` por parte del usuario. |
  | 2026-11-22 | El usuario confirmó que todo está ok; plan dado por terminado y archivado. |
