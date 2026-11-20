# Plan: Unificar SSH y remote — verificación y cierre

## Estado

**Terminado** — el usuario confirmó la verificación y dio el plan por completado el 2026-11-19.

**Diseño de origen:** `.agents/.done/designs/AGENTS.unificar-ssh-remote.DESIGN.md`

**Dependencia:** requería el plan `.agents/.done/plans/AGENTS.unificar-ssh-remote-traslado.PLAN.md`, terminado por el usuario el 2026-11-19.

---

## Instrucciones dadas (verbatim)

> "Crea el plan para este diseño."
>
> "No quiero que se queden funciones fuera o que cambie su comportamiento."

Contexto aportado por el agente (análisis previo):

- Corresponde al **Bloque 2 — Verificación y cierre** del §7 del diseño aprobado.
- El checklist de no regresión es la tabla §3.5 del diseño: cada fila indica origen, comportamiento a conservar, consumidores y destino.
- Estado verificado el 2026-11-19: `src/types/tauri-types.d.ts` **ya no contiene** `HostSystemInfo` (el usuario regeneró los bindings). Los 7 tipos `Remote*` y `AuthType` siguen exportados desde Rust.
- `docs/content/` no contiene referencias a rutas internas `commands/remote/` ni `ssh/` (solo una mención a comandos SSH en una página de passkeys, sin ruta de código).

---

## Objetivo

Confirmar que el traslado literal del plan anterior conservó **toda** la funcionalidad y cerrar el trabajo: bindings generados, checklist §3.5 recorrido, documentación consistente y verificación funcional manual del usuario.

**No entra en este plan:** cualquier cambio de comportamiento. Las ideas de timeout total, `recursive: Some(false)`, semántica de `Finished.exit_code` y consolidación de duplicaciones son futuras fases del §10 del diseño y necesitan aprobación explícita.

---

## Contexto técnico actual

- La verificación la hace el usuario (`AGENTS.md`, sección «Flujo de planes»); el agente no ejecuta comandos de comprobación salvo petición expresa.
- `cargo test export_bindings` es un **generador**, no una comprobación: se indica como paso manual. Ya se ha ejecutado una vez tras migrar `HostSystemInfo` a `src/types/entities.ts`; el plan solo debe confirmar el resultado.
- El cambio de estado del diseño a **Implementado** y el cierre de los planes los decide el usuario, según la skill `plan-workflow`.
- Los comandos a probar son los cuatro registros de `src-tauri/src/lib.rs:58-61`: `ssh_execute_command`, `ssh_upload_file`, `ssh_download_file`, `ssh_cancel_remote_job`.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-19 | El usuario aprueba el diseño al pedir los planes; se crea este bloque de cierre. |
| 2026-11-19 | La verificación es manual del usuario; el agente solo prepara los pasos y comprueba el estado de los archivos. |
| 2026-11-19 | Los bindings ya regenerados se dan por buenos si no aparece `HostSystemInfo` y el resto de tipos siguen igual. |

**Alternativas descartadas:** dar por cerrado el trabajo sin recorrer el inventario §3.5 (podría ocultar una función no trasladada); editar `tauri-types.d.ts` a mano (está generado, regla del proyecto); incluir aquí refactorizaciones o cambios de comportamiento (restricción explícita del usuario).

---

## Problemas y riesgos encontrados

### P1 — Regresión silenciosa por una firma o ruta mal ajustada

- Un re-export ausente o un `use` mal resuelto puede dejar de exponer un comando o romper `export_public_key`/`test_connection` aunque el resto del código compile.
- **→ Riesgo ALTO.** Recorrer §3.5 fila por fila y comprobar los seis puntos de verificación funcional con el usuario.

### P2 — Residuos del módulo eliminado

- Quedar referencias a `commands/remote/` en documentación o imports aunque el código compile.
- **→ Riesgo BAJO.** Búsqueda de texto en `src-tauri/src/`, `AGENTS*.md` y `docs/content/`; los changelogs históricos no se editan.

### P3 — Bindings desactualizados

- Si se regeneran los bindings antes de tiempo, `HostSystemInfo` podría reaparecer o faltar algún tipo `Remote*`.
- **→ Riesgo MEDIO.** Ya verificado el 2026-11-19: `HostSystemInfo` no está en `tauri-types.d.ts`. Si el usuario vuelve a regenerar, confirmar que sigue ausente y que los 7 tipos `Remote*` y `AuthType` permanecen.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Comprobación documental y de bindings

1. Confirmar que `src/types/tauri-types.d.ts` no contiene `HostSystemInfo` y que siguen los 7 tipos `Remote*` y `AuthType`. Si el usuario ha vuelto a generarlos y algo cambió, indicarlo como paso manual pendiente (no editar el `.d.ts` a mano).
2. Buscar `commands/remote` en `src-tauri/src/`, `AGENTS*.md` y `docs/content/`; no debe quedar ninguna referencia activa.
3. Comprobar que `AGENTS.backend.md §1` describe los submódulos de `ssh/` y la excepción «comandos SSH en `ssh/`», y que `AGENTS.frontend.md §6` apunta a `ssh/`.

### Fase 2 — Checklist de no regresión

1. Recorrer cada fila de la tabla §3.5 del diseño y marcar que el símbolo existe en la columna «Destino» con el comportamiento de «Conservar exactamente».
2. Prestar atención especial a los puntos que cambian semántica si se tocan: timeout por `wait()`, `exit_code = -1` inicial, `Eof` ignorado, chunks ~100 ms, `Finished.exit_code = 0` en transferencias, buffer base64 de 256 KB, `overwrite`/`chmod`/`recursive` y el re-export de `CANCELLED_MSG`.
3. Verificar que no se han consolidado las duplicaciones de §3.3 (emit helpers, pipeline SFTP, token, lectura base64).

### Fase 3 — Verificación funcional del usuario y cierre

1. El usuario ejecuta los pasos de la sección «Verificación (manual)» y confirma el resultado.
2. Revisar que no queden referencias al plan en `AGENTS.todo.md` ni en `.agents/plans/` antes del cierre.
3. Cuando el usuario dé por terminado el plan, aplicar el cierre de la skill: marcar **Terminado**, archivar en `.agents/plans.done/`, añadir entrada en `.agents/AGENTS.done.md`, eliminar la referencia en `AGENTS.todo.md` y dejar que el usuario pase el diseño a **Implementado**.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/types/tauri-types.d.ts` | Solo comprobación; se regenera con el generador del proyecto si hiciera falta (paso manual del usuario). No editar a mano. |
| `AGENTS.backend.md` / `AGENTS.frontend.md` | Comprobación final de rutas y de la excepción documentada. |
| `docs/content/` | Solo búsqueda de referencias a rutas internas; los changelogs no se editan. |
| `.agents/designs/AGENTS.unificar-ssh-remote.DESIGN.md` | El usuario cambia el estado a **Implementado** al cerrar. |
| `.agents/AGENTS.done.md` / `AGENTS.todo.md` | Actualización al cerrar ambos planes (lo hace el agente tras la confirmación del usuario). |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa. Aquí solo van los pasos funcionales.

1. Consola remota: comando con output continuo (chunks en vivo), comando que falla (`exit_code != 0`) y cancelación de un comando largo.
2. Transferencias: subir archivo, subir directorio, descargar a disco y descargar sin `local_path` (base64); comprobar progreso y `Finished.exit_code = 0`.
3. Test de conexión desde un host, incluido uno deshabilitado (`enabled_only: false`).
4. Exportación de clave pública (`export_public_key`).
5. Runner de comandos guardados (`system_info`, `system_metrics`, `upgradable_packages`, `update_packages`) a través de `ssh_execute_command`.
6. Confirmar que el frontend no ha cambiado: mismos nombres de comandos, eventos y tipos.

---

## Criterios de aceptación

- [ ] El usuario confirma los seis puntos de verificación funcional.
- [ ] Todas las filas de §3.5 están presentes en su destino y con su comportamiento original.
- [ ] No queda ninguna referencia activa a `commands/remote/`.
- [ ] `tauri-types.d.ts` no contiene `HostSystemInfo` y conserva los tipos `Remote*` y `AuthType`.
- [ ] No se ha aplicado ninguna de las ideas de cambio de comportamiento de §10 sin aprobación explícita.
- [ ] Cierre registrado en `.agents/AGENTS.done.md` y referencias eliminadas de `AGENTS.todo.md`.

### Desviaciones

<Se rellena al ejecutar: qué se hizo distinto de lo planificado y por qué.>

---

## Puntos abiertos

1. Ninguno. La verificación funcional la confirma el usuario antes del cierre.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-19 | Plan creado en estado **Planificando** a partir del diseño aprobado. |
| 2026-11-19 | El usuario da por terminado el plan de traslado y pide pasar a este; plan pasado a **Pendiente** y, al empezar, a **Ejecutando**. |
| 2026-11-19 | Fase 1 completada: `tauri-types.d.ts` conserva `AuthType` y los 7 tipos `Remote*` sin `HostSystemInfo`; sin referencias a `commands/remote` en `src-tauri/src/` ni `docs/content/`; guías apuntan a `ssh/`. |
| 2026-11-19 | Fase 2 completada: inventario §3.5 recorrido; todos los símbolos están en su destino y los archivos trasladados solo difieren del original en los imports (verificado por hash y diff en el plan de traslado). No se consolidaron las duplicaciones de §3.3. |
| 2026-11-19 | Fase 3 en curso: el usuario confirmó `vue-tsc --noEmit && vite build` sin errores; queda su verificación funcional de consola/transferencias/test de conexión/exportación de clave antes del cierre. |
| 2026-11-19 | El usuario confirma que todo está correcto y pide cerrar el plan; se marca **Terminado**, se archiva y se registra en `.agents/AGENTS.done.md`. |
