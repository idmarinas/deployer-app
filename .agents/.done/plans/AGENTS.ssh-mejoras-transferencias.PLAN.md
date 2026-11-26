# Plan: Mejoras futuras de SSH (3/4) — `recursive` y `Finished.exit_code`

## Estado

**Terminado** — el usuario confirmó el 2026-11-19 que todo es correcto y dio el plan por completado. Decisiones aplicadas: estado explícito en `Finished`, evento `error` mantenido por compatibilidad evitando redundancia visible, y `recursive: Some(false)` tratado como archivo simple.

**Diseño de origen:** `.agents/designs/AGENTS.unificar-ssh-remote.DESIGN.md`. Corresponde a las mejoras 2 y 3 de la sección §10 del diseño.

**Serie:** ssh-mejoras — plan 3 de 4. Hermanos: `AGENTS.ssh-mejoras-conexion.PLAN.md`, `AGENTS.ssh-mejoras-ejecucion.PLAN.md`, `AGENTS.ssh-mejoras-transferencias.PLAN.md`, `AGENTS.ssh-mejoras-duplicaciones.PLAN.md`.

**Dependencia:** ninguna.

**Orden de ejecución:** 3 de 4. Aísla los cambios de transferencias antes de consolidar helpers en el plan 4.

---

## Instrucciones dadas (verbatim)

> "Crea el plan para eso que quedó pendiente del diseño."

Contexto aportado por el agente (análisis previo):

- El usuario eligió **«Varios planes por bloque»**; este es el bloque de **transferencias SFTP**.
- §10 advierte: *«Futuras fases (no incluidas; requieren aprobación explícita porque cambiarían el comportamiento)»*. El usuario pidió planes, no su ejecución; la semántica nueva sigue sin definir y queda en Puntos abiertos.
- Código verificado: `ssh/transfer_commands.rs:66` hace `let force_dir = input.recursive.unwrap_or(false);` y en `:77-100` solo distingue `upload_dir` frente a `upload` (autodetección), por lo que `Some(false)` y `None` siguen el mismo camino. En download (`:190-224`) sí se distinguen los tres estados.
- `emit_finished` (`ssh/transfer_commands.rs:311-316`) emite siempre `exit_code: 0`. El frontend guarda ese valor en `lastExitCode` (`useRemoteCommand.ts:57-58`), lo muestra en `RemoteOutput.vue:39` y comprueba el `exit_code` del **resultado** en `RemoteCommand.vue:54`.

---

## Objetivo

Hacer que `recursive: Some(false)` en upload signifique explícitamente «archivo simple» y definir una semántica nueva para `Finished.exit_code` en transferencias, conservando el resto del pipeline SFTP.

**No entra en este plan:** cambiar `overwrite`, `chmod`, el buffer base64 de 256 KB, las claves i18n `tauri.remote.*`, el timeout de conexión, la cancelación multi-job ni la consolidación de helpers ( otros planes). No se ejecuta nada hasta que el usuario lo pase a **Pendiente**.

---

## Contexto técnico actual

- `ssh_upload_file`: `Some(true)` → `upload_dir`; `None`/`Some(false)` → `upload` (autodetección por `src.is_dir()` en `ssh/transfer.rs`).
- `ssh_download_file`: `Some(true)` → `download_dir`; `Some(false)` → `download_single_file`; `None` → `download` (autodetección por `sftp.read_dir(src).is_ok()`).
- `emit_finished(&channel, duration_seconds)` en transferencias emite `Finished { exit_code: 0, duration_seconds }`, a diferencia de `exec.rs`, que emite el código real del proceso remoto.
- Los errores de transporte no emiten `Finished`: emiten `Error` y devuelven `CommandResponse::err`. Por tanto, hoy `Finished` Solo significa «terminó con éxito».
- El frontend ya distingue el `exit_code` del evento (para la consola) del `exit_code` del resultado (para el comando); cualquier cambio debe mantener esa distinción o ajustarla de forma explícita.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-19 | El usuario pide planes separados por bloque; este agrupa las mejoras 2 y 3 de §10. |
| 2026-11-19 | Iván autoriza ejecutar el plan 3/4. |
| 2026-11-19 | **`Finished`**: se amplía a `{ status: "success" | "error" | "cancelled", exit_code, duration_seconds, message }` y se emite en todos los casos terminales. Éxito: `status=success`, `exit_code=0`, `message=null`. Error/cancelación: `status` acorde, `message` con el detalle y `exit_code` distinto de éxito; se mantiene el evento `error` por compatibilidad y el frontend evita redundancia visible. |
| 2026-11-19 | **`recursive: Some(false)` en upload**: se trata como archivo simple (`upload_single_file`), coherente con download; si la ruta es un directorio fallará la transferencia. |

**Alternativas descartadas:** seguir usando `unwrap_or(false)` para los tres estados (impide expresar «force file»); dejar `exit_code: 0` fijo (es precisamente lo que §10 propone revisar); cambiar el evento `finished` por uno nuevo (rompería el frontend sin necesidad).

---

## Problemas y riesgos encontrados

### P1 — `Some(false)` hoy depende de la autodetección

- Un error al pasar `Some(false)` con un directorio: hoy se sube el directorio completo; después se intentaría `upload_single_file` y fallaría.
- **→ Riesgo ALTO.** Confirmar en Fase 1 si se quiere error explícito o silencioso, y verificarlo con un directorio real.

### P2 — Semántica de `Finished.exit_code` sin definir

- §10 pide «cambiar la semántica» pero no dice cuál. Elegir una sin aprobación sería inventar una decisión de producto.
- **→ Riesgo ALTO.** Resolver el punto abierto 1 antes de tocar `emit_finished`; documentar el significado nuevo en `AGENTS.backend.md` y en el frontend.

### P3 — Consumidores del frontend

- `RemoteOutput.vue` muestra `lastExitCode` y `RemoteCommand.vue` compara el `exit_code` del resultado. Un cambio del evento podría mostrar información contradictoria.
- **→ Riesgo MEDIO.** Ajustar `useRemoteCommand.ts` y los componentes en la misma fase, y verificar consola y transferencias por separado.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Fijar la semántica (resuelta el 2026-11-19)

1. `Finished` representa el estado real: `{ status, exit_code, duration_seconds, message }`, emitido en todos los casos terminales. Se mantiene el evento `error` por compatibilidad (misma información en fallo/cancelación) evitando redundancia visible en la UI.
2. `recursive: Some(false)` en upload fuerza archivo simple (`upload_single_file`), igual que download.
3. Decisiones registradas en la tabla «Decisiones» antes de tocar código.

### Fase 2 — Respetar `recursive: Some(false)`

1. En `ssh_upload_file`, pasar de un `bool` a los tres estados: `Some(true)` → `upload_dir`, `Some(false)` → `upload_single_file`, `None` → `upload`.
2. No modificar `ssh/transfer.rs::upload_single_file` salvo que la decisión de Fase 1 lo exija; conservar `overwrite`, `chmod` y mensajes de progreso.
3. Mantener el pipeline `connect → ensure_connected → open_sftp_session` y el orden de desconexión.

### Fase 3 — Nueva semántica de `Finished.exit_code`

1. Cambiar `emit_finished` para aceptar el código según lo decidido, sin alterar `duration_seconds`.
2. Ajustar `useRemoteCommand.ts`, `RemoteOutput.vue` y `RemoteCommand.vue` para consumir el nuevo significado sin confundir evento y resultado.
3. Regenerar `tauri-types.d.ts` si el tipo del evento cambia (paso manual; no editar a mano).

### Fase 4 — Documentación

1. Actualizar `AGENTS.backend.md §5` y `AGENTS.frontend.md §6` con los tres estados de `recursive` y el significado de `Finished.exit_code`.
2. Actualizar la decisión de no regresión de §10 del diseño para reflejar ambos cambios.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src-tauri/src/ssh/transfer_commands.rs` | Tres estados de `recursive` en upload; nuevo `emit_finished`. |
| `src-tauri/src/ssh/transfer.rs` | Solo si la decisión de Fase 1 obliga a tocar `upload_single_file`. |
| `src-tauri/src/ssh/types.rs` | Solo si cambia el tipo del evento `Finished`. |
| `src/composables/useRemoteCommand.ts` | Consumo del nuevo `exit_code` del evento. |
| `src/components/remote/RemoteOutput.vue` | Presentación del código de salida de transferencias. |
| `src/components/remote/RemoteCommand.vue` | Comparación entre código del evento y del resultado, si aplica. |
| `src/types/tauri-types.d.ts` | Regenerado; no editar a mano. |
| `AGENTS.backend.md` / `AGENTS.frontend.md` | Semántica de `recursive` y `Finished.exit_code`. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Subir un archivo con `recursive: Some(false)`: se sube solo ese archivo.
2. Subir un directorio con `Some(false)`: se produce el comportamiento decidido en Fase 1.
3. Subir con `None` y con `Some(true)`: se mantiene la autodetección y la recursividad actuales.
4. Descargar con los tres estados: sin cambios respecto a hoy.
5. Transferencia correcta, cancelada y fallida: comprobar el evento `finished` y lo que muestra la consola.

---

## Criterios de aceptación

- [x] `Some(false)` en upload ya no cae en la autodetección.
- [x] La semántica de `Finished` (estado real) está decidida, documentada y aplicada de forma coherente en Rust y frontend.
- [x] Se conservan `overwrite`, `chmod`, progreso, base64, cancelación y claves i18n.
- [x] No se ha tocado el pipeline de conexión ni los timeouts.
- [x] `tauri-types.d.ts` regenerado por el usuario y verificación manual completada.

### Desviaciones

- `Finished` pasó de `{ exit_code, duration_seconds }` a `{ status, exit_code, duration_seconds, message }` y se emite en todos los casos terminales (incluidos fallos/cancelaciones de transferencia), manteniendo el evento `error` por compatibilidad. `ssh_execute_command` se adaptó al nuevo shape emitiendo `finished` de éxito con el `exit_code` real del proceso, sin cambiar su semántica de respuesta.
- En upload, `recursive: Some(false)` llama a `upload_single_file` directamente (consistente con download); si la ruta es un directorio, la transferencia falla al intentar leerlo como archivo.
- Para evitar redundancia visible, el frontend conserva el mensaje desde `error` y solo usa `finished.message` si aún no hay mensaje.
- No se regeneró `src/types/tauri-types.d.ts` ni se ejecutaron `cargo check`, `vue-tsc` ni `bun run build`: quedan para la verificación manual del usuario.

---

## Puntos abiertos

Ninguno. Las decisiones de Fase 1 se fijaron el 2026-11-19 al autorizar la ejecución (tabla «Decisiones»).

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-19 | Plan creado en estado **Planificando** a partir de §10 del diseño, según la agrupación elegida por el usuario. |
| 2026-11-19 | Iván pidió continuar con el plan 3/4, fijó las decisiones de Fase 1 (estado explícito en `Finished`, compatibilidad de `error`, `recursive: Some(false)` como archivo) y autorizó la ejecución; el plan pasa a **Ejecutando**. |
| 2026-11-19 | Implementados los tres estados de `recursive` en upload, el nuevo evento `Finished` en Rust/transferencias/ejecución y la adaptación de `useRemoteCommand.ts`. |
| 2026-11-19 | Actualizados `AGENTS.backend.md`, `AGENTS.frontend.md` y §10 del diseño; pendiente la verificación manual del usuario y la regeneración de bindings. |
| 2026-11-19 | El usuario confirmó la verificación y pidió pasar al plan 4/4; el plan se marca **Terminado** y se archiva. |
