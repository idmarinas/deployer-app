# Plan: Parámetros de entrada en comandos (3/5) — editor en el formulario

## Estado

**Terminado** — el usuario lo dio por completado el 2026-11-18. Verificación manual (`bunx vue-tsc --noEmit`, `bun run build`) pendiente de que la ejecute el usuario.

**Diseño de origen:** `.agents/designs/AGENTS.command-inputs.DESIGN.md` (aprobado el 2026-11-18). Corresponde al bloque 3 de §7 y a §6.3 del diseño.

**Dependencias:** planes `AGENTS.command-inputs-model.PLAN.md` (contrato, columna y schema) y `AGENTS.command-inputs-runner.PLAN.md` (`resolveInputDefaults`).

**Orden de ejecución:** tercero de cinco. El plan 4 reutiliza el mismo contrato, pero no este editor.

---

## Instrucciones dadas (verbatim)

> "Vamos a aparcar esto, y a mejorar el módulo de comandos. Para que pueda tener inputs de entrada"

> "Están bien esas decisiones que tomaste. Ahora crea el plan de implementación de esto."

Contexto aportado por el agente (análisis previo):

- `CommandForm.vue` mantiene un único `defineModel` con todos los campos (`src/components/form/CommandForm.vue:22-30`) y ya carga el ámbito global para el linter (`:143-152`).
- El linter y el resaltado solo conocen `global` hoy (`:47,82-95`); el autocompletado lista únicamente entradas de `global` (`:124-141`).
- El editor de reglas del parser (`:419-711`) es el patrón visual a seguir: tarjetas con borde, alta/baja y controles por fila.
- `bun run i18n:types` genera `typed-locale.d.ts`; se ejecuta al añadir claves nuevas.

---

## Objetivo

Permitir definir los parámetros de entrada desde el formulario de comando:

- Componente `CommandInputsEditor.vue` con alta, baja, reordenación y edición de cada input.
- `inputs` en el `v-model` de `CommandForm.vue` y en el estado inicial del alta.
- Linter, resaltado y autocompletado del script conocen la raíz `params` y las claves definidas en el propio formulario.
- Validación de los `default` que usan `{{global.slug}}` al guardar, reutilizando el ámbito global ya cargado.
- Claves i18n en `form.commands.inputs.*`.

**No entra en este plan:** el diálogo de ejecución (plan 4), el render de valores (`InputsForm.vue`), la documentación (plan 5) ni arrastrar filas para reordenar.

---

## Contexto técnico actual

| Elemento | Estado real |
| --- | --- |
| Estado del formulario | `CommandForm.vue:22-30`: `key`, `name`, `description`, `command`, `parser`, `timeout`, `enabled`. |
| Ámbito global | `globalScope` + `scopeLoaded` (`:44-45`), cargados en `onMounted` con `loadGlobalScopeMetadata()` (`:143-152`). |
| Linter | `interpolationLint` valida con `interpolationRoots` (`:47-68`); `interpolationIssues` alimenta la lista de errores del editor (`:70-76`). |
| Resaltado | `interpolationHighlight` resuelve solo `roots.global[slug]` (`:82-95`). |
| Autocompletado | `interpolationEntries` solo recorre `globalScope` (`:124-134`); `createInterpolationCompletion` recibe `getEntries` y `getScopes` (`:137-141`). |
| Plantilla | Campos en `UFormField`; `command` ocupa dos columnas (`:459-474`); el parser se edita después del comando. |
| Estado inicial | `src/pages/dashboard/commands/add.vue:33-44` (el plan 1 añade `inputs: []`). |
| Validación | `src/composables/validation/useCommandValidation.ts` (el plan 1 añade el schema estático de `inputs`). |
| i18n | `src/locales/es/form/commands.ts` y `src/locales/en/form/commands.ts`. |

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-18 | **Editor propio, render de valores aparte.** `CommandInputsEditor.vue` edita la definición (`key`, `label`, `type`, `required`, `default`, `options`, `help`); el render para rellenar valores será `InputsForm.vue` en el plan 4. |
| 2026-11-18 | **Reordenación con botones arriba/abajo.** Evita introducir Sortable.js y sus gotchas de webview para una lista corta (máximo 20). |
| 2026-11-18 | **`default` como `UInput` también en `number`.** El campo debe aceptar `{{global.slug}}`; la coacción a número se valida al guardar y en el runner. Para `boolean` se usa `USwitch` y para `select` un `USelect` de las opciones. |
| 2026-11-18 | **Opciones de `select` con valor de texto en el editor.** El contrato admite `string | number`, pero el editor guarda el valor como cadena; los valores numéricos se podrán añadir por código/importación sin cambiar el contrato. |
| 2026-11-18 | **Validación de defaults al guardar.** Además del schema estático, `useCommandValidation` comprueba con `resolveInputDefaults` que la variable global exista, esté habilitada y no sea secreta. Si el ámbito global no se pudo cargar, se omite esta comprobación (solo queda la estática). |
| 2026-11-18 | **`params` en el linter con placeholders.** Las claves se exponen con su `default` sin resolver (o `''`), porque al linter solo le importa que la ruta exista. |
| 2026-11-18 | **Renombrar una clave no reescribe el script.** El linter marca las referencias huérfanas (`unknown_variable`), igual que hoy con `global`. |
| 2026-11-18 | **Colocación.** La sección «Parámetros de entrada» va entre `timeout` y el editor de `command`, para definir los inputs antes de escribir el script. |

**Alternativas descartadas:**

- **Editor de inputs dentro del diálogo de ejecución**: mezcla definición y valores; el diálogo no debe modificar la definición guardada.
- **Editor JSON crudo del array**: más rápido de implementar, pero peor UX y sin validación por fila.
- **Drag & drop para ordenar**: `forceFallback` y contenedores condicionales añaden complejidad sin beneficio para listas cortas.

---

## Problemas y riesgos encontrados

### P1 — `interpolationHighlight` asume `global`

- Hoy hace `roots.global?.[ref.segments[1] ?? '']`; con una referencia `params.x`, el resultado sería `undefined` y se pintaría como variable normal, pero el acceso directo a `global` puede romper si el ámbito cambia.
- **→ Riesgo MEDIO.** Reemplazar por una función que mire `ref.segments[0]`: `global` → comprobar `isSecret`; `params` → siempre `variable`.

### P2 — Linter con `params` vacío al montar

- Si `inputs` es `[]`, `params` no debe existir o el linter aceptaría cualquier `{{params.x}}`.
- **→ Riesgo MEDIO.** Construir `params` solo con las claves actuales (`Object.fromEntries`), no con un objeto vacío genérico; sin claves, `{{params.x}}` sigue dando `scope_not_available`/`unknown_variable`.

### P3 — Default que referencia una variable secreta

- El formulario carga metadatos enmascarados; sin la comprobación explícita, el default se guardaría y en ejecución se enviaría el marcador.
- **→ Riesgo ALTO.** Refinamiento asíncrono en `useCommandValidation` con `resolveInputDefaults` + `loadGlobalScopeMetadata()`; mostrar el mensaje `utils.inputs.errors.default_secret`.

### P4 — Opciones de `select` incompletas

- Cambiar el tipo a `select` sin opciones dejaría un campo imposible de rellenar.
- **→ Riesgo MEDIO.** Al cambiar a `select`, inicializar `options: [{ label: '', value: '' }]`; el schema rechaza opciones vacías o valores duplicados.

### P5 — Estado inicial y tipo del formulario

- `state` se declara `any` en `add.vue`/`edit.vue`, así que un `inputs` ausente no fallaría en compilación pero rompería el editor en tiempo de ejecución.
- **→ Riesgo MEDIO.** Añadir `inputs: []` al estado inicial y `inputs: InputFieldDefinition[]` al `defineModel` de `CommandForm.vue`; en edición viene de la fila.

### P6 — Crecimiento del formulario

- Un comando con muchos inputs puede hacer el formulario muy largo.
- **→ Riesgo BAJO.** Máximo 20 (schema) y tarjetas colapsables no previstas; el editor usa una tarjeta compacta por input.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Componente `CommandInputsEditor.vue`

1. Crear `src/components/form/CommandInputsEditor.vue`:
   - `defineModel<InputFieldDefinition[]>({ required: true })`.
   - Prop `globalScope?: GlobalVariableScope` para previsualizar los defaults.
   - Estado vacío con texto y botón «Añadir parámetro».
   - Por fila: `key` (`UInput`, placeholder `remote_dir`), `label`, `type` (`USelect` con los cuatro tipos), `required` (`USwitch`), `help` (`UInput`).
   - `default` condicional: `UInput` para `text`/`number`, `USwitch` para `boolean`, `USelect` para `select`.
   - `options` solo para `select`: lista de pares etiqueta/valor con alta/baja; al pasar a `select` sin opciones, crear una fila vacía.
   - Acciones: subir, bajar y eliminar (deshabilitar subir en la primera y bajar en la última; permitir eliminar siempre).
   - Al cambiar el tipo, limpiar `options` si deja de ser `select` y normalizar `default` (p. ej. `boolean` → `false` solo si había un default incompatible).
2. Mostrar junto al `default` el valor resuelto (`resolveInputDefaults([field], globalScope)`) cuando sea una expresión y la variable esté disponible; si hay issue, mostrarlo en rojo con el mensaje i18n.
3. No persistir nada en el componente: todo va por el `v-model`.

### Fase 2 — Integración en `CommandForm.vue`

1. Añadir `inputs: InputFieldDefinition[]` al `defineModel` (`:22-30`).
2. Importar `CommandInputsEditor` y añadir la sección entre `timeout` y `command`, con `UFormField name="inputs"` y las ayudas de `form.commands.inputs.*`.
3. Pasar `:global-scope="globalScope"` al editor.
4. Actualizar `interpolationRoots` a `{ global: globalScope, params }`, donde `params` es un `computed`:
   ```ts
   const paramsScope = computed(() =>
     Object.fromEntries(state.value.inputs.map(field => [field.key, field.default ?? ''])),
   )
   ```
   Solo incluir claves no vacías y únicas (el schema las valida al guardar; para el linter basta la primera).
5. Ajustar `interpolationHighlight` para resolver `global` y `params` sin asumir la raíz.
6. Añadir a `interpolationEntries` una entrada por input (`path: 'params.<key>'`, `label`, `detail` con el tipo, `secret: false`) y concatenarlas con las de `global`.
7. `getScopes` sigue devolviendo `Object.keys(interpolationRoots.value)`, así que `params` aparece cuando hay inputs.
8. Añadir un tip de autocompletado para `{{params.` en `variableTips`.

### Fase 3 — Validación dinámica de defaults

1. En `src/composables/validation/useCommandValidation.ts`, tras el schema estático del plan 1, añadir un refinamiento asíncrono del campo `inputs`:
   - Si no hay campos con `default` de cadena que contenga `{{`, no hacer nada.
   - Cargar `loadGlobalScopeMetadata()` una sola vez por validación.
   - Llamar a `resolveInputDefaults(fields, scope)` y, si hay issues, fallar con el `messageKey`/`messageParams` del primer issue.
   - Si la carga del ámbito falla, no bloquear el guardado (solo se aplicó la validación estática); dejar constancia en el historial del plan.
2. Confirmar que el refinamiento se aplica tanto a `insert` como a `update`.

### Fase 4 — i18n

1. Añadir a `src/locales/es/form/commands.ts` y `en` el bloque `inputs.*`:
   - `title`, `help`, `empty`, `add`
   - `key.{label,help,placeholder}`, `label.{label,placeholder}`, `type.{label,text,number,boolean,select}`
   - `required.{label,help}`, `default.{label,help,placeholder,resolved}`, `help.{label,placeholder}`
   - `options.{title,add,label,value,empty,remove}`
   - `actions.{move_up,move_down,remove}`
2. Añadir `variables.tips.params` (y, si se usa, `variables.tips.params_filter`).
3. Pedir al usuario que ejecute `bun run i18n:types` para regenerar `typed-locale.d.ts`.

### Fase 5 — Estado inicial y comprobaciones de tipo

1. Confirmar `inputs: []` en `add.vue` (añadido en el plan 1).
2. Revisar que `edit.vue` no necesita cambios: el loader devuelve la fila completa y el `v-model` la pasa a `CommandForm`.
3. Pedir al usuario que ejecute `bunx vue-tsc --noEmit`.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/components/form/CommandInputsEditor.vue` | **Nuevo.** Editor de filas de parámetros. |
| `src/components/form/CommandForm.vue` | `inputs` en el modelo, sección nueva, `params` en linter/resaltado/autocompletado y tips. |
| `src/composables/validation/useCommandValidation.ts` | Refinamiento asíncrono de defaults contra el ámbito global. |
| `src/pages/dashboard/commands/add.vue` | `inputs: []` (si no se hizo en el plan 1). |
| `src/locales/es/form/commands.ts` | Claves `inputs.*` y `variables.tips.params`. |
| `src/locales/en/form/commands.ts` | Espejo en inglés. |
| `typed-locale.d.ts` | Autogenerado por `bun run i18n:types` (no editar). |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Crear un comando y añadir dos parámetros (`remote_dir` de tipo `text` requerido y `use_sudo` de tipo `boolean` con default `true`); guardar y reabrir: se conservan el orden, los tipos y los defaults.
2. Subir, bajar y eliminar filas: el orden cambia y no se pierde ningún campo.
3. Cambiar un input a `select`: aparece el editor de opciones; sin opciones, el guardado falla con el mensaje correspondiente.
4. Escribir `{{params.remote_dir}}` en el script: no se marca error y aparece en el autocompletado; una clave inexistente se marca como error.
5. Renombrar `remote_dir` a `target_dir`: la referencia anterior queda marcada como huérfana.
6. `default: "{{global.deploy_path}}"`: se muestra el valor resuelto al lado; guardar con la variable habilitada funciona.
7. `default: "{{global.ghcr_pat}}"` con una variable secreta: el formulario rechaza el guardado con el mensaje de secreto.
8. `default: "{{global.no_existe}}"` o con una variable deshabilitada: se rechaza con el mensaje correspondiente.
9. Un `default` de tipo `number` con `"{{global.puerto}}"` y una variable no numérica: se rechaza al guardar.
10. Un comando sin inputs: no aparece la sección con filas y el editor de script sigue funcionando igual.
11. Guardar y ejecutar el comando desde el diálogo (cuando esté el plan 4): los parámetros llegan al script.

---

## Criterios de aceptación

- [ ] Existe `CommandInputsEditor.vue` con alta, baja, reordenación y edición de los cuatro tipos.
- [ ] `CommandForm.vue` incluye `inputs` en su modelo y la sección «Parámetros de entrada».
- [ ] El linter acepta `{{params.<key>}}` para las claves definidas y rechaza las no definidas.
- [ ] El autocompletado lista `params` y sus claves junto a `global`.
- [ ] El resaltado distingue `global` (con secretas en ámbar) y `params` (variable normal).
- [ ] Un `default` que referencia una variable global inexistente, deshabilitada o secreta se rechaza al guardar.
- [ ] Un `default` con una raíz distinta de `global` se rechaza (schema del plan 1).
- [ ] Los defaults de tipo `number` se validan como numéricos y los de `select` contra sus opciones.
- [ ] Un comando sin inputs se comporta y se ve como antes.
- [ ] Todas las cadenas visibles están en `src/locales/{es,en}/form/commands.ts`.
- [ ] No se modifica el diálogo de ejecución ni se añade render de valores.

### Desviaciones

- El editor recibe además `scopeLoaded` para no mostrar errores de `default` mientras se cargan los metadatos globales.
- Los valores de las opciones de `select` se guardan como cadena desde la UI (el contrato sigue admitiendo `number`); el default del `select` se guarda también como cadena.
- Se permite eliminar la última opción de un `select`: el editor muestra un aviso y el schema estático impide guardar (se cumple la comprobación del plan).
- El `default` de tipo `text`/`number` se guarda como texto; el schema y el runner lo coaccionan. Se elimina del contrato cuando el campo queda vacío.
- El `type` del default se normaliza al cambiar de tipo: `boolean` incompatible pasa a `false`; un default booleano se elimina al cambiar a otro tipo.
- El editor muestra la expresión `params.<clave>` junto al número de parámetro mediante una función (`paramExpression`), porque escribir las llaves dobles directamente en la plantilla rompe el compilador de Vue.
- Se actualizó la ayuda del cuadro de variables para mencionar los parámetros (`variables.help`) además del nuevo tip `variables.tips.params`.
- El componente se autoregistra con `unplugin-vue-components`; no se editó `components.d.ts`.
- Corrección posterior a la verificación: el `USelect` del valor por defecto recibía la opción vacía creada al cambiar a `select` (`value: ''`), que Reka UI rechaza («A <SelectItem /> must have a value prop that is not an empty string»). Se filtran los valores vacíos al construir los items y el schema rechaza guardar una opción con `value` vacío (`option_value_required`), como preveía el plan.

---

## Puntos abiertos

1. **Reordenación por arrastre:** si los botones arriba/abajo resultan incómodos, se puede añadir Sortable.js después con `forceFallback: true`; no se prevé en este plan.
2. **Valores numéricos en `select`:** el editor guarda cadenas; si se necesita un `select` numérico editable desde la UI, habrá que añadir un selector de tipo de valor por opción.
3. **Colapsar inputs:** con muchos parámetros, una tarjeta colapsable sería útil; fuera de alcance.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-18 | Plan creado en estado **Planificando**. |
| 2026-11-18 | Ejecutado: `CommandInputsEditor.vue`, integración en `CommandForm.vue` (`params` en linter/resaltado/autocompletado), refinamiento asíncrono de defaults y claves i18n. Estado **Ejecutando**, pendiente de verificación manual. |
| 2026-11-18 | Corrección tras la verificación: se filtran las opciones con `value` vacío en los `USelect` (editor y formulario de ejecución) y el schema las rechaza al guardar. |
| 2026-11-18 | El usuario lo dio por completado. Estado **Terminado**; plan archivado en `.agents/plans.done/`. Verificación manual pendiente. |
