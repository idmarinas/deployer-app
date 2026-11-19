# Plan: Mejoras futuras de SSH (4/4) — Consolidar las duplicaciones documentadas

## Estado

**Terminado** — el usuario confirmó el 2026-11-19 que todo es correcto y dio por finalizado el plan. Es el último de la serie `ssh-mejoras`, que queda completa.

**Diseño de origen:** `.agents/designs/AGENTS.unificar-ssh-remote.DESIGN.md`. Corresponde a la mejora 4 de la sección §10 del diseño (inventario en §3.3).

**Serie:** ssh-mejoras — plan 4 de 4. Hermanos: `AGENTS.ssh-mejoras-conexion.PLAN.md`, `AGENTS.ssh-mejoras-ejecucion.PLAN.md`, `AGENTS.ssh-mejoras-transferencias.PLAN.md`, `AGENTS.ssh-mejoras-duplicaciones.PLAN.md`.

**Dependencia:** requiere `AGENTS.ssh-mejoras-conexion.PLAN.md`, `AGENTS.ssh-mejoras-ejecucion.PLAN.md` y `AGENTS.ssh-mejoras-transferencias.PLAN.md` (consolida los helpers que esos planes modifican o añaden).

**Orden de ejecución:** 4 de 4. Cierra la serie; al terminarlo se avisa al usuario de que la serie está completa.

---

## Instrucciones dadas (verbatim)

> "Crea el plan para eso que quedó pendiente del diseño."

Contexto aportado por el agente (análisis previo):

- El usuario eligió **«Varios planes por bloque»**; este es el bloque de **consolidación de duplicaciones**.
- §3.3 del diseño documenta cinco duplicaciones que se trasladaron tal cual por la regla de no regresión. §10 las deja para «una fase futura con aprobación explícita».
- Código verificado en el estado actual (rutas ya bajo `ssh/`): `emit_error`/`err_response` idénticos en `exec.rs:179-195` y `transfer_commands.rs:305-321`; pipeline `connect → ensure_connected → open_sftp_session` en `transfer_commands.rs:36-62` y `:145-171`; `CancellationToken::new()` + `state.register` en `exec.rs:39-40`, `transfer_commands.rs:33-34` y `:142-143`; lectura SFTP en chunks con cancelación en `transfer_commands.rs:238-284` frente a `ssh/transfer.rs::download_single_file`; `CANCELLED_MSG` definido en `ssh/transfer.rs` y re-exportado en `ssh/cancel.rs:9`.

---

## Objetivo

Unificar las cinco duplicaciones de §3.3 en helpers compartidos dentro de `ssh/`, sin cambiar mensajes, orden de operaciones ni semántica de errores.

**No entra en este plan:** cambiar timeouts (otro plan), cambiar `recursive` o `Finished.exit_code` (otro plan), modificar el contrato con el frontend ni alterar la semántica de cancelación multi-job (otro plan). No se ejecuta nada hasta que el usuario lo pase a **Pendiente**.

---

## Contexto técnico actual

- `ssh/exec.rs` y `ssh/transfer_commands.rs` repiten `emit_error` y `err_response` con el mismo cuerpo; construyen `CommandResponse::err` con `params!("reason" => ...)`.
- `ssh_upload_file` y `ssh_download_file` repiten el pipeline de conexión y apertura SFTP, pero con claves i18n distintas al fallar (`connection_failed` frente a `transfer_failed`).
- Los tres comandos remotos crean y registran un `CancellationToken` al empezar.
- La rama base64 de `ssh_download_file` lee en chunks de `SFTP_BUFFER_SIZE` y comprueba la cancelación en cada vuelta; `ssh/transfer.rs::download_single_file` hace algo parecido escribiendo a disco.
- `CANCELLED_MSG` vive en la capa genérica (`ssh/transfer.rs`) y la capa de comandos (`ssh/cancel.rs`) lo re-exporta: acoplamiento inverso señalado en §3.3.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-19 | El usuario pide planes separados por bloque; este agrupa la mejora 4 de §10. |
| 2026-11-19 | Se consolidarán las duplicaciones sin cambiar su comportamiento observable; cada fase es independiente y verificable. |
| 2026-11-19 | Iván autoriza ejecutar el plan 4/4 (último de la serie). |
| 2026-11-19 | **Helpers de eventos/respuesta:** se ubican en un módulo nuevo `ssh/events.rs`. |
| 2026-11-19 | **`CANCELLED_MSG`:** se mantiene la definición actual y el re-export en `ssh/cancel.rs` por compatibilidad. |
| 2026-11-19 | **Fase 3 (token):** ya cubierta por `RemoteJobCancel::register()` + `RemoteJobGuard` (planes 2/3), pero se revisa igualmente por si cabe unificación adicional sin cambiar el orden/semántica. |

**Alternativas descartadas:** consolidar todo en un único cambio grande (dificulta aislar regresiones); mover `CANCELLED_MSG` a un módulo nuevo sin revisar consumidores (podría romper imports); unificar el pipeline SFTP antes de decidir la semántica de errores de cada comando (cambiaría claves i18n).

---

## Problemas y riesgos encontrados

### P1 — Cambio del orden de operaciones

- Unificar el pipeline `connect → ensure_connected → open_sftp_session` puede alterar cuándo se emite `Error` o qué clave i18n se devuelve.
- **→ Riesgo ALTO.** Extraer el helper conservando literalmente el orden y los mensajes; verificar upload y download por separado.

### P2 — Semántica de error compartida

- `emit_error`/`err_response` son idénticos hoy, pero los llamadores usan claves distintas. Un helper con la clave como parámetro debe conservarlas todas.
- **→ Riesgo MEDIO.** Revisar cada llamada y comparar las claves `tauri.remote.*` antes y después.

### P3 — Acoplamiento de `CANCELLED_MSG`

- Mover la constante cambia imports en `exec.rs`, `transfer_commands.rs` y `cancel.rs`; el re-export actual forma parte de la superficie pública.
- **→ Riesgo MEDIO.** Mantener el re-export durante la transición o actualizar todos los consumidores en la misma fase.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Helpers de evento y respuesta

1. Extraer `emit_error` y `err_response` a un helper compartido en `ssh/` (por ejemplo `ssh/response.rs` o `ssh/helpers.rs`), con la clave i18n como parámetro.
2. Sustituir las copias de `exec.rs` y `transfer_commands.rs` sin cambiar ninguna clave ni mensaje.
3. Comparar los dos archivos y confirmar que solo cambiaron las llamadas al helper.

### Fase 2 — Pipeline SFTP compartido

1. Extraer `connect → ensure_connected → open_sftp_session` a un helper que devuelva la sesión y el `SftpSession` o un error tipificado.
2. Conservar las claves `connection_failed` y `transfer_failed` de cada comando y el punto exacto donde se emite `Error`.
3. Verificar upload y download con conexión correcta y fallida.

### Fase 3 — Registro de token

1. Centralizar `CancellationToken::new()` + `state.register` en un helper usado por los tres comandos.
2. No cambiar el modelo de estado (`RemoteJobCancel`), que pertenece al plan de cancelación multi-job.
3. Comprobar que el token se registra en el mismo punto del flujo que hoy.

### Fase 4 — `CANCELLED_MSG` y lectura base64

1. Resolver el acoplamiento inverso de `CANCELLED_MSG` moviéndolo a un módulo neutral o manteniendo el re-export con todos los consumidores actualizados.
2. Unificar la lectura SFTP en chunks con cancelación entre la rama base64 y `download_single_file`, parametrizando el destino (memoria frente a disco).
3. Conservar `SFTP_BUFFER_SIZE`, la comprobación de cancelación por vuelta y los eventos de progreso.

### Fase 5 — Documentación

1. Actualizar `AGENTS.backend.md §1 y §5` con los nuevos helpers y el árbol resultante de `ssh/`.
2. Marcar en §3.3/§10 del diseño qué duplicaciones ya están consolidadas.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src-tauri/src/ssh/exec.rs` | Usar helpers compartidos de evento/respuesta y token. |
| `src-tauri/src/ssh/transfer_commands.rs` | Usar helpers compartidos de evento/respuesta, pipeline, token y lectura. |
| `src-tauri/src/ssh/transfer.rs` | Posible extracción de la lectura en chunks y cambio de ubicación de `CANCELLED_MSG`. |
| `src-tauri/src/ssh/cancel.rs` | Ajuste del re-export de `CANCELLED_MSG`. |
| `src-tauri/src/ssh/mod.rs` | Declarar/re-exportar los nuevos helpers. |
| `src-tauri/src/ssh/response.rs` (o el que se elija) | Nuevo helper de evento/respuesta. |
| `AGENTS.backend.md` | Árbol de `ssh/` y descripción de helpers. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Comando remoto correcto, con `exit_code != 0` y cancelado: mismos eventos y claves i18n que hoy.
2. Upload y download correctos, con conexión fallida y con SFTP fallido: misma clave de error en cada caso.
3. Descarga sin `local_path` (base64) y con `local_path`: mismo progreso y cancelación.
4. Cancelación de cada uno de los tres comandos: mismo mensaje `CANCELLED_MSG`.

---

## Criterios de aceptación

- [x] Las cinco duplicaciones de §3.3 están consolidadas o documentadas como no consolidables, con motivo.
- [x] No cambia ninguna clave i18n, mensaje, evento ni orden de operaciones.
- [x] La superficie pública de `ssh/` sigue exponiendo los mismos símbolos a `lib.rs` y consumidores (se añade `ssh::events` como módulo interno).
- [x] `test_connection` y `export_public_key` siguen funcionando sin cambios.

### Desviaciones

- **Helpers de eventos:** se creó `ssh/events.rs` con `emit_started`, `emit_output_chunk`, `emit_error`, `emit_finished` y `emit_transfer_terminal_error`; `exec.rs` y `transfer_commands.rs` dejaron de tener copias locales. Se preservaron las diferencias de semántica (ejecución emite `finished` de éxito al completar; transferencias emiten cierre terminal en todos los casos).
- **Pipeline SFTP:** se extrajo `connect_sftp` como helper privado en `ssh/transfer_commands.rs` para upload/download, conservando el orden `connect → ensure_connected → open_sftp_session`, las claves (`connection_failed`/`transfer_failed`) y el punto de emisión de errores.
- **Fase 3 (token):** revisada según lo pedido; ya estaba cubierta por `RemoteJobCancel::register()` + `RemoteJobGuard` (planes 2/3). No se añadió más unificación porque extraer el arranque cambiaría el momento de `start`/duración u orden en ejecución vs transferencias.
- **`CANCELLED_MSG`:** se mantuvo la definición en `ssh/transfer.rs` y el re-export en `ssh/cancel.rs` por compatibilidad (decisión del usuario); sin cambios de consumidores.
- **Lectura base64:** no se unificó con `download_single_file` porque difieren en destino (memoria vs disco), mensajes/progreso y granularidad de cancelación/lectura; consolidarla requeriría cambiar comportamiento.
- No se ejecutaron `cargo check`, `vue-tsc` ni `bun run build`: quedan para la verificación manual del usuario.

---

## Puntos abiertos

Ninguno. Las decisiones se fijaron el 2026-11-19 al autorizar la ejecución (tabla «Decisiones»). La Fase 3 se revisará explícitamente aunque el registro/guard ya esté centralizado.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-19 | Plan creado en estado **Planificando** a partir de §10 del diseño, según la agrupación elegida por el usuario. |
| 2026-11-19 | Iván pidió continuar con el plan 4/4, fijó las decisiones abiertas (helpers en `ssh/events.rs`, mantener re-export de `CANCELLED_MSG`, revisar Fase 3) y autorizó la ejecución; el plan pasa a **Ejecutando**. |
| 2026-11-19 | Implementado `ssh/events.rs`, refactor de `exec.rs`/`transfer_commands.rs`, extracción de `connect_sftp` y revisión de token/base64/CANCELLED_MSG; actualizados `AGENTS.backend.md` y §3.3/§10 del diseño. |
| 2026-11-19 | Implementación completada; pendiente verificación manual del usuario para cerrar el plan y la serie. |
| 2026-11-19 | El usuario confirmó la verificación y dio por finalizado el plan; se marca **Terminado**, se archiva y la serie `ssh-mejoras` queda completa. |
