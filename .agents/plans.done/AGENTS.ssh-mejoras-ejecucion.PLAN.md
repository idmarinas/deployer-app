# Plan: Mejoras futuras de SSH (2/4) — Timeout total y cancelación de varios jobs

## Estado

**Terminado** — el usuario confirmó el 2026-11-19 que todo es correcto y dio el plan por completado. Decisiones aplicadas: timeout total con `timeout_secs`, `job_id` generado en Rust y emitido como evento `started`, y cancelación del último job cuando no se pasa id.

**Diseño de origen:** `.agents/designs/AGENTS.unificar-ssh-remote.DESIGN.md`. Corresponde a las mejoras 1 y 7 de la sección §10 del diseño.

**Serie:** ssh-mejoras — plan 2 de 4. Hermanos: `AGENTS.ssh-mejoras-conexion.PLAN.md`, `AGENTS.ssh-mejoras-ejecucion.PLAN.md`, `AGENTS.ssh-mejoras-transferencias.PLAN.md`, `AGENTS.ssh-mejoras-duplicaciones.PLAN.md`.

**Dependencia:** ninguna.

**Orden de ejecución:** 2 de 4. Aísla los cambios de `exec.rs` y `cancel.rs` antes de consolidar helpers en el plan 4.

---

## Instrucciones dadas (verbatim)

> "Crea el plan para eso que quedó pendiente del diseño."

Contexto aportado por el agente (análisis previo):

- El usuario eligió **«Varios planes por bloque»** al preguntarle cómo agrupar las 7 mejoras de §10; este es el bloque de **ejecución y cancelación**.
- §10 advierte: *«Futuras fases (no incluidas; requieren aprobación explícita porque cambiarían el comportamiento)»*. Las dos mejoras de este plan están ahí.
- La decisión de no regresión del diseño dice hoy: *«Timeout de ejecución: se conserva el actual por `wait()`, que se reinicia con cada mensaje. No se cambia a timeout total»* y *«Cancelación: un único token global; el frontend serializa los jobs»*.
- Código verificado: `ssh/exec.rs:129` aplica `tokio::time::timeout(...)` a cada `ssh_channel.wait()` dentro del `select!`, por lo que el reloj se reinicia con cada mensaje. `ssh/cancel.rs:18-34` guarda `Mutex<Option<CancellationToken>>`: `register` reemplaza el token y `cancel` hace `take()`; `ssh_cancel_remote_job` no acepta argumentos. Los tres comandos registran su token (`exec.rs:39-40`, `transfer_commands.rs:33-34` y `:142-143`).

---

## Objetivo

Sustituir el timeout por mensaje por un **timeout total** del bucle de ejecución y permitir **cancelar jobs concretos** en lugar de un único token global.

**No entra en este plan:** cambiar la semántica de `success`/`exit_code` de `ssh_execute_command`, tocar las transferencias SFTP (otro plan), cambiar los timeouts de conexión (otro plan) ni consolidar duplicaciones (otro plan). Tampoco se ejecuta nada: los planes quedan en **Planificando** hasta que el usuario los pase a **Pendiente**.

---

## Contexto técnico actual

- `ssh/exec.rs::run_command_streaming` (`:105-169`) hace `select!` entre `token.cancelled()` y `timeout(timeout_secs, ssh_channel.wait())`. Un comando que emite output cada menos de `timeout_secs` nunca expira, aunque se ejecute indefinidamente.
- `DEFAULT_TIMEOUT_SECS = 300` (`:16`) y `OUTPUT_CHUNK_INTERVAL_MS = 100` (`:19`). El `duration_seconds` se calcula al salir del bucle (`:166`).
- `ssh/cancel.rs` expone `RemoteJobCancel` con un solo `Option<CancellationToken>`. El frontend invoca `ssh_cancel_remote_job` sin argumentos (`useRemoteCommand.ts:114`) y serializa las operaciones.
- `ssh_upload_file` y `ssh_download_file` también registran su token en el mismo estado; cualquier cambio del modelo afecta a los tres comandos.
- El contrato con el frontend (nombre del comando, eventos `output_chunk`/`finished`/`error` y tipos ts-rs) hoy no permite identificar un job.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-19 | El usuario pide planes separados por bloque para las mejoras pendientes de §10. |
| 2026-11-19 | Este bloque agrupa únicamente timeout total (mejora 1) y cancelación multi-job (mejora 7). |
| 2026-11-19 | Iván autoriza ejecutar el plan 2/4. |
| 2026-11-19 | **Timeout total:** reutiliza `timeout_secs` (300 s por defecto); el output deja de reiniciar el reloj. No se añade parámetro nuevo. |
| 2026-11-19 | **job_id:** generado en Rust con un `AtomicU64` (sin dependencias nuevas), emitido como `RemoteConsoleEvent::Started { job_id }` por el Channel al registrar el token y retirado del mapa al terminar. |
| 2026-11-19 | **Cancelación:** `ssh_cancel_remote_job(job_id?: number)` opcional; con id cancela ese job, sin id cancela el último registrado (best-effort, comportamiento actual). |

**Alternativas descartadas:** mantener el timeout por `wait()` (es justo lo que se quiere corregir); un único token con un `bool` de «cancelar todos» (no permite cancelar un job concreto); cambiar el contrato del frontend sin versionar los tipos (rompería `useRemoteCommand`); devolver el `job_id` en la respuesta final (llega demasiado tarde para cancelar un job en marcha); generar el `job_id` en el frontend (el backend no podría garantizar identificadores únicos ni sin reutilización).

---

## Problemas y riesgos encontrados

### P1 — Cambio de semántica del timeout

- Hoy un flujo con output intermitente nunca agota los 300 s. Con timeout total, esos mismos comandos empezarán a fallar.
- **→ Riesgo ALTO.** Definir si el timeout total usa el mismo `timeout_secs` y documentarlo; la verificación manual debe cubrir un comando que emita output continuo durante más tiempo que el timeout.

### P2 — Contrato de cancelación

- `ssh_cancel_remote_job` no tiene argumentos. Identificar un job obliga a añadir un `job_id` al comando y al registro, con impacto en `tauri-types.d.ts` y en el frontend.
- **→ Riesgo ALTO.** Decir explícitamente en Fase 1 cómo se genera y devuelve el `job_id` antes de tocar código; no cambiar el nombre del comando.

### P3 — Jobs que terminan sin limpiar su token

- `register` no limpia al terminar y `cancel` hace `take()`. Con varios jobs, una cancelación tardía podría actuar sobre un job ya finalizado.
- **→ Riesgo MEDIO.** Diseñar el estado para que cada job cancele solo el suyo y retirar su entrada al terminar, sin reutilizar identificadores.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Fijar el contrato (resuelta el 2026-11-19)

1. Timeout total: reutiliza `timeout_secs` (300 s por defecto).
2. Identificación: `job_id` generado en Rust y emitido como evento `started` por el Channel.
3. Cancelación sin id: cancela el último job registrado.
4. Decisiones registradas en la tabla «Decisiones» antes de tocar código.

### Fase 2 — Timeout total en la ejecución

1. Envolver el bucle completo de `run_command_streaming` en un único `tokio::time::timeout`, manteniendo el `select!` interno solo para cancelación y lectura de mensajes.
2. Conservar el mensaje de error `Timeout de {n} segundos alcanzado` y la clave `tauri.ssh.errors.execution_failed` (familia ya migrada en el plan 1/4).
3. Conservar chunks ~100 ms, `exit_code = -1` inicial, `Eof` ignorado, espera a `Close | None` y `duration_seconds`.

### Fase 3 — Estado multi-job y cancelación

1. Sustituir `Mutex<Option<CancellationToken>>` por un mapa de jobs con identificador y su token.
2. Registrar y retirar cada token en `ssh_execute_command`, `ssh_upload_file` y `ssh_download_file` sin cambiar el orden de conexión/emisión de eventos.
3. Actualizar `ssh_cancel_remote_job` según lo decidido en Fase 1, manteniendo su best-effort.

### Fase 4 — Frontend y documentación

1. Regenerar `tauri-types.d.ts` (paso manual) y ajustar `useRemoteCommand.ts` para el nuevo identificador/cancelación.
2. Actualizar `AGENTS.backend.md §5` y `AGENTS.frontend.md §6` con el nuevo modelo de timeout y cancelación.
3. Actualizar la decisión de no regresión de §10 del diseño para reflejar que ya no se conserva el timeout por `wait()`.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src-tauri/src/ssh/exec.rs` | Timeout total del bucle; registro/limpieza del token por job. |
| `src-tauri/src/ssh/cancel.rs` | Estado multi-job y firma de `ssh_cancel_remote_job`. |
| `src-tauri/src/ssh/transfer_commands.rs` | Registro/limpieza del token en upload y download. |
| `src-tauri/src/ssh/types.rs` | Nueva variante `RemoteConsoleEvent::Started { job_id }`. |
| `src-tauri/src/lib.rs` | Solo si cambia la firma del comando de cancelación (registro). |
| `src/composables/useRemoteCommand.ts` | Adaptar cancelación y lectura del `job_id`. |
| `src/types/tauri-types.d.ts` | Regenerado; no editar a mano. |
| `AGENTS.backend.md` / `AGENTS.frontend.md` | Timeout total y cancelación por job. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Comando con output continuo durante más tiempo que el timeout: debe fallar por timeout total y emitir el evento `error`.
2. Comando normal con chunks y `exit_code != 0`: mismos eventos y respuesta que hoy.
3. Dos jobs concurrentes: cancelar uno debe detener solo ese y dejar el otro terminar.
4. Cancelación de un job ya finalizado: no debe afectar a otros jobs.
5. Transferencias concurrentes: cancelar una no debe cancelar la otra.

---

## Criterios de aceptación

- [x] El timeout ya no se reinicia con cada mensaje de output.
- [x] Cada job tiene un identificador y puede cancelarse por separado.
- [x] Los tres comandos que registran token limpian su entrada al terminar.
- [x] Se conservan claves i18n, eventos y defaults salvo el cambio decidido de timeout.
- [x] Frontend y bindings regenerados sin cambios manuales en archivos generados.

### Desviaciones

- El plan decía conservar la clave `tauri.remote.errors.execution_failed`, pero el plan 1/4 ya migró esa familia a `tauri.ssh.errors.execution_failed`. Se conserva el mensaje `Timeout de {n} segundos alcanzado` con la clave actualizada.
- Se añadió `RemoteJobGuard` (RAII) en `ssh/cancel.rs`, que no figuraba en el plan: retira el job del mapa al salir del comando por cualquier camino (éxito, error o cancelación), algo que con retiradas manuales era fácil olvidar en los ~10 retornos de las transferencias.
- El timeout total se aplica dentro de `run_command_streaming` envolviendo el bucle de lectura en un `async` block con `tokio::time::timeout`, tal como pedía la Fase 2; el `select!` interno queda solo para cancelación y lectura de mensajes.
- No se regeneró `src/types/tauri-types.d.ts` ni se ejecutaron `cargo check`, `vue-tsc` ni `bun run build`: quedan para la verificación manual del usuario.

---

## Puntos abiertos

Ninguno. Las tres decisiones se fijaron el 2026-11-19 al autorizar la ejecución (tabla «Decisiones»).

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-19 | Plan creado en estado **Planificando** a partir de §10 del diseño, según la agrupación elegida por el usuario. |
| 2026-11-19 | Iván pidió continuar con el plan 2/4 y fijó las tres decisiones de Fase 1; el plan pasa a **Ejecutando**. |
| 2026-11-19 | Implementadas timeout total en `exec.rs`, estado multi-job con `RemoteJobGuard` en `cancel.rs`, evento `started` y adaptación de `useRemoteCommand.ts`. |
| 2026-11-19 | Actualizados `AGENTS.backend.md`, `AGENTS.frontend.md` y §10 del diseño; pendiente la verificación manual del usuario. |
| 2026-11-19 | Revisión estática completada: `serde(tag = "event", rename_all = "snake_case")` genera `event: "started"`; `State::inner()`, el `async` block con `??` y los guards son correctos; `tauri-types.d.ts` aún no contiene la variante `started` (lo regenerará el usuario). |
| 2026-11-19 | El usuario confirmó la verificación (bindings, tipos, build y pruebas funcionales) y pidió pasar al plan 3/4; el plan se marca **Terminado** y se archiva. |
