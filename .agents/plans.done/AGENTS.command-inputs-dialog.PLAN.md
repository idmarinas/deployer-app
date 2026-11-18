# Plan: Parámetros de entrada en comandos (4/5) — diálogo de ejecución

## Estado

**Terminado** — el usuario lo dio por completado el 2026-11-18. Verificación manual (`bunx vue-tsc --noEmit`, `bun run build`) pendiente de que la ejecute el usuario.

**Diseño de origen:** `.agents/designs/AGENTS.command-inputs.DESIGN.md` (aprobado el 2026-11-18). Corresponde al bloque 4 de §7 y a §6.4 del diseño.

**Dependencias:** planes `AGENTS.command-inputs-model.PLAN.md` (contrato y columna), `AGENTS.command-inputs-runner.PLAN.md` (`params`, defaults y validación) y `AGENTS.command-inputs-form.PLAN.md` (inputs en el formulario y en el estado de edición).

**Orden de ejecución:** cuarto de cinco. El plan 5 documenta el resultado.

---

## Instrucciones dadas (verbatim)

> "Vamos a aparcar esto, y a mejorar el módulo de comandos. Para que pueda tener inputs de entrada"

> "Están bien esas decisiones que tomaste. Ahora crea el plan de implementación de esto."

Contexto aportado por el agente (análisis previo):

- `CommandTestDialog.vue` ya tiene selector de host, vista previa interpolada/original, panel de errores y salida (`src/components/overlay/CommandTestDialog.vue:201-300`).
- El diálogo se abre desde el listado y desde el toolbar de alta/edición mediante `useCommandTestDialog` (`src/composables/useDialog.ts:53-64`).
- Hoy la vista previa solo usa `{ global }` (`:47`) y el diálogo ejecuta con `runCommand` o `runCustomCommand` sin parámetros (`:163-174`).
- Los `params` no se persisten: el diálogo se recrea en cada apertura (`destroyOnClose: true`), así que el estado no se filtra entre ejecuciones.

---

## Objetivo

Que el diálogo «Probar / Ejecutar» pida los parámetros del comando y los use en la ejecución:

- `InputsForm.vue` compartido para renderizar los cuatro tipos de input.
- `CommandTestDialog` con el bloque «Parámetros», defaults resueltos, validación y vista previa con `params`.
- Paso de `params` a `runCommand`/`runCustomCommand` y de `inputs` desde listado, alta y edición.
- Claves i18n del bloque y de los errores.

**No entra en este plan:** editar la definición desde el diálogo (eso es el plan 3), streaming/cancelar, `fail_on_nonzero`, persistencia de valores ni tipos nuevos.

---

## Contexto técnico actual

| Elemento | Estado real |
| --- | --- |
| Props del diálogo | `CommandTestDialog.vue:21-33`: `title`, `description`, `command`, `parser`, `timeout`, `commandKey`. |
| Ámbito global | Se carga al montar con `loadGlobalScopeMetadata()` (`:191-198`); `scopeLoaded` controla errores y vista previa. |
| Vista previa | `interpolationRoots = { global }` (`:47`); `interpolateSegments` + `findReferences` para las dos pestañas (`:76-122`). |
| Validación | `validateTemplate` produce `errors`/`warnings` (`:49-53`); `canRun` exige host, ámbito cargado, sin errores y sin ejecución (`:150-152`). |
| Ejecución | `run()` en `:154-183`; el resultado se vuelca en `RemoteOutput` (`:281-287`). |
| API del runner | Tras el plan 2, `runCommand(key, hostId, { params })` y `runCustomCommand(definition, hostId, { params })`. |
| Apertura | `useCommandTestDialog(options)` crea el modal con `props: options` (`useDialog.ts:53-64`). |
| Llamantes | Listado `pages/dashboard/commands/index.vue:80-88`; alta `add.vue:62-70`; edición `[key]/edit.vue:51-60`. |

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-18 | **`InputsForm.vue` es el único render de valores.** El diálogo de comandos y el futuro diálogo de flujos lo comparten; no se duplica el `switch` de tipos. |
| 2026-11-18 | **El bloque de parámetros solo aparece si `inputs.length > 0`.** Un comando sin inputs mantiene el diálogo actual. |
| 2026-11-18 | **Defaults al abrir, no reactivos.** Se aplican una vez, cuando termina de cargar el ámbito global; editar una variable global con el diálogo abierto no cambia el valor. |
| 2026-11-18 | **La validación bloquea la ejecución.** `canRun` exige que no haya `required` ausentes ni valores inválidos, además de los errores de plantilla. |
| 2026-11-18 | **La vista previa rellena las claves declaradas que falten con cadena vacía.** Así no se mezclan errores de interpolación con el aviso de parámetro faltante; el panel de issues muestra el problema real. |
| 2026-11-18 | **`params` se pasa siempre a la ejecución.** En comando guardado, `runCommand` vuelve a aplicar defaults y validar; en ad-hoc, la definición incluye `inputs`. |
| 2026-11-18 | **Sin streaming ni cancelar.** La salida se sigue mostrando al terminar; esas mejoras están en §9 del diseño. |
| 2026-11-18 | **Se conserva la semántica de «Probar» en edición.** Si hay `commandKey`, se ejecuta la definición guardada; el bloque de parámetros usa los `inputs` del estado actual. Limitación anotada en P4. |

**Alternativas descartadas:**

- **Un diálogo nuevo para «ejecutar con parámetros»**: duplicaría host, vista previa, salida y errores; el diseño mantiene un único diálogo.
- **Pedir los parámetros en el listado antes de abrir el diálogo**: rompe el patrón de diálogo y no permitiría ver la vista previa.
- **Guardar los últimos valores en `deployer_settings`**: los valores no se persisten (diseño §4).

---

## Problemas y riesgos encontrados

### P1 — `UInputNumber` devuelve `null` al vaciar

- `InputValues` no admite `null`; si se guarda tal cual, la interpolación podría escribir `null` o el runner podría coaccionar `Number(null) = 0`.
- **→ Riesgo MEDIO.** Normalizar `null`/`undefined` a `''` antes de guardar; el runner (plan 2) trata `''` como valor explícito inválido para `number`, no como `0`.

### P2 — Defaults que dependen de la carga del ámbito global

- El bloque de parámetros no puede renderizar valores por defecto antes de que `loadGlobalScopeMetadata()` termine; si falla, no hay defaults.
- **→ Riesgo MEDIO.** Renderizar el bloque solo cuando `scopeLoaded` sea `true`; mientras tanto, mantener el mensaje de carga existente. Si falla la carga, el diálogo ya bloquea la ejecución y muestra `load_error`.

### P3 — Errores duplicados o contradictorios

- `validateInputValues` puede reportar un requerido ausente mientras `validateTemplate` reporta `unknown_variable` por la misma clave.
- **→ Riesgo MEDIO.** La vista previa usa `params` con placeholders para las claves declaradas; el panel separa «Errores de interpolación» y «Parámetros» y no repite el mismo problema.

### P4 — Desajuste entre definición guardada y formulario en edición

- En `[key]/edit.vue`, el diálogo recibe `commandKey` y ejecuta la definición de la BD; si el usuario ha añadido/cambiado inputs sin guardar, el bloque de parámetros puede no coincidir con lo que se ejecutará.
- **→ Riesgo MEDIO.** Se mantiene el comportamiento actual (probar la versión guardada) y se documenta la limitación; pasar a ad-hoc en edición queda como punto abierto.

### P5 — Valores vacíos y defaults

- Si el usuario borra un campo que tenía default, el runner no debe volver a aplicar el default (sería imposible dejarlo vacío).
- **→ Riesgo MEDIO.** El diálogo envía la clave con `''`; el runner solo aplica el default cuando la clave no viene o es `undefined`/`null` (decisión del plan 2).

### P6 — Secretas en la vista previa

- Los valores de `params` no son secretos, pero la plantilla puede contener `{{global.*}}` secretas.
- **→ Riesgo BAJO.** Mantener `interpolateSegments` con `maskSecrets` por defecto y el aviso actual; no añadir valores de `params` a la colección de secretos.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — `InputsForm.vue` compartido

1. Crear `src/components/form/inputs/InputsForm.vue`:
   ```ts
   defineProps<{
     fields: InputFieldDefinition[]
     issues?: Record<string, { messageKey: string; messageParams?: Record<string, unknown> }>
     disabled?: boolean
   }>()
   const values = defineModel<InputValues>({ required: true })
   ```
2. Renderizar un `UFormField` por campo con `:label`, `:help`, `:required` y el control según el tipo:
   - `text` → `UInput`
   - `number` → `UInputNumber` (`:disable-wheel-change="true"`, sin `min`/`max` salvo los que declare el campo)
   - `boolean` → `USwitch`
   - `select` → `USelect` con `:items="field.options"` (`label`/`value`)
3. Conectar los controles con `:model-value="values[field.key]"` y `@update:model-value="setValue(field.key, $event)"`:
   - `null`/`undefined` → `''`.
   - `false` y `0` se conservan.
   - La cadena vacía se conserva (es un valor explícito).
4. Mostrar el mensaje de `issues[field.key]` debajo del campo con `t(messageKey, messageParams)`.
5. No cargar el ámbito global ni resolver defaults: eso es responsabilidad del diálogo. `InputsForm` es tonto y reutilizable.

### Fase 2 — Estado y defaults en `CommandTestDialog`

1. Añadir `inputs?: InputFieldDefinition[]` a las props (`:21-33`).
2. Importar `resolveInputDefaults`, `validateInputValues` y `InputValues`.
3. Añadir `const params = ref<InputValues>({})` y `const defaultIssues = ref<InputDefaultIssue[]>([])`.
4. En `onMounted`, después de `globalScope.value = await loadGlobalScopeMetadata()`:
   ```ts
   const resolved = resolveInputDefaults(props.inputs ?? [], globalScope.value)
   params.value = resolved.values
   defaultIssues.value = resolved.issues
   ```
5. `paramIssues` computado: combina `defaultIssues` y `validateInputValues(props.inputs ?? [], params.value)`; construir un mapa por `key` para `InputsForm`.
6. `canRun` añade `paramIssues.length === 0`.

### Fase 3 — Plantilla del diálogo

1. Insertar el bloque «Parámetros» entre el selector de host y la vista previa:
   - Visible solo si `(props.inputs?.length ?? 0) > 0`.
   - Título `t('dialogs.commands.test.params.title')`.
   - Si `scopeLoading`, mantener el mensaje de carga actual; si `scopeLoaded`, renderizar `<InputsForm v-model="params" :fields="inputs" :issues="issueMap" />`.
2. Añadir un panel de errores de parámetros (similar al de interpolación) con las etiquetas de los campos afectados; no repetir el mensaje de plantilla.
3. Ampliar la vista previa a `{ global: globalScope, params: previewParams }`, donde `previewParams` rellena con `''` las claves declaradas que falten.
4. El resaltado de `params` sigue siendo «variable normal»; las secretas de `global` se mantienen en ámbar.
5. `hasReferences` sigue funcionando: las referencias a `params` también cuentan.

### Fase 4 — Ejecución y paso de `params`

1. En `run()`:
   ```ts
   const options = { params: params.value }
   const result = props.commandKey
     ? await runCommand(props.commandKey, hostId.value, options)
     : await runCustomCommand(
         { id: 'ad-hoc', name: props.title ?? 'ad-hoc', command: props.command,
           parser: props.parser ?? { type: 'raw' }, timeout_secs: props.timeout,
           inputs: props.inputs },
         hostId.value, options,
       )
   ```
2. No persistir `params`; no resetear tras ejecutar (el diálogo se destruye al cerrar).
3. Mantener `clearOutput()` y el resto del flujo de salida sin cambios.

### Fase 5 — Wiring desde las páginas

1. `src/composables/useDialog.ts:19-25`: añadir `inputs?: InputFieldDefinition[]` a `CommandTestDialogOptions`.
2. Listado (`pages/dashboard/commands/index.vue:82-88`): pasar `inputs: row.original.inputs`.
3. Alta (`add.vue:64-69`): pasar `inputs: state.value.inputs`.
4. Edición (`[key]/edit.vue:53-59`): pasar `inputs: state.value.inputs` (se mantiene `commandKey`; ver P4).
5. Confirmar que el modal recibe la prop nueva por `props: options`; no hace falta tocar `useOverlay`.

### Fase 6 — i18n

1. Añadir a `src/locales/es/dialogs/commands.ts` y `en`:
   - `test.params.title` (`Parámetros de entrada`)
   - `test.params.errors` (`Revisa los parámetros`)
   - Si hace falta, `test.params.empty` no se usa (el bloque se oculta).
2. Reutilizar `utils.inputs.errors.value_required` / `value_invalid` para los mensajes por campo (creados en el plan 1).
3. Pedir al usuario que ejecute `bun run i18n:types`.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/components/form/inputs/InputsForm.vue` | **Nuevo.** Render compartido de valores de input. |
| `src/components/overlay/CommandTestDialog.vue` | Prop `inputs`, estado `params`, defaults, validación, vista previa y paso a la ejecución. |
| `src/composables/useDialog.ts` | `inputs?: InputFieldDefinition[]` en las opciones del diálogo. |
| `src/pages/dashboard/commands/index.vue` | Pasar `row.original.inputs`. |
| `src/pages/dashboard/commands/add.vue` | Pasar `state.value.inputs`. |
| `src/pages/dashboard/commands/[key]/edit.vue` | Pasar `state.value.inputs`. |
| `src/locales/es/dialogs/commands.ts` | Claves `test.params.*`. |
| `src/locales/en/dialogs/commands.ts` | Espejo en inglés. |
| `typed-locale.d.ts` | Autogenerado por `bun run i18n:types` (no editar). |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Comando con dos inputs (`text` requerido y `boolean` con default `true`) guardado: «Probar» desde el listado muestra el bloque de parámetros con el default aplicado.
2. Sin rellenar el `text` requerido, «Ejecutar» está deshabilitado y el panel indica qué falta.
3. Al rellenarlo, la vista previa muestra el comando resuelto con el valor y la ejecución produce la salida esperada.
4. Borrar un campo que tenía default: la vista previa queda con el hueco vacío y, si es requerido, no se puede ejecutar; no se vuelve a aplicar el default.
5. Input `boolean` con `false`: se envía `false` (no se confunde con ausente) y el script lo recibe.
6. Input `number` vacío: no se ejecuta y el error es de parámetro inválido, no un `0` silencioso.
7. Input `select`: solo se ofrecen las opciones definidas; el valor elegido aparece en la vista previa.
8. Input `text` con `default: "{{global.deploy_path}}"`: se muestra resuelto al abrir el diálogo.
9. Default con variable secreta o deshabilitada: el diálogo muestra el error y no permite ejecutar.
10. Comando sin inputs: el diálogo se ve y funciona como antes (sin bloque de parámetros).
11. «Probar» desde el alta con un comando aún no guardado: los inputs del formulario se piden y se usan en la ejecución ad-hoc.
12. Comando interno o vista de host: sin cambios.
13. La salida sigue apareciendo al terminar la ejecución (no se promete streaming).

---

## Criterios de aceptación

- [ ] `InputsForm.vue` renderiza `text`, `number`, `boolean` y `select` y no conoce el ámbito global.
- [ ] El diálogo muestra el bloque de parámetros solo cuando el comando declara inputs.
- [ ] Los defaults se aplican al abrir, después de cargar el ámbito global, y respetan `false`/`0`.
- [ ] Un `required` ausente o un valor inválido bloquea «Ejecutar» y se explica en el panel.
- [ ] La vista previa incluye los valores de `params` y mantiene el enmascarado de secretas de `global`.
- [ ] `params` llega a `runCommand`/`runCustomCommand` y el comando ejecutado coincide con la vista previa.
- [ ] El diálogo se abre con los `inputs` correctos desde listado, alta y edición.
- [ ] Un comando sin inputs mantiene el comportamiento y el aspecto actual.
- [ ] Los valores no se persisten ni se registran.
- [ ] Todas las cadenas visibles están en `src/locales/{es,en}`.

### Desviaciones

- `previewParams` rellena los booleanos sin valor con `false` (no con cadena vacía), para que la vista previa coincida con lo que construye el runner.
- `paramIssues` no evalúa nada hasta que carga el ámbito global; si un campo tiene un problema de `default`, ese mensaje tiene prioridad sobre el de valor para la misma clave.
- `InputsForm` normaliza las opciones de `select` a su valor declarado y resuelve el valor actual por comparación de cadena, de modo que un default numérico guardado como texto casa con su opción.
- El mapa de issues del diálogo usa un tipo local (`ParamIssueMessage`) en lugar de importar el de `InputsForm.vue`; la forma es idéntica y evita acoplar el diálogo al SFC.
- La definición ad-hoc usa `id: 'ad-hoc'` sin el `?? props.commandKey` anterior: en esa rama nunca hay `commandKey`.
- `InputsForm` se importa explícitamente en el diálogo, igual que `SelectHost` y `RemoteOutput`, en vez de confiar en el autoregistro.
- No se añadió `test.params.empty`: el bloque entero se oculta si no hay inputs.

---

## Puntos abiertos

1. **«Probar» en edición con cambios sin guardar:** hoy ejecuta la definición guardada (`commandKey`). Si se quiere probar exactamente lo que hay en el formulario (incluidos inputs nuevos), habría que dejar de pasar `commandKey` en `edit.vue` y asumir el cambio de comportamiento.
2. **Inputs de tipo `select` con valores numéricos:** `USelect` trabaja con las `options` tal cual; si se añaden valores numéricos por código, comprobar que la comparación del runner los acepta.
3. **Streaming y cancelar:** siguen pendientes (§9 del diseño); este plan mantiene la salida al final.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-18 | Plan creado en estado **Planificando**. |
| 2026-11-18 | Ejecutado: `InputsForm.vue`, bloque de parámetros y panel de errores en `CommandTestDialog.vue`, defaults al abrir, vista previa con `params`, paso a `runCommand`/`runCustomCommand`, `inputs` en `useDialog` y en las tres páginas, claves `dialogs.commands.test.params.*`. Estado **Ejecutando**, pendiente de verificación manual. |
| 2026-11-18 | El usuario lo dio por completado. Estado **Terminado**; plan archivado en `.agents/plans.done/`. Verificación manual pendiente. |
