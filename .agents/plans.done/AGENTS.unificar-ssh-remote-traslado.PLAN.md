# Plan: Unificar SSH y remote — traslado literal a `ssh/`

## Estado

**Terminado** — el usuario lo dio por completado el 2026-11-19 y pidió pasar al plan de cierre.

**Diseño de origen:** `.agents/designs/AGENTS.unificar-ssh-remote.DESIGN.md`

---

## Instrucciones dadas (verbatim)

> "Crea el plan para este diseño."
>
> "No quiero que se queden funciones fuera o que cambie su comportamiento."
>
> "`commands/remote/` tiene que desaparecer y vivir en `ssh/`."
>
> "Descartarlo, si ya lo hace el frontend, es duplicar el trabajo."
>
> "en cuanto a los comandos de upload y download estos solo portalos a  `ssh/` pero no los modifiques, ya que por ahora subir y bajar archivos será necesario para cuando se haga el deploy ahora mismo no se puede hacer deploy."

Contexto aportado por el agente (análisis previo):

- Diseño aprobado por el usuario el 2026-11-19. Corresponde al **Bloque 1 — Traslado literal** de su §7.
- La tarea original y el inventario completo están en §1 y §3.5 del diseño. La tabla §3.5 es el checklist de no regresión: cada símbolo (funciones públicas y privadas, structs, constantes, re-exports y registro) debe aparecer en su columna «Destino».
- Las duplicaciones de §3.3 se documentan, pero **no se consolidan**; las ideas de cambio de comportamiento quedan como futuras fases en §10 del diseño.
- Estado verificado hoy: `src-tauri/src/commands/remote/` tiene 5 archivos (`cancel.rs`, `exec.rs`, `mod.rs`, `transfer.rs`, `types.rs`); `src-tauri/src/ssh/` tiene 5 (`connect.rs`, `helpers.rs`, `mod.rs`, `session.rs`, `transfer.rs`).
- `src-tauri/src/lib.rs:14-16` importa desde `commands::remote`, `:29` registra `.manage(RemoteJobCancel::default())` y `:58-61` registra los cuatro comandos en `invoke_handler!`. `src-tauri/src/commands/mod.rs:4` declara `pub mod remote;`.

---

## Objetivo

Dejar `ssh/` como **único módulo SSH**, con todo el contenido de `commands/remote/` reubicado en él y con el mismo comportamiento que hoy. Se ajustan únicamente las rutas de import, los re-exports y el registro; no se refactoriza, no se unifican duplicaciones y no se tocan los comandos de upload/download.

**No entra en este plan:** cambios de contrato con el frontend (nombres de comandos, eventos o tipos ts-rs), timeout total, `recursive: Some(false)` en upload, semántica nueva de `Finished.exit_code`, limpieza del token de cancelación ni consolidación de helpers. Tampoco se ejecuta ninguna verificación: eso se recoge en el plan de cierre.

---

## Contexto técnico actual

- `commands/remote/exec.rs`: `ssh_execute_command` + `run_command_streaming` (streaming por `Channel`, chunks ~100 ms, timeout por `wait()`, `exit_code = -1` inicial, cancelación reactiva) y los helpers privados `emit_chunk`, `emit_error`, `emit_finished`, `err_response`.
- `commands/remote/transfer.rs`: `ssh_upload_file` y `ssh_download_file` (SFTP, `overwrite`, `chmod`, `recursive`, rama base64 de 256 KB, `Finished.exit_code = 0`) y los helpers privados `emit_error`, `emit_finished`, `err_response`.
- `commands/remote/cancel.rs`: `RemoteJobCancel` (un único `CancellationToken` global), `ssh_cancel_remote_job` y el re-export `pub use crate::ssh::transfer::CANCELLED_MSG`.
- `commands/remote/types.rs`: los 7 tipos ts-rs (`RemoteCommandInput`, `RemoteUploadInput`, `RemoteDownloadInput`, `RemoteCommandResult`, `RemoteTransferResult`, `RemoteDownloadResult`, `RemoteConsoleEvent`).
- `commands/remote/mod.rs`: declara los cuatro submódulos y re-exporta los cuatro comandos y el estado.
- La capa `ssh/` (`connect.rs`, `session.rs`, `helpers.rs`, `transfer.rs`) no se modifica: solo pasa a contener los nuevos submódulos y a re-exportar su superficie pública.
- Consumidores que deben seguir funcionando sin tocar su código: `commands/hosts/test_connection.rs:7` y `commands/passkeys/export_public_key.rs:15-18` usan `crate::ssh::...`; el frontend usa `useRemoteCommand` y `utils/commands/runner.ts` con los mismos cuatro nombres de comando.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-19 | El usuario aprueba el diseño al pedir la creación de los planes; se crean dos planes según §7. |
| 2026-11-19 | `commands/remote/` desaparece; su contenido pasa a `ssh/` (decisión del usuario). |
| 2026-11-19 | `normalize_output` queda descartado (decisión del usuario: el frontend ya lo hace). |
| 2026-11-19 | Upload/download se copian sin modificar (decisión del usuario: necesarios para el futuro deploy). |
| 2026-11-19 | Traslado literal: sin refactorizaciones ni cambios de comportamiento. Se mantienen timeout por `wait()`, `Finished.exit_code = 0`, defaults, claves i18n, eventos y orden de operaciones. |

**Alternativas descartadas:** conservar `commands/remote/` como capa delgada (no cumple «tener solo uno»); absorber `ssh/` dentro de `commands/remote/` (dependencia inversa desde `test_connection`/`export_public_key`); consolidar los helpers duplicados de §3.3 o crear `open_sftp_for_host` (cambiarían el orden de operaciones o la semántica de errores).

---

## Problemas y riesgos encontrados

### P1 — Colisión de nombres `transfer.rs`

- `commands/remote/transfer.rs` (adaptadores Tauri) y `ssh/transfer.rs` (utilidades SFTP) no pueden convivir con el mismo nombre.
- **→ Riesgo BAJO.** Copiar los adaptadores como `ssh/transfer_commands.rs`, manteniendo su contenido íntegro y su imports `crate::ssh::transfer::{self as transfer_utils, ...}`.

### P2 — Superficie pública y visibilidad

- `lib.rs` importa desde `commands::remote`; `export_public_key.rs` y `test_connection.rs` importan desde `crate::ssh`. Si los nuevos submódulos o re-exports no se declaran, el crate no compila.
- **→ Riesgo MEDIO.** En `ssh/mod.rs` declarar los cuatro submódulos y re-exportar `ssh_cancel_remote_job`, `RemoteJobCancel`, `ssh_execute_command`, `ssh_upload_file` y `ssh_download_file`, reproduciendo exactamente lo que hoy expone `commands/remote/mod.rs`. Dejar `mod.rs` y `lib.rs` para el último paso, según `AGENTS.backend.md §1`.

### P3 — Pérdida accidental de comportamiento al «limpiar» al trasladar

- La tentación de unificar `emit_error`/`err_response` o el pipeline `connect → ensure_connected → open_sftp_session` cambiaría mensajes, claves i18n o semántica de error.
- **→ Riesgo ALTO.** No editar la lógica: comparar cada archivo copiado con su original y contrastarlo con la columna «Conservar exactamente» de §3.5. El re-export de `CANCELLED_MSG` se mantiene tal cual.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Copiar los archivos a `ssh/`

1. Crear `src-tauri/src/ssh/cancel.rs` con el contenido exacto de `commands/remote/cancel.rs`.
2. Crear `src-tauri/src/ssh/exec.rs` con el contenido exacto de `commands/remote/exec.rs`.
3. Crear `src-tauri/src/ssh/transfer_commands.rs` con el contenido exacto de `commands/remote/transfer.rs` (solo cambia el nombre de archivo).
4. Crear `src-tauri/src/ssh/types.rs` con el contenido exacto de `commands/remote/types.rs`, conservando los cinco atributos `#[ts(export, export_to = "tauri-types.d.ts")]` de los 7 tipos.
5. No crear helpers nuevos, no extraer funciones y no alterar constantes, mensajes ni orden de operaciones.

### Fase 2 — Ajustar rutas de import de los archivos copiados

1. En `ssh/exec.rs`: `super::cancel` → `crate::ssh::cancel`, `super::types` → `crate::ssh::types`. El `use crate::ssh::{connect_to_host_by_id, open_command_channel, shell_escape, SshSession}` permanece igual.
2. En `ssh/transfer_commands.rs`: `super::cancel` → `crate::ssh::cancel`, `super::types` → `crate::ssh::types`. Se mantienen `crate::ssh::transfer::{self as transfer_utils, SFTP_BUFFER_SIZE, TransferResult}` y `crate::ssh::{connect_to_host_by_id, open_sftp_session}`.
3. En `ssh/cancel.rs`: mantener `pub use crate::ssh::transfer::CANCELLED_MSG;` sin cambios.
4. En `ssh/types.rs`: sin ajustes (no tiene imports internos).

### Fase 3 — Documentación de rutas

1. `AGENTS.backend.md §1`: quitar `commands/remote/` del árbol, añadir los cuatro submódulos nuevos bajo `ssh/` y documentar la excepción «comandos SSH en `ssh/`».
2. `AGENTS.backend.md §5`: cambiar el encabezado y las rutas `commands/remote/*` → `ssh/*` (los nombres de comando y comportamientos siguen igual).
3. `AGENTS.frontend.md §6`: cambiar la referencia `commands/remote/` → `ssh/`.
4. Revisar que no queden referencias a `commands/remote/` en `AGENTS*.md` (los changelogs de `docs/content/` son históricos y no se editan).

### Fase 4 — Conectar módulos y registrar (último paso)

1. Eliminar `pub mod remote;` de `src-tauri/src/commands/mod.rs`.
2. En `src-tauri/src/ssh/mod.rs`: declarar `pub mod cancel;`, `pub mod exec;`, `pub mod transfer_commands;`, `pub mod types;` y añadir los re-exports de la antigua `commands/remote/mod.rs`, manteniendo los actuales de `connect`, `helpers`, `session` y `transfer`.
3. En `src-tauri/src/lib.rs:14-16`: cambiar `use commands::remote::{...}` por `use ssh::{...}` (mismos cinco símbolos). No tocar `.manage(RemoteJobCancel::default())` ni las cuatro entradas de `invoke_handler!`.
4. Eliminar el directorio `src-tauri/src/commands/remote/` completo.
5. Comprobar con búsqueda de texto que no queda ninguna referencia a `commands::remote` ni a `commands/remote/` en `src-tauri/src/`.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src-tauri/src/ssh/cancel.rs` | Nuevo; copia literal de `commands/remote/cancel.rs`. |
| `src-tauri/src/ssh/exec.rs` | Nuevo; copia literal de `commands/remote/exec.rs` con imports ajustados. |
| `src-tauri/src/ssh/transfer_commands.rs` | Nuevo; copia literal de `commands/remote/transfer.rs` con imports ajustados. **Sin modificar la lógica.** |
| `src-tauri/src/ssh/types.rs` | Nuevo; copia literal de `commands/remote/types.rs`. |
| `src-tauri/src/ssh/mod.rs` | Declarar los cuatro submódulos y re-exportar su superficie pública. |
| `src-tauri/src/commands/remote/{cancel,exec,transfer,types,mod}.rs` | Eliminados junto con el directorio. |
| `src-tauri/src/commands/mod.rs` | Quitar `pub mod remote;`. |
| `src-tauri/src/lib.rs` | Cambiar solo la ruta del `use` de los cinco símbolos. |
| `AGENTS.backend.md` | Árbol, §5 y excepción «comandos SSH en `ssh/`». |
| `AGENTS.frontend.md` | Referencia de consola remota en §6. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa. Aquí solo van los pasos funcionales.

1. Ejecutar un comando en la consola remota con output continuo: se ven chunks en vivo y el evento `finished` con su `exit_code` y duración.
2. Ejecutar un comando que falle: `success: true`, `data.exit_code != 0` y clave `tauri.remote.exec.completed_with_errors`.
3. Cancelar un comando largo: se emite el evento `error` con el mensaje de cancelación y la respuesta usa `tauri.remote.errors.cancelled`.
4. Subir un archivo, subir un directorio con `recursive: true`, descargar a disco y descargar sin `local_path` (base64). Comprobar progreso y `Finished.exit_code = 0` como hoy.
5. Test de conexión desde un host (incluido uno deshabilitado, `enabled_only: false`).
6. Exportar clave pública a un host (`export_public_key` usa la capa SSH directamente).

---

## Criterios de aceptación

- [ ] `src-tauri/src/commands/remote/` no existe y no hay referencias a él en `src-tauri/src/`.
- [ ] Cada símbolo del inventario §3.5 aparece en su columna «Destino»; ninguna función, struct, constante, helper privado ni re-export se ha quedado fuera.
- [ ] Los cinco símbolos importados en `lib.rs` y los cuatro nombres de `invoke_handler!` son idénticos a los actuales.
- [ ] No hay cambios de comportamiento: mismos defaults, timeout por `wait()`, `Finished.exit_code = 0`, claves `tauri.remote.*`, eventos y orden de operaciones.
- [ ] `ssh_upload_file` y `ssh_download_file` están sin modificar salvo la ruta del import.
- [ ] `test_connection` y `export_public_key` siguen compilando y funcionando sin cambios en su código.
- [ ] `AGENTS*.md` ya no describen `commands/remote/` como módulo activo.

### Desviaciones

- En `lib.rs` se ha usado `use crate::ssh::{...}` en lugar de `use ssh::{...}` para evitar ambigüedad con posibles crates externos y seguir el patrón del resto del crate. Los cinco símbolos importados y las cuatro entradas de `invoke_handler!` son idénticos a los planificados; no hay cambio de comportamiento.

---

## Puntos abiertos

1. Ninguno. Las propuestas de cambio de comportamiento quedan recogidas como futuras fases en §10 del diseño y requieren aprobación explícita.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-19 | Plan creado en estado **Planificando** a partir del diseño aprobado. |
| 2026-11-19 | El usuario autoriza la ejecución; plan pasado a **Pendiente** y, al empezar, a **Ejecutando**. |
| 2026-11-19 | Fase 1 completada: los cuatro archivos se copiaron a `ssh/` y se verificó su hash SHA256 idéntico al original. |
| 2026-11-19 | Fase 2 completada: solo se ajustaron los `use` de `super::cancel`/`super::types` en `exec.rs` y `transfer_commands.rs`; el resto de cada archivo es byte a byte igual al original. |
| 2026-11-19 | Fase 3 completada: `AGENTS.backend.md` y `AGENTS.frontend.md` actualizados con el nuevo árbol y la excepción. |
| 2026-11-19 | Fase 4 completada: módulos conectados en `ssh/mod.rs`, `commands/mod.rs` y `lib.rs`; `commands/remote/` eliminado; búsqueda sin referencias residuales en `src-tauri/src/`. |
| 2026-11-19 | El usuario da el plan por terminado y pide pasar al plan de cierre; se archiva y registra en `.agents/AGENTS.done.md`. |
