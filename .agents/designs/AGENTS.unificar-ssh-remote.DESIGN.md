# Diseño: Unificar `ssh/` y `commands/remote/` en un único módulo SSH

> **Estado: Implementado** (Propuesta → Aprobado → Implementado; solo el usuario cambia el estado).
> El usuario lo aprobó el 2026-11-19 al pedir los planes y lo pasó a **Implementado** el mismo día, una vez terminados sus dos planes. Este documento **no es un plan**; los planes derivados están archivados en `.agents/plans.done/` y registrados en `.agents/AGENTS.done.md`.
>
> **Revisión (2026-11-18):** versión inicial. Incluye la limpieza previa de código sin uso, ejecutada antes de redactar el diseño por petición expresa del usuario (§3.2).
>
> **Revisión (2026-11-18, 2):** el usuario decide que `HostSystemInfo` **no puede estar en Rust**: se migra a `src/types/entities.ts` (igual que `HostStatusMetrics`) y se elimina el struct + su export ts-rs. Ya ejecutado; queda registrada en §10.
>
> **Revisión (2026-11-18, 3):** el usuario añade notas en §10 y fija la regla global **«no se queda ninguna función fuera y no cambia su comportamiento»**. Se añade la comparativa exhaustiva §3.5 y el trabajo pasa a ser un **traslado literal**: las duplicaciones de §3.3 se documentan pero **no se consolidan** en este cambio.
>
> **Revisión (2026-11-19):** el usuario aprueba el diseño y pide los planes. Se crean los dos planes de §7 (§3.5 es el checklist de no regresión de ambos). Los bindings ya se han regenerado: `tauri-types.d.ts` no contiene `HostSystemInfo`.
>
> **Cierre (2026-11-19):** el usuario dio por terminados ambos planes, confirmó la verificación (compilación, build y pruebas funcionales) y pidió marcar el diseño como **Implementado**. Detalle en `.agents/AGENTS.done.md`.

---

## 1. Tarea original (verbatim)

    > En el código Rust en src-tauri/src/ hay código que se ha quedado sin uso, y hay dos cosas que parece que estén duplicadas. Por ejemplo:
    >
    > src-tauri/src/commands/remote/ y src-tauri/src/ssh, da la impresión de  que hacen lo mismo (o muy parecido) La idea es tener solo uno.
    >
    > por ejemplo el ssh, ya que es eso, ejecutar comandos en el servidor, se tiene que conservar la funcionalidad de remote y de ssh.
    >
    > Para la cual vamos a crear el diseño para esto.
    >
    > Y antes de esto limpia el código que no está en uso:
    >
    > ```
    > warning: unused import: `run_ssh_command`
    >  --> src\ssh\mod.rs:8:60
    >   |
    > 8 | pub use helpers::{open_command_channel, open_sftp_session, run_ssh_command, shell_escape};
    >   |                                                            ^^^^^^^^^^^^^^^
    >   |
    >   = note: `#[warn(unused_imports)]` (part of `#[warn(unused)]`) on by default
    >
    > warning: struct `HostSystemInfo` is never constructed
    >   --> src\commands\hosts\types.rs:49:12
    >    |
    > 49 | pub struct HostSystemInfo {
    >    |            ^^^^^^^^^^^^^^
    >    |
    >    = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default
    >
    > warning: function `run_ssh_command` is never used
    >   --> src\ssh\helpers.rs:54:14
    >    |
    > 54 | pub async fn run_ssh_command(
    >    |              ^^^^^^^^^^^^^^^
    >
    > warning: function `normalize_output` is never used
    >   --> src\ssh\helpers.rs:91:4
    >    |
    > 91 | fn normalize_output(s: String) -> String {
    >    |    ^^^^^^^^
    > ```

---

## 2. Objetivo

Dejar **un único módulo SSH** en `src-tauri/src/` que concentre toda la funcionalidad de conexión, ejecución remota, transferencias SFTP y cancelación, eliminando `commands/remote/` como módulo separado. No se debe perder ninguna capacidad actual: streaming de output, timeout, reconexión, exit code, progreso, cancelación, descarga en base64, chmod, overwrite, recursividad y las claves i18n `tauri.remote.*`.

**Alcance de la primera versión:**

- Entra: **traslado literal** de todo el código de `commands/remote/` dentro de `ssh/` (comandos, tipos, estado de cancelación, helpers privados y constantes), ajustando solo rutas de import y registro; actualización de `AGENTS*.md`.
- No entra: cambiar el contrato con el frontend (nombres de comandos, de eventos ni de tipos ts-rs), reintroducir comandos retirados (Docker, `run_deployment`, `host_check_*`), cambiar el motor de interpolación ni tocar el parser de información del sistema.
- **No entra (decisión del usuario, nota en §10): ninguna refactorización ni cambio de comportamiento.** En particular no se consolidan las duplicaciones de §3.3, no se cambia el timeout de ejecución, no se tocan los comandos de upload/download y no se altera ningún mensaje, clave i18n, evento ni orden de operaciones. El inventario completo de §3.5 es el checklist de no regresión.

Casos de uso que deben seguir funcionando:

- Consola remota (`/dashboard/console`): ejecutar comando con output en vivo, cancelarlo, subir y descargar archivos (con y sin `local_path`).
- Runner de comandos guardados (`src/utils/commands/runner.ts`): `system_info`, `system_metrics`, `upgradable_packages`, `update_packages`, etc., vía `ssh_execute_command`.
- Test de conexión desde el formulario de host (`test_connection`).
- Exportación de clave pública (`export_public_key`), que usa la capa SSH de forma directa.

---

## 3. Estado actual relevante (verificado en el código)

### 3.1. No son dos implementaciones paralelas, sino dos capas

    | Elemento | Estado real |
    | --- | --- |
    | `src-tauri/src/ssh/` | Infraestructura SSH genérica, módulo **privado** (`lib.rs:5`). `mod.rs` re-exporta `connect_to_host_by_id`, `fetch_host_credentials`, `open_command_channel`, `open_sftp_session`, `shell_escape`, `decrypt_host_credentials`, `HostCredentials`, `SshCredentials`, `SshSession`. **No contiene ningún `#[ts(export)]`.** |
    | `ssh/connect.rs` | `connect_to_host_by_id(app, host_id, reconnect_attempts, enabled_only)` (L18-48): BD + vault + descifrado + conexión con timeout de 15 s. Devuelve `(SshSession, HostCredentials)`; los 4 llamadores descartan el segundo valor. |
    | `ssh/session.rs` | `SshSession` (conexión, `ensure_connected` con backoff de 2 s × intento, `disconnect`), credenciales y `decrypt_host_credentials`. Acepta cualquier clave de servidor (`check_server_key` → `true`). |
    | `ssh/helpers.rs` | Tras la limpieza: solo `open_sftp_session`, `shell_escape` y `open_command_channel` (este último no comprueba conexión; cada caller llama a `ensure_connected`). |
    | `ssh/transfer.rs` | Utilidades SFTP genéricas: `upload`/`upload_dir`/`upload_single_file`, `download`/`download_dir`/`download_single_file`, progreso por callback `FnMut(&str)`, cancelación **opcional** (`Option<&CancellationToken>`), `TransferResult`, `SFTP_BUFFER_SIZE`, `CANCELLED_MSG`. Sin i18n ni `Channel`. |
    | `src-tauri/src/commands/remote/` | Adaptadores Tauri. `exec.rs` (`ssh_execute_command` + `run_command_streaming`), `transfer.rs` (`ssh_upload_file` / `ssh_download_file`), `cancel.rs` (`RemoteJobCancel` + `ssh_cancel_remote_job`), `types.rs` (7 tipos ts-rs). |
    | Consumidores externos de `ssh/` | `commands/hosts/test_connection.rs:28` usa `connect_to_host_by_id(..., enabled_only: false)` con timeout propio de 10 s. `commands/passkeys/export_public_key.rs` usa `fetch_host_credentials`, `decrypt_host_credentials`, `open_command_channel`, `shell_escape`, `SshSession::connect/disconnect`. **Cualquier reubicación debe seguir sirviéndolos.** |
    | Registro en `lib.rs` | `commands::remote::{...}` en L14-16, `.manage(RemoteJobCancel::default())` en L29 y cuatro comandos en `invoke_handler!` (L58-61). |

Consecuencia: la unificación no consiste en borrar una de dos copias completas, sino en **hacer de `ssh/` el único dueño del dominio**, absorbiéndo los adaptadores Tauri y eliminando la capa intermedia. La separación interna conexión/sesión/helpers/transferencias se conserva como submódulos de `ssh/`.

### 3.2. Limpieza y migración ya ejecutadas (2026-11-18)

    Los tres primeros avisos se corrigieron antes de redactar el diseño, por petición expresa del usuario. El cuarto se resolvió después, al decidir el usuario que `HostSystemInfo` debía migrarse al frontend (§4).

    | Aviso | Acción realizada |
    | --- | --- |
    | `unused import: run_ssh_command` (`ssh/mod.rs:8`) | Eliminado del re-export: `pub use helpers::{open_command_channel, open_sftp_session, shell_escape};` |
    | `function run_ssh_command is never used` (`ssh/helpers.rs:54-87`) | Función eliminada. |
    | `function normalize_output is never used` (`ssh/helpers.rs:91-104`) | Función eliminada junto con los imports que solo ella usaba (`russh::ChannelMsg`, `std::time::Duration`, `tokio::time::timeout as tokio_timeout`). |
    | `struct HostSystemInfo is never constructed` (`commands/hosts/types.rs:49`) | **Migrado al frontend (decisión del usuario, 2026-11-18)**: el struct y su `#[ts(export)]` se eliminan de Rust; el tipo se define en `src/types/entities.ts` junto a `HostStatusMetrics`. Actualizados los imports de `src/drizzle/entities/hosts.ts` y `src/pages/dashboard/hosts/[id]/(view).vue`. Ya regenerado `tauri-types.d.ts`: no contiene `HostSystemInfo` (verificado el 2026-11-19). |

    Tras la limpieza no queda ninguna referencia a `run_ssh_command` ni `normalize_output` en `src-tauri/src/`. La funcionalidad de normalización de output desaparece con la función muerta (el output del streaming nunca se normalizaba); queda descartado definitivamente en §10. La migración de `HostSystemInfo` sigue el precedente de `AGENTS.rust-code-audit.PLAN.md` Fase 4, que trasladó `HostStatusMetrics`, `HostServerUpdates`, `HostPackage` y `HostUpdatesSummary` a `entities.ts`.

### 3.3. Duplicaciones documentadas (inventario histórico)

Estas duplicaciones se trasladaron tal cual a `ssh/` para no alterar el comportamiento. El plan 4/4 (`AGENTS.ssh-mejoras-duplicaciones.PLAN.md`, cerrado el 2026-11-19) las abordó sin cambiar semántica observable:

| Duplicación | Estado |
| --- | --- |
| `emit_*` / respuesta de eventos duplicados entre ejecución y transferencias | **Consolidado (parcial):** `ssh/events.rs` centraliza `emit_started`, `emit_output_chunk`, `emit_error`, `emit_finished` y el cierre terminal de transferencias; `exec.rs` y `transfer_commands.rs` lo usan. Las firmas/semánticas difieren por dominio y se conservan. |
| `connect → ensure_connected → open_sftp_session` repetido en upload/download | **Consolidado:** helper privado `connect_sftp` en `ssh/transfer_commands.rs`, conservando claves y punto de emisión de errores. |
| `CancellationToken::new()` + registro repetido 3 veces | **Cerrado por planes 2/3:** `RemoteJobCancel::register()` + `RemoteJobGuard` y `emit_started` están centralizados; se revisó en plan 4 y no se añadió más unificación para no alterar orden/tiempos. |
| Lectura SFTP en chunks con cancelación (base64 vs disco) | **No consolidado:** la rama base64 (memoria, sin progreso por línea) y `download_single_file` (disco, mensajes/progreso distintos) tienen semánticas diferentes; unificar requeriría cambios de comportamiento. |
| `CANCELLED_MSG` definido en `ssh/transfer.rs` y re-exportado en `ssh/cancel.rs` | **Sin cambio estructural (decisión plan 4):** se mantiene la definición en `ssh/transfer.rs` y el re-export en `ssh/cancel.rs` por compatibilidad. |

### 3.4. Inventario funcional a conservar (checklist de no regresión)

    - **Ejecución** (`exec.rs`): timeout por defecto 300 s, `working_dir` con `shell_escape`, normalización CRLF **del comando de entrada**, reconexión configurables (default 3), chunks cada ~100 ms, `exit_code = -1` si no se recibe `ExitStatus`, ignorar `Eof` y esperar `Close`, `duration_seconds`, cancelación reactiva con `tokio::select!`, `success: true` aunque el exit code sea distinto de 0, claves `tauri.remote.*`.
    - **Transferencias** (`remote/transfer.rs`): `overwrite` default `true`, `chmod` octal no fatal, `recursive` con tres estados, progreso por `OutputChunk`, cancelación cooperativa, rama base64 sin `local_path`, `Finished` con `exit_code: 0`, claves `tauri.remote.*`.
    - **Cancelación** (`cancel.rs`): un único token global; el frontend serializa los jobs.
    - **Conexión** (`ssh/`): timeout de 15 s, `ensure_connected` con backoff, descifrado con claves versionadas del vault, `enabled_only` según llamador.

### 3.5. Comparativa `ssh/` vs `commands/remote/` (inventario completo)

**Visión simple de las dos capas:**

| | `src-tauri/src/ssh/` | `src-tauri/src/commands/remote/` |
| --- | --- | --- |
| **Para qué sirve** | Hablar por SSH/SFTP con el servidor: conectar, abrir canales, ejecutar comandos y transferir archivos. | Exponer eso al frontend como comandos Tauri: traducir inputs a `CommandResponse`, emitir eventos por `Channel` y gestionar la cancelación. |
| **Quién lo llama** | `remote/`, `hosts/test_connection.rs` y `passkeys/export_public_key.rs`. | Solo el frontend (`useRemoteCommand.ts` y el runner de comandos). |
| **Tipos** | Sin `#[ts(export)]`: tipos internos del crate. | 7 tipos ts-rs exportados a `tauri-types.d.ts`. |
| **Errores** | `Result<_, String>` con mensajes en español. | `CommandResponse` con claves i18n `tauri.remote.*` + evento `Error`. |
| **Estado** | Sin estado global: la sesión se crea por llamada. | `RemoteJobCancel`: un único `CancellationToken` global. |
| **Tras unificar** | Sigue siendo el único módulo y **absorbe** los 4 comandos, sus tipos y su estado. | **Desaparece**: todo su contenido se traslada a `ssh/`. |

**Inventario función por función** — cada fila es una pieza que se traslada; ninguna se elimina ni se reescribe. La columna «Destino» muestra dónde queda, y «Conservar» recoge el detalle que no debe cambiar:

| Origen | Símbolo | Qué hace | Conservar exactamente | Lo usa | Destino |
| --- | --- | --- | --- | --- | --- |
| `ssh/connect.rs` | `SSH_TIMEOUT_SECS = 15` | Timeout del pipeline de conexión. | 15 s. | `connect_to_host_by_id` | `ssh/connect.rs` (sin cambios) |
| `ssh/connect.rs` | `connect_to_host_by_id(app, host_id, reconnect_attempts, enabled_only)` | Abre pool y vault (solo lectura), SELECT de host+passkey, cierra pool, descifra credenciales, arma `host:port` y conecta. | Devuelve `(SshSession, HostCredentials)`; `timeout(15s, SshSession::connect)`; `enabled_only` filtra `h.enabled = 1`. | `remote/exec`, `remote/transfer` (×2), `hosts/test_connection` | `ssh/connect.rs` (sin cambios) |
| `ssh/connect.rs` | `HostCredentialRow` (alias) | Fila mínima `(HostCredentials, Option<String>, Option<String>)` del SELECT. | Su forma. | `fetch_host_credentials` | `ssh/connect.rs` (sin cambios) |
| `ssh/connect.rs` | `fetch_host_credentials(pool, host_id, enabled_only)` | SELECT `deployer_hosts` LEFT JOIN `deployer_passkeys`. | Filtro `enabled` solo si `enabled_only`; columnas opcionales con `try_get().ok().flatten()`. | `connect_to_host_by_id`, `export_public_key` | `ssh/connect.rs` (sin cambios) |
| `ssh/session.rs` | `CONNECT_TIMEOUT_SECS = 15`, `SshClientHandler::check_server_key` | Timeout de `client::connect` y handler que acepta cualquier clave del servidor. | 15 s; `Ok(true)`. | `connect_and_auth` | `ssh/session.rs` (sin cambios) |
| `ssh/session.rs` | `HostCredentials`, `SshCredentials`, `SshSession` (structs) | Datos de credenciales y sesión (`handle`, `addr`, `credentials`, `max_reconnect_attempts`). | Campos y visibilidad. | Varios módulos | `ssh/session.rs` (sin cambios) |
| `ssh/session.rs` | `SshSession::connect(addr, credentials, max_reconnect_attempts)` | Crea el handle con `connect_and_auth` y guarda la sesión. | Firma y valores guardados. | `connect_to_host_by_id`, `export_public_key` | `ssh/session.rs` (sin cambios) |
| `ssh/session.rs` | `SshSession::ensure_connected()` | Prueba `channel_open_session()`; si falla reintenta hasta `max_reconnect_attempts`. | `sleep(2 * intento)` lineal; mensajes de error iguales. | `remote/exec`, `remote/transfer` (×2) | `ssh/session.rs` (sin cambios, llamado en los mismos puntos) |
| `ssh/session.rs` | `SshSession::disconnect(self)` | Envía `Disconnect::ByApplication` con "Sesión cerrada"/"en", ignora el error. | Mensaje y tipo de desconexión. | `remote/exec`, `remote/transfer` (×2), `export_public_key` | `ssh/session.rs` (sin cambios) |
| `ssh/session.rs` | `decrypt_host_credentials(host, key_content, passphrase, vault)` | Descifra solo valores `ENC:` con las claves del vault. | Scopes `encrypt:deployer_hosts.password`, `encrypt:deployer_passkeys.key_content` y `.passphrase`; el resto pasa tal cual. | `connect_to_host_by_id`, `export_public_key` | `ssh/session.rs` (sin cambios) |
| `ssh/session.rs` | `connect_and_auth`, `authenticate` (privadas) | `client::Config::default()` + timeout 15 s; auth por password (`unwrap_or_default`) o por clave OpenSSH (passphrase tolerando "already decrypted", `best_supported_rsa_hash`); rechaza si `AuthResult != Success`. | Algoritmos, tolerancias y mensajes. | Internas de `session.rs` | `ssh/session.rs` (sin cambios) |
| `ssh/helpers.rs` | `open_sftp_session(session)` | Abre canal, `request_subsystem("sftp")` y `SftpSession::new(channel.into_stream())`. | Mensajes de error y orden de llamadas. | `remote/transfer` (×2) | `ssh/helpers.rs` (sin cambios) |
| `ssh/helpers.rs` | `shell_escape(s)` | Envuelve en comillas simples escapando `'` como `'\''`. | La sustitución literal. | `remote/exec`, `export_public_key` | `ssh/helpers.rs` (sin cambios) |
| `ssh/helpers.rs` | `open_command_channel(session, command)` | Abre canal y hace `exec(true, command)`; **no** comprueba conexión. | `want_reply = true`; sin `ensure_connected` interno. | `remote/exec`, `export_public_key` | `ssh/helpers.rs` (sin cambios) |
| `ssh/transfer.rs` | `SFTP_BUFFER_SIZE = 256 KB`, `CANCELLED_MSG`, `cancelled()`, `TransferResult{zero,add}` | Buffer de transferencia, mensaje de cancelación, comprobación de token y acumulador de bytes/archivos. | Valores y mensaje `"Operación cancelada por el usuario"`. | Transferencias y `remote/transfer` | `ssh/transfer.rs` (sin cambios) |
| `ssh/transfer.rs` | `upload_single_file(...)` | Omite si `!overwrite` y destino existe (↷), emite "Subiendo…", lee local entero, comprueba cancelación, crea/escribe/flush remoto, aplica `chmod`, emite "✓ … (bytes)". | Orden, mensajes, `chmod` no fatal, cancelación después de la lectura. | `upload`, `upload_dir` | `ssh/transfer.rs` (sin cambios) |
| `ssh/transfer.rs` | `upload_dir(...)` | `read_dir` local, `create_dir` remoto (error ignorado), recursión con `Box::pin`, cancelación por entrada, suma de resultados. | Recursividad y comprobación de cancelación. | `upload`, `remote/transfer` | `ssh/transfer.rs` (sin cambios) |
| `ssh/transfer.rs` | `upload(...)` | Si `src.is_dir()` → `upload_dir`; si no → `upload_single_file`. | Autodetección por `is_dir()`. | `remote/transfer` | `ssh/transfer.rs` (sin cambios) |
| `ssh/transfer.rs` | `download_single_file(...)` | Omite si `!overwrite` y `dest.exists()` (↷), emite "Descargando…", `sftp.open` + `read_to_end`, comprueba cancelación, `create_dir_all(parent)`, `File::create` + `write_all`, emite "✓ …". | Orden, mensajes y cancelación después de la lectura. | `download`, `download_dir`, `remote/transfer` | `ssh/transfer.rs` (sin cambios) |
| `ssh/transfer.rs` | `download_dir(...)` | `sftp.read_dir`, `create_dir_all` local, recursión y cancelación por entrada, suma de resultados. | Recursividad y comprobación de cancelación. | `download`, `remote/transfer` | `ssh/transfer.rs` (sin cambios) |
| `ssh/transfer.rs` | `download(...)` | Detecta directorio remoto probando `sftp.read_dir(src).is_ok()`. | La detección por `read_dir`. | `remote/transfer` | `ssh/transfer.rs` (sin cambios) |
| `ssh/transfer.rs` | `apply_chmod(...)` (privada) | Parsea octal y aplica `set_metadata`; avisos `⚠` no fatales. | Avisos y no fatalidad. | `upload_single_file` | `ssh/transfer.rs` (sin cambios) |
| `remote/types.rs` | `RemoteCommandInput`, `RemoteUploadInput`, `RemoteDownloadInput` | Definición de los parámetros de los tres comandos. | Campos, comentarios y defaults documentados (300 s, 3 reintentos, `overwrite=true`). | Comandos y frontend | `ssh/types.rs` (mismo contenido) |
| `remote/types.rs` | `RemoteCommandResult`, `RemoteTransferResult`, `RemoteDownloadResult` | Formatos de respuesta de los tres comandos. | Campos y tipos. | Comandos y frontend | `ssh/types.rs` (mismo contenido) |
| `remote/types.rs` | `RemoteConsoleEvent` | Eventos `OutputChunk`, `Finished{exit_code,duration_seconds}` y `Error{message}`. | Tag `event` en snake_case y los tres nombres de evento. | `Channel` del frontend | `ssh/types.rs` (mismo contenido) |
| `remote/cancel.rs` | `RemoteJobCancel{register,cancel}` | `Mutex<Option<CancellationToken>>`; `register` reemplaza el token, `cancel` hace `take()` y cancela. | Un solo token global; `register` no limpia al terminar. | 3 comandos y `lib.rs` (`.manage`) | `ssh/cancel.rs` (mismo contenido) |
| `remote/cancel.rs` | `ssh_cancel_remote_job(state)` | Cancela el job en curso y devuelve `Ok(())`. | Firma y comportamiento best-effort. | Frontend | `ssh/cancel.rs` (mismo contenido) |
| `remote/cancel.rs` | `pub use crate::ssh::transfer::CANCELLED_MSG` | Re-export del mensaje de cancelación. | Sigue accesible con el mismo nombre. | `remote/exec`, `remote/transfer` | `ssh/cancel.rs` (re-export) |
| `remote/exec.rs` | `DEFAULT_TIMEOUT_SECS = 300`, `OUTPUT_CHUNK_INTERVAL_MS = 100` | Defaults del comando y de acumulación de chunks. | 300 s y 100 ms. | `ssh_execute_command`, `run_command_streaming` | `ssh/exec.rs` (mismo contenido) |
| `remote/exec.rs` | `ssh_execute_command(app, input, channel, state)` | Registra token, conecta (`enabled_only=true`, 3 reintentos por defecto), normaliza CRLF **del comando de entrada**, prefija `cd <shell_escape(wd)> &&`, ejecuta, desconecta, emite `Finished` y responde. | Defaults; `success: true` aunque `exit_code != 0`; claves `connection_failed` / `execution_failed` / `cancelled` / `success.exec` / `completed_with_errors`. | Frontend y runner de comandos | `ssh/exec.rs` (mismo contenido) |
| `remote/exec.rs` | `run_command_streaming(...)` (privada) | `ensure_connected` + `open_command_channel`; bucle `select![cancel | wait()]` con chunks, `exit_code` y duración. | `exit_code = -1` inicial; stdout+stderr ext=1; chunks ~100 ms; `Eof` ignorado, espera `Close\|None`; **timeout por `wait()`, no total**; cancelación reactiva. | `ssh_execute_command` | `ssh/exec.rs` (mismo contenido) |
| `remote/exec.rs` | `emit_chunk`, `emit_error`, `emit_finished`, `err_response` (privados) | Envían eventos al `Channel` y construyen `CommandResponse::err` con `params!("reason")`. | Eventos y parámetro `reason`. | `remote/exec` | `ssh/exec.rs` (mismo contenido) |
| `remote/transfer.rs` | `ssh_upload_file(app, input, channel, state)` | Registra token, conecta, `ensure_connected`, abre SFTP, sube con progreso, desconecta y responde. | `overwrite=true` por defecto; `Some(true)`→`upload_dir`, `None`/`Some(false)`→`upload` (autodetección); `Finished` con `exit_code: 0`; clave `success.upload`. | Frontend | `ssh/transfer_commands.rs` (mismo contenido) |
| `remote/transfer.rs` | `ssh_download_file(app, input, channel, state)` | Igual pipeline; con `local_path` elige `download_dir`/`download_single_file`/`download`; sin `local_path` lee en chunks y devuelve base64. | `Some(true)`→directorio, `Some(false)`→archivo simple, `None`→autodetección; buffer de 256 KB; cancelación en cada vuelta; `TransferResult{files:1}`; `Finished` con `exit_code: 0`; clave `success.download`. | Frontend | `ssh/transfer_commands.rs` (mismo contenido) |
| `remote/transfer.rs` | `emit_error`, `emit_finished`, `err_response` (privados) | Iguales que en `exec`; `Finished` con `exit_code = 0`. | `exit_code = 0` y parámetro `reason`. | `remote/transfer` | `ssh/transfer_commands.rs` (mismo contenido) |
| `remote/mod.rs` y `ssh/mod.rs` | Declaración de submódulos y re-exports | Exponen los 4 comandos, el estado de cancelación y las primitivas SSH. | La superficie pública no cambia. | `lib.rs` y consumidores internos | `ssh/mod.rs` (añade los re-exports de `remote/mod.rs`); `remote/mod.rs` desaparece |
| `lib.rs` | Registro de comandos | `.manage(RemoteJobCancel::default())` y los 4 comandos en `invoke_handler!`. | Los 4 nombres invocables y el estado. | Tauri | `lib.rs` (solo cambia la ruta Rust del import) |

> **Regla de oro de esta tabla:** es el contrato de no regresión. Las duplicaciones descritas en §3.3 se **trasladan tal cual** y no se unifican en este trabajo; cualquier consolidación futura requiere aprobación explícita porque podría cambiar el comportamiento.

---

## 4. Decisiones acordadas

*El diseño está Implementado (2026-11-19). Las decisiones funcionales del usuario están aplicadas (§6 y §10) y los planes derivados están archivados en `.agents/plans.done/`.*

| Fecha | Decisión |
| --- | --- |
| 2026-11-18 | **`HostSystemInfo` no vive en Rust** (decisión del usuario): migrado a `src/types/entities.ts`, igual que `HostStatusMetrics`; eliminado el struct y su export ts-rs. Ejecutado (§3.2). |
| 2026-11-18 | **`commands/remote/` desaparece** y todo su contenido pasa a `ssh/` (nota del usuario en §10). |
| 2026-11-18 | **`normalize_output` descartado**: si el frontend ya lo hace, sería duplicar trabajo (nota del usuario en §10). Ya eliminado en la limpieza. |
| 2026-11-18 | **Upload/download solo se trasladan, sin modificarlos** (nota del usuario en §10): siguen siendo necesarios para el futuro deploy. |
| 2026-11-18 | **Sin cambios de comportamiento**: se mantienen el timeout por `wait()`, `Finished.exit_code = 0`, defaults, claves i18n, eventos y orden de operaciones (§3.5). |

**Alternativas descartadas (recomendación del agente):**

- **Conservar `commands/remote/` como capa delgada y dejar `ssh/` como infraestructura**: es el estado actual y es arquitectónicamente correcto (separación infraestructura/adaptador), pero **no cumple el objetivo explícito de «tener solo uno»**. El usuario pide un único módulo.
- **Absorber `ssh/` dentro de `commands/remote/`**: deja la infraestructura SSH colgando de un módulo de comandos y obliga a `hosts/test_connection.rs` y `passkeys/export_public_key.rs` a depender de `commands/remote`, que es una dependencia inversa peor que la actual.
- **Borrar `run_ssh_command` y `normalize_output` dentro de un plan posterior**: ya se ha hecho antes del diseño por petición expresa; retrasarla habría mantenido avisos de compilación durante toda la implementación.

---

## 5. Conceptos

    - **Módulo SSH**: único propietario en Rust de conexión, sesión, ejecución y transferencias. Todas las funciones `#[tauri::command]` relacionadas con SSH viven en él.
    - **Adaptador Tauri**: función `#[tauri::command]` que traduce inputs/errores a `CommandResponse` + claves i18n, emite eventos por `Channel` y orquesta las llamadas a la capa SSH. Se traslada sin refactorizar.
    - **Primitiva de ejecución**: `run_command_streaming` (en `remote/exec.rs`, que pasa a `ssh/exec.rs`) — único bucle de lectura del canal SSH; concentra timeout, chunks, exit code, duración y cancelación.
    - **Cancelación**: `RemoteJobCancel` guarda un solo `CancellationToken` global; `CANCELLED_MSG` es el mensaje compartido por ejecución y transferencias.

---

## 6. Diseño técnico

### 6.1. Estructura resultante

```
src-tauri/src/
├── commands/
│   ├── database/  hosts/  passkeys/  stronghold.rs   ← sin cambios
│   └── mod.rs                                        ← sin módulo remote
└── ssh/                                              ← ÚNICO módulo SSH
    ├── mod.rs              ← mod + re-exports (superficie pública única)
    ├── cancel.rs           ← RemoteJobCancel + ssh_cancel_remote_job (con su re-export de CANCELLED_MSG)
    ├── connect.rs          ← connect_to_host_by_id, fetch_host_credentials (sin cambios)
    ├── exec.rs             ← ssh_execute_command + run_command_streaming (tal cual)
    ├── helpers.rs          ← open_command_channel, open_sftp_session, shell_escape (ya limpio)
    ├── session.rs          ← SshSession, credenciales, descifrado (sin cambios)
    ├── transfer.rs         ← utilidades SFTP (sin cambios)
    ├── transfer_commands.rs← ssh_upload_file / ssh_download_file (tal cual, sin modificar)
    └── types.rs            ← 7 tipos ts-rs (idénticos a los actuales)
```

`commands/remote/` se elimina por completo. `lib.rs` pasa a importar los cuatro comandos y el estado desde `crate::ssh`. Los tipos exportados desde Rust conservan **exactamente** sus nombres y forma (aunque cambie su ruta Rust), por lo que el frontend no necesita cambios de código por la unificación. La única diferencia prevista en `tauri-types.d.ts` es la desaparición de `HostSystemInfo`, ya migrado a `entities.ts` en la limpieza previa (§3.2).

> Nota de arquitectura: `AGENTS.backend.md §1` dice que los comandos viven en `commands/` y la infraestructura en la raíz del crate. Esta unificación es una **excepción documentada**: los comandos SSH pasan a `ssh/` por ser el dominio que se unifica. La excepción se reflejará en `AGENTS.backend.md` y `AGENTS.frontend.md` en el mismo trabajo (ver §8).

### 6.2. Traslado literal (sin cambios de comportamiento)

1. **Mover archivos**: `cancel.rs`, `exec.rs`, `transfer.rs` y `types.rs` de `commands/remote/` a `ssh/` (el `transfer.rs` de comandos pasa a `ssh/transfer_commands.rs` para no chocar con el `transfer.rs` de utilidades SFTP). Se copia el contenido **igual**: lógica, constantes, helpers privados, mensajes, claves i18n y orden de operaciones. La tabla §3.5 es el checklist a seguir.
2. **Ajustar solo rutas**: imports internos (`crate::ssh::...`), `ssh/mod.rs` (declarar los nuevos submódulos y los re-exports necesarios) y `lib.rs` (importar `RemoteJobCancel` y los cuatro comandos desde `crate::ssh`). El re-export de `CANCELLED_MSG` se mantiene tal cual.
3. **Registro de módulos y comandos**: último paso, según `AGENTS.backend.md §1` (conectar módulos y registrar en `lib.rs` siempre al final).
4. **Sin refactorizaciones**: no se extraen helpers compartidos, no se crea `open_sftp_for_host`, no se mueve la lectura base64, no se cambia la limpieza del token, no se toca el timeout y no se modifican los comandos de upload/download. Las duplicaciones de §3.3 se conservan.

> El único cambio funcional ya realizado es la limpieza de código sin uso (§3.2); la unificación en sí no añade ni quita comportamiento.

### 6.3. Flujo de una ejecución (sin cambios funcionales)

```
frontend invoke('ssh_execute_command')
  → ssh::exec::ssh_execute_command
      → token = CancellationToken::new(); state.register(&token)
      → ssh::connect::connect_to_host_by_id(..., enabled_only: true)
      → bash: CRLF del comando → LF; prefijo `cd <shell_escape(wd)> &&`
      → ssh::exec::run_command_streaming   (ensure_connected → open_command_channel → select![cancel | wait()])
          → Channel<RemoteConsoleEvent>: OutputChunk (~100 ms) / Finished(exit_code,duration) / Error
      → session.disconnect()
      → CommandResponse<RemoteCommandResult>
```

Las transferencias siguen el patrón actual: `connect_to_host_by_id` → `ensure_connected` → `open_sftp_session` → utilidades de `ssh/transfer.rs` → `disconnect`, sin extraer ese pipeline a una función nueva.

### 6.4. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Regresión en streaming o cancelación durante el traslado | Bloque 1 es un movimiento de archivos sin cambios de lógica; la verificación manual cubre ejecución, progreso y cancelación. |
| `export_public_key` o `test_connection` dejen de compilar al mover módulos | Son consumidores directos de `ssh/`; se comprueba su compilación y se conservan los re-exports actuales. |
| El `.d.ts` generado cambie de contenido | Los tipos exportados no cambian de nombre ni de campos; el único cambio es que desaparezca `HostSystemInfo` (ya en `entities.ts`). Ya regenerado y verificado el 2026-11-19. |
| Cambios en `src-tauri/` no se recargan en dev | Gotcha conocido: Vite ignora `src-tauri/`; hace falta rebuild explícito de Tauri para probar. |
| Concurrencia de jobs con un único token global | Limitación actual ya documentada; no se amplía el alcance. |

---

## 7. Bloques de implementación

    > Cada bloque fue un plan independiente. Creados el 2026-11-19 y archivados en `.agents/plans.done/`: `AGENTS.unificar-ssh-remote-traslado.PLAN.md` y `AGENTS.unificar-ssh-remote-cierre.PLAN.md`.

    1. **Bloque 1 — Traslado literal**: mover `cancel.rs`, `exec.rs`, `transfer.rs` (como `transfer_commands.rs`) y `types.rs` a `ssh/`; ajustar imports internos, `ssh/mod.rs` y `lib.rs`; eliminar `commands/remote/`. Sin refactorizaciones ni cambios de comportamiento; cada símbolo de §3.5 queda donde indica la tabla. Actualizar rutas en `AGENTS*.md`.
    2. **Bloque 2 — Verificación y cierre**: regenerar `tauri-types.d.ts` y comprobar que el único cambio es la desaparición de `HostSystemInfo` (§3.2); recorrer la tabla §3.5 ítem por ítem como checklist de no regresión; revisar `docs/content/` por referencias a rutas internas; verificación final (§9).

    > No hay bloques de consolidación ni de cambios de comportamiento: esas ideas están en §10 como futuras fases que requieren aprobación explícita.

---

## 8. Documentación a actualizar

| Documento | Cambio previsto |
| --- | --- |
| `AGENTS.backend.md` §1 | Quitar `commands/remote/` del árbol; documentar los submódulos nuevos de `ssh/` y la excepción «comandos SSH en `ssh/`». |
| `AGENTS.backend.md` §5 | Actualizar las rutas de la consola remota (`commands/remote/*` → `ssh/*`). |
| `AGENTS.backend.md` §1 (nota tras el árbol) | **Ya hecho (2026-11-18):** `HostSystemInfo` ya no se genera desde Rust; solo `AuthType` sigue en la lista de tipos ts-rs. |
| `AGENTS.frontend.md` §6 | Actualizar la referencia `commands/remote/` → `ssh/` en el apartado de consola remota. |
| `AGENTS.frontend.md` §3 (tipos) | **Ya hecho (2026-11-18):** `HostSystemInfo` añadido a los tipos manuales de `entities.ts` y quitado de los exportados desde Rust. |
| `AGENTS.md` (gotchas) | Solo si la unificación introduce alguna regla nueva; no está previsto. |
| `docs/content/` | Revisar si alguna página menciona rutas internas de Rust (no se espera: la documentación es de usuario). |

---

## 9. Verificación prevista

    > Orientativa. La verificación la hace el usuario.

    - No queda `commands/remote/` en el árbol de fuentes y no hay referencias a él en `src-tauri/src/`.
    - Compilación de Rust sin los cuatro avisos originales (los ya corregidos y los que pudiera introducir el traslado).
    - `cargo test export_bindings`: en `src/types/tauri-types.d.ts` desaparece `HostSystemInfo` y el resto de tipos siguen igual; el frontend compila usando el tipo desde `entities.ts`.
    - Consola remota: ejecutar un comando con output continuo (ver chunks en vivo), uno que falle (ver `exit_code != 0`), cancelar uno largo, subir archivo, subir directorio, descargar a disco, descargar sin `local_path` (base64).
    - Test de conexión desde un host (incluido uno deshabilitado, que usa `enabled_only: false`).
    - `export_public_key` sigue funcionando (usa la capa SSH de forma directa).

---

## 10. Notas del usuario aplicadas y futuras fases

El diseño fue **aprobado** el 2026-11-19 y pasado a **Implementado** el mismo día. Las notas del usuario están aplicadas, los planes derivados están archivados en `.agents/plans.done/` y no queda ninguna decisión funcional pendiente.

| Nota del usuario | Decisión aplicada |
| --- | --- |
| «`commands/remote/` tiene que desaparecer y vivir en `ssh/`.» | Cerrado: el módulo se elimina y sus cuatro comandos, tipos y estado pasan a `ssh/` (§6.1). |
| «Descartarlo, si ya lo hace el frontend, es duplicar el trabajo.» | Cerrado: `normalize_output` queda descartado definitivamente (ya eliminado en §3.2); no se porta a Rust. |
| «en cuanto a los comandos de upload y download estos solo portalos a `ssh/` pero no los modifiques, ya que por ahora subir y bajar archivos será necesario para cuando se haga el deploy ahora mismo no se puede hacer deploy.» | Cerrado: `ssh_upload_file` y `ssh_download_file` se copian tal cual (§6.2 y §3.5); sin tocar `recursive`, el buffer base64, los mensajes ni las claves i18n. |
| Regla global: «no quiero que se queden funciones fuera o que cambie su comportamiento». | Cerrado: §3.5 es el checklist de no regresión; §3.3 se documenta pero no se consolida; se mantienen timeout, defaults, eventos y orden de operaciones. |

**Decisiones por no regresión** (antes eran puntos abiertos, ahora se mantienen sin cambios salvo lo abordado en la serie `ssh-mejoras`):

- **Timeout de ejecución**: se conservó el actual por `wait()` durante el traslado literal; el plan 2/4 lo sustituyó por un timeout total del bucle que reutiliza `timeout_secs` (decisión de Iván del 2026-11-19, cerrado).
- **`Finished.exit_code` en transferencias**: se mantuvo fijo en `0` durante el traslado literal; el plan 3/4 lo sustituyó por un evento `Finished { status, exit_code, duration_seconds, message }` emitido en todos los casos terminales, con `recursive: Some(false)` tratado como archivo simple en upload (decisiones de Iván del 2026-11-19, cerrado).

Futuras fases (no incluidas; requieren aprobación explícita porque cambiarían el comportamiento):

- ~~Sustituir el timeout por `wait()` por un timeout total del bucle de ejecución.~~ (plan 2/4, cerrado)
- ~~Respetar `recursive: Some(false)` en upload usando `upload_single_file`.~~ (plan 3/4, cerrado)
- ~~Cambiar la semántica de `Finished.exit_code` en transferencias.~~ (plan 3/4, cerrado)
- ~~Consolidar las duplicaciones de §3.3 (helpers de eventos, pipeline SFTP, token de cancelación, lectura base64).~~ (plan 4/4, cerrado: eventos/pipeline consolidados; token ya cubierto por 2/3; base64/CANCELLED_MSG sin unificación adicional por semántica/compatibilidad)
- ~~Revisar el triple timeout anidado de conexión (15 s en `connect.rs`, 15 s en `session.rs`, 10 s en `test_connection.rs`).~~ (plan 1/4, cerrado)
- ~~Revisar `check_server_key` (hoy acepta cualquier clave del servidor).~~ (plan 1/4, cerrado)
- ~~Mejorar la cancelación para soportar varios jobs simultáneos.~~ (plan 2/4, cerrado)

El 2026-11-19, a petición del usuario, estas siete mejoras se repartieron en la **serie `ssh-mejoras`**, con cuatro planes en **Planificando** y orden de ejecución: `AGENTS.ssh-mejoras-conexion.PLAN.md` (1/4, mejoras 5 y 6), `AGENTS.ssh-mejoras-ejecucion.PLAN.md` (2/4, mejoras 1 y 7), `AGENTS.ssh-mejoras-transferencias.PLAN.md` (3/4, mejoras 2 y 3) y `AGENTS.ssh-mejoras-duplicaciones.PLAN.md` (4/4, mejora 4; depende de los tres anteriores). Ninguno se ejecuta sin que el usuario lo pase a **Pendiente**. El 2026-11-19 Iván resolvió la política de clave del servidor del plan 1/4: **huella por host guardada en BD y confirmada desde el formulario de hosts** (con migración). El resto de decisiones de semántica no definidas siguen como puntos abiertos en cada plan.

El 2026-11-19, al autorizar la implementación del plan 1/4, Iván fijó además: **una sola constante de timeout** (15 s) reportada por `ssh/`, **todas las claves i18n bajo `tauri.ssh.*`** (incluidas `authorized_keys`) y **huella `SHA256:<base64>` con reconfirmación manual** ante un cambio legítimo de clave. Las mejoras 5 y 6 y las dos notas de Iván quedan así reflejadas en `AGENTS.ssh-mejoras-conexion.PLAN.md`, que pasó a **Ejecutando** y fue cerrado el mismo día.

El 2026-11-19, al autorizar el plan 2/4, Iván fijó: **timeout total** reutilizando `timeout_secs` (300 s, sin parámetro nuevo), **`job_id` generado en Rust** (`AtomicU64`, sin dependencias nuevas) y emitido como evento `started` por el Channel al registrar el token, y **cancelación por id** (`ssh_cancel_remote_job(job_id?: number)`, sin id cancela el último job). Las mejoras 1 y 7 quedaron reflejadas en `AGENTS.ssh-mejoras-ejecucion.PLAN.md`, cerrado el mismo día.

El 2026-11-19, al autorizar el plan 3/4, Iván fijó: **`Finished` con estado real** `{ status: "success"|"error"|"cancelled", exit_code, duration_seconds, message }` emitido en todos los casos terminales, manteniendo el evento `error` por compatibilidad y evitando redundancia visible en la UI; y **`recursive: Some(false)` en upload** tratado como archivo simple (`upload_single_file`), coherente con download. Las mejoras 2 y 3 quedan reflejadas en `AGENTS.ssh-mejoras-transferencias.PLAN.md`, cerrado el mismo día.
