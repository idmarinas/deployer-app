# Plan: Parámetros de entrada en comandos (2/5) — motor y ámbito `params`

## Estado

**Terminado** — el usuario lo dio por completado el 2026-11-18. Verificación manual (`bunx vue-tsc --noEmit`, `bun run build`) pendiente de que la ejecute el usuario.

**Diseño de origen:** `.agents/.done/designs/AGENTS.command-inputs.DESIGN.md` (aprobado el 2026-11-18). Corresponde al bloque 2 de §7 y a §6.1.2 y §6.2 del diseño.

**Dependencia:** requiere el plan `AGENTS.command-inputs-model.PLAN.md` (columna `inputs`, contrato y `CommandDefinition.inputs`).

**Orden de ejecución:** segundo de cinco. Los planes 3 y 4 consumen `resolveInputDefaults()`.

---

## Instrucciones dadas (verbatim)

> "Vamos a aparcar esto, y a mejorar el módulo de comandos. Para que pueda tener inputs de entrada"

> "Están bien esas decisiones que tomaste. Ahora crea el plan de implementación de esto."

Contexto aportado por el agente (análisis previo):

- `runCommand` / `runCustomCommand` / `executeCommand` comparten las raíces `{ global }` (`src/utils/commands/runner.ts:78`).
- `loadGlobalScopeForExecution()` devuelve las variables descifradas; `loadGlobalScopeMetadata()` devuelve las secretas enmascaradas. Ambos incluyen las deshabilitadas para poder distinguirlas.
- El motor de interpolación ya resuelve rutas anidadas para raíces distintas de `global` (`src/utils/interpolation/resolver.ts:60-80`), así que `{{params.x}}` funciona sin cambios.
- El runner descarta los `OutputChunk` de Rust (`channel.onmessage = () => {}`, `runner.ts:98`); el streaming queda fuera de este plan (diseño §9).

---

## Objetivo

Que un comando declare parámetros y los reciba al ejecutarse desde código:

- `runCommand(key, hostId, { params, working_dir, timeout_secs })` y `runCustomCommand(definition, hostId, { params })`.
- `resolveInputDefaults(fields, globalScope)` aplica los `default` (incluidas expresiones `{{global.slug}}`) y devuelve los valores resueltos más los errores.
- Validación de `required` y del tipo/`options` en el runner, no solo en la UI.
- Interpolación de `command` y `working_dir` con las raíces `{ global, params }`.

**No entra en este plan:** editor visual (plan 3), diálogo (plan 4), aviso de variables globales requeridas, `fail_on_nonzero`, streaming/cancelar ni tipos nuevos.

---

## Contexto técnico actual

| Elemento | Estado real |
| --- | --- |
| Runner | `src/utils/commands/runner.ts:24-131`. `runCommand` lee la fila y construye la definición; `executeCommand` carga `global`, interpola, invoca `ssh_execute_command` y lanza si `exit_code > 0`. |
| Opciones | Hoy el tercer argumento es inline `{ working_dir?, timeout_secs? }` (`runner.ts:27,66,74`). |
| Ámbito global | `loadGlobalScopeForExecution()` (`src/drizzle/lib/variables.ts`) devuelve `GlobalVariableScope` con `value`, `enabled` e `isSecret`. |
| Interpolación | `interpolateString` (`src/utils/interpolation/resolver.ts`) acepta `InterpolationRoots` y `{ maskSecrets }`; los errores son `InterpolationError` con `messageKey`/`messageParams`. |
| Redacción | `collectSecretValues(roots)` + `redactSecrets()` (`runner.ts:79,91,120`) evitan filtrar secretos en mensajes de error. |
| Consumidores | `src/components/overlay/CommandTestDialog.vue:163-174` y `src/pages/dashboard/hosts/[id]/(view).vue:135,194,297`. Ninguno pasa `params` todavía. |
| i18n | `src/locales/es/utils/commands.ts` (3 claves) y `src/locales/es/utils/inputs.ts` (creado en el plan 1). |

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-18 | **API retrocompatible.** El tercer argumento sigue siendo opcional y pasa a ser `CommandRunOptions` con `params`. Las llamadas actuales (`system_info`, etc.) no cambian. |
| 2026-11-18 | **Defaults en el runner.** Se resuelven también fuera de la UI, para que cualquier llamada programática (vista de host, futuros flujos) obtenga el mismo resultado. |
| 2026-11-18 | **Defaults solo con `global`.** Un `default` puede contener una o varias expresiones `{{global.<slug>}}` (incluido texto alrededor); cualquier otra raíz es error de validación del plan 1. |
| 2026-11-18 | **Secretas prohibidas.** `resolveInputDefaults` rechaza una variable con `isSecret`, aunque el ámbito de ejecución la tenga descifrada. Así el resultado no depende de qué loader se usó. |
| 2026-11-18 | **El valor explícito manda.** Un default solo se aplica si la clave no viene o es `undefined`/`null`; una cadena vacía es un valor explícito (y fallará `required` si el campo lo es). |
| 2026-11-18 | **Sin `inputs` declarados no hay `params`.** Se filtran las claves no declaradas antes de construir la raíz, para que el contrato sea el que está en la definición. |
| 2026-11-18 | **Coacción al tipo.** Los valores declarados se coaccionan (`number`, `boolean`, `select`) antes de interpolar; si no se pueden coaccionar, se lanza un error i18n y no se ejecuta. |
| 2026-11-18 | **Errores localizados.** `required` usa `utils.commands.errors.missing_params` con la lista de etiquetas; el resto usa las claves `utils.inputs.*` del plan 1. |
| 2026-11-18 | **Sin persistencia.** Los valores no se guardan ni se registran; solo viven en la ejecución. |

**Alternativas descartadas:**

- **Aplicar defaults solo en el diálogo**: una llamada desde código obtendría un resultado distinto; el runner es la fuente de verdad.
- **Permitir secretas en `default`**: en el diálogo llegarían enmascaradas y se enviaría el marcador como valor.
- **Escapar los valores como shell**: el motor también interpola `working_dir` y no todos los comandos son bash puro; el entrecomillado lo decide el autor (diseño §4).
- **Exponer claves no declaradas en `params`**: convierte un error de tipeo en un valor aceptado silenciosamente.

---

## Problemas y riesgos encontrados

### P1 — Fuga de una variable global secreta a través de un default

- Si se permitiera `default: "{{global.ghcr_pat}}"`, el valor secreto acabaría en un campo visible y, en el diálogo, en el marcador `BLANK_VALUE`.
- **→ Riesgo ALTO.** `resolveInputDefaults` comprueba `isSecret` en ambos contextos y devuelve un error `utils.inputs.errors.default_secret`. Probar con una variable secreta habilitada.

### P2 — `required` con valores falsy

- `false` y `0` son valores válidos; una comprobación `if (!value)` los trataría como ausentes.
- **→ Riesgo MEDIO.** `validateInputValues` usa una comprobación explícita de `undefined`/`null`/`''`; probar un booleano `false` requerido y un número `0` requerido.

### P3 — Coacción de números y selects

- `UInputNumber` puede devolver `null`; un `select` puede devolver un número o una cadena. Un valor inválido no debe ejecutar el comando.
- **→ Riesgo MEDIO.** Normalizar `null` a ausente, coaccionar con `Number()` y comprobar `Number.isFinite`; en `select`, comparar contra las `options` y devolver el valor de la opción. Probar con cadenas numéricas.

### P4 — Defaults editados con el diálogo abierto

- El diseño dice que se resuelven una vez al abrir el diálogo y otra en el runner; no son reactivos.
- **→ Riesgo BAJO.** Documentarlo en la ayuda del diálogo (plan 4) y no añadir watchers.

### P5 — Redacción de secretos en errores

- Un valor de `params` que coincida con un secreto global podría quedar redactado en un mensaje de error. Es el comportamiento actual de `redactSecrets` y no rompe la ejecución.
- **→ Riesgo BAJO.** Mantener `collectSecretValues(roots)` y `redactSecrets`; no añadir valores de `params` a la colección de secretos.

### P6 — Comandos internos y vista de host

- `system_info`, `system_metrics` y `upgradable_packages` no declaran inputs y se llaman sin `params`.
- **→ Riesgo MEDIO.** Con `inputs = []` no se aplica ningún default ni se filtra nada; verificar las tres llamadas de la vista de host.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — `resolveInputDefaults()`

1. Crear `src/utils/inputs/defaults.ts`:
   ```ts
   export interface InputDefaultIssue {
     key: string
     code: 'unknown' | 'disabled' | 'secret' | 'invalid_type' | 'invalid_option'
     messageKey: string
     messageParams: Record<string, unknown>
   }

   export interface ResolvedInputDefaults {
     values: InputValues
     issues: InputDefaultIssue[]
   }

   export function resolveInputDefaults(
     fields: InputFieldDefinition[],
     globalScope: GlobalVariableScope,
   ): ResolvedInputDefaults
   ```
2. Para cada campo con `default` distinto de `undefined`:
   - Si es cadena, buscar expresiones con `findReferences`; todas deben ser de raíz `global` (el plan 1 ya lo valida, pero se comprueba de nuevo por robustez).
   - Resolver cada slug contra `globalScope`: no existe → `unknown`; `enabled === false` → `disabled`; `isSecret` → `secret`.
   - Interpolar solo con `{ global: globalScope }` y coaccionar el resultado al tipo del campo; si falla, `invalid_type` / `invalid_option`.
   - Un `boolean` con `default` no literal es `invalid_type`.
3. Reexportar desde `src/utils/inputs/index.ts`.
4. Completar `src/locales/es/utils/inputs.ts` y `en` con `errors.default_unknown`, `errors.default_disabled`, `errors.default_secret` y `errors.default_type` (las claves ya están reservadas en el plan 1).

### Fase 2 — Opciones de ejecución

1. En `src/utils/commands/types.ts`, exportar:
   ```ts
   export interface CommandRunOptions {
     working_dir?: string
     timeout_secs?: number
     params?: InputValues
   }
   ```
2. Usar `CommandRunOptions` en `runCommand`, `runCustomCommand` y `executeCommand` (`runner.ts:27,66,74`).

### Fase 3 — Resolución y validación en el runner

1. En `executeCommand`, antes de interpolar:
   - `const fields = definition.inputs ?? []`.
   - `const resolved = resolveInputDefaults(fields, globalScope)`; si `issues.length > 0`, lanzar el primer error localizado (redactado con `secrets`, por si acaso).
   - Mezclar: base = `resolved.values`; para cada clave de `options?.params`, si está declarada y no es `undefined`/`null`, sustituir el valor (el explícito manda, incluida la cadena vacía).
   - Filtrar claves no declaradas.
   - Coaccionar cada valor con `coerceInputValue`; si falla, lanzar `utils.inputs.errors.value_invalid` con la etiqueta del campo.
   - `validateInputValues(fields, values)`; si hay `required` ausentes, lanzar `utils.commands.errors.missing_params` con la lista de etiquetas (separadas por comas).
2. Construir `const roots = { global: globalScope, params: values }` (`runner.ts:78`).
3. Mantener `collectSecretValues(roots)` y `redactSecrets` tal cual.
4. Interpolar `definition.command` y `options.working_dir` con las mismas raíces (`runner.ts:85-88`).
5. Añadir a `src/locales/es/utils/commands.ts` y `en`:
   - `missing_params`: `Faltan parámetros obligatorios: {keys}.`
   - Si se necesita un mensaje específico para un valor inválido, reutilizar `utils.inputs.errors.value_invalid` en lugar de duplicarlo.

### Fase 4 — Bordes y compatibilidad

1. Comprobar que `runCommand` sigue leyendo la definición de la BD y que `runCustomCommand` usa `definition.inputs` (necesario para el diálogo ad-hoc del plan 4).
2. Revisar que `working_dir` con `{{params.x}}` se interpola y que un `params` ausente en un comando sin inputs no cambia nada.
3. Revisar que un comando con `inputs` y sin `params` en la llamada aplica los defaults; si un requerido no tiene default, lanza el error antes de abrir SSH.
4. No tocar Rust ni el contrato de `ssh_execute_command`.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/utils/inputs/defaults.ts` | **Nuevo.** `resolveInputDefaults()` y sus tipos de issue. |
| `src/utils/inputs/index.ts` | Reexportar `defaults.ts`. |
| `src/utils/inputs/schema.ts` | Reutilizar/ajustar `coerceInputValue` y `validateInputValues` si hace falta. |
| `src/utils/commands/types.ts` | `CommandRunOptions` con `params`. |
| `src/utils/commands/runner.ts` | Resolución de defaults, validación, raíces `{ global, params }` y uso de `CommandRunOptions`. |
| `src/locales/es/utils/inputs.ts` | Errores `default_*` y `value_invalid`. |
| `src/locales/en/utils/inputs.ts` | Espejo en inglés. |
| `src/locales/es/utils/commands.ts` | `errors.missing_params`. |
| `src/locales/en/utils/commands.ts` | Espejo en inglés. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Comando con un input `text` requerido sin default: `runCommand(key, hostId)` lanza el error de parámetros faltantes **antes** de conectar por SSH.
2. `runCommand(key, hostId, { params: { texto: 'hola' } })`: el script recibe `hola` y la salida es la esperada.
3. Input `boolean` requerido con valor `false` y input `number` requerido con valor `0`: se consideran presentes y el comando se ejecuta.
4. Input `number` con `default: 5`: `runCommand(key, hostId, { params: {} })` lo aplica; `{ params: { n: 7 } }` usa `7`.
5. Input `text` con `default: "{{global.deploy_path}}"` y la variable habilitada: se aplica el valor de la variable. Si la variable está deshabilitada, es inexistente o es secreta, la ejecución falla con el mensaje correspondiente.
6. Input `select` con `default: "production"` y opciones `development`/`production`: se aplica; un valor fuera de las opciones o un `default` que no está en ellas falla.
7. Input usado en `working_dir`: `runCommand(key, hostId, { working_dir: '{{params.dir}}', params: { dir: '/tmp' } })` ejecuta en `/tmp`.
8. Llamar con una clave no declarada en `params`: no se expone en el script y, si el script la referencia, el error es de interpolación (`unknown_variable`).
9. Comando sin inputs: `system_info`, `system_metrics`, `upgradable_packages` y la vista de host siguen funcionando igual.
10. Un error de ejecución con una variable global secreta en el comando no muestra el valor secreto (redacción intacta).

---

## Criterios de aceptación

- [ ] `CommandRunOptions` incluye `params?: InputValues` y se usa en las tres funciones del runner.
- [ ] `resolveInputDefaults()` devuelve valores resueltos e issues tipados, sin depender de la UI.
- [ ] Un `default` con variable global secreta, deshabilitada o inexistente produce un error claro y no ejecuta.
- [ ] Un `default` con una raíz distinta de `global` no se resuelve.
- [ ] Los defaults se aplican cuando la clave no viene; el valor explícito (incluida la cadena vacía) manda.
- [ ] `required` considera presentes `false` y `0`, y ausentes `undefined`, `null` y `''`.
- [ ] Las claves no declaradas no se exponen en `{{params.*}}`.
- [ ] `command` y `working_dir` se interpolan con `{ global, params }`.
- [ ] Los comandos sin inputs se comportan exactamente como antes.
- [ ] Los mensajes de error están en `src/locales/{es,en}/utils/{commands,inputs}.ts`.
- [ ] No se modifica Rust ni se persisten valores de entrada.

### Desviaciones

- Los `messageKey` y `messageParams` de `InputDefaultIssue`/`InputValueIssue` son uniones literales (`InputDefaultMessageKey`, `InputValueMessageKey`) en lugar de `string`, para que `t()` valide las claves.
- `resolveInputDefaults()` valida también los `default` literales (tipo y opciones), no solo las expresiones; el schema del plan 1 ya los rechaza al guardar, así que en la práctica solo se ejecuta para los que llegan a la BD.
- Los errores de valores (`value_invalid`) conservan el mensaje genérico de `utils.inputs.errors.value_invalid`; no se añadió una clave nueva para distinguir `invalid_option`.
- Un valor explícito `null` o `undefined` se trata como ausente y deja pasar el default; la cadena vacía es explícita y falla `required` si el campo es obligatorio.
- Los campos declarados sin valor se rellenan con `''` (o `false` en booleanos) para que `{{params.opcional}}` no produzca `unknown_variable`.

---

## Puntos abiertos

1. **Valores de `select` numéricos:** se comparan contra `options` con coacción; si en la práctica todos los `select` son de cadenas, se puede simplificar sin migración.
2. **Recarga de defaults:** si el usuario edita una variable global con el diálogo abierto, el default no cambia hasta reabrirlo (decisión del diseño, no un fallo).

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-18 | Plan creado en estado **Planificando**. |
| 2026-11-18 | Ejecutado: `defaults.ts`, `CommandRunOptions`, resolución y validación en el runner, locales `default_*` y `missing_params`. Estado **Ejecutando**, pendiente de verificación manual. |
| 2026-11-18 | El usuario lo dio por completado. Estado **Terminado**; plan archivado en `.agents/plans.done/`. Verificación manual pendiente. |
