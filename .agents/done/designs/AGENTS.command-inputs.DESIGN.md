# Diseño: Parámetros de entrada en comandos

> **Estado: Implementado** (Propuesta → Aprobado → Implementado; solo el usuario cambia el estado).
> Aprobado por el usuario el 2026-11-18; la implementación se repartió en cinco planes (`.agents/done/plans/AGENTS.command-inputs-*.PLAN.md`), terminados el 2026-11-18.
> Este documento **no es un plan**.
> No se ejecuta nada hasta que el usuario pase los planes a **Pendiente**.
>
> **Revisión (2026-11-18):** el usuario confirma columna JSON `inputs`, tipos v1 `text`/`number`/`boolean`/`select`, diálogo de ejecución único (ampliar «Probar») y sustitución literal con vista previa.
>
> **Revisión (2026-11-18, 2):** no se añade tipo `list`; las listas (p. ej. paquetes) se pasan como **texto separado por espacios**. Ver §6.1.1.
>
> **Revisión (2026-11-18, 3):** tras comparar con `.agents/designs/AGENTS.node-workflows.DESIGN.md`, el contrato de input y el render de valores pasan a ser **compartidos** con los flujos (§6.1) y los `default` pueden resolver **variables globales** (§6.1.2). El resto de extrapolaciones (aviso de variables requeridas, `fail_on_nonzero`, streaming/cancelar, `module`/`submodule`) se aplazan y quedan anotadas en §9.

---

## 1. Tarea original (verbatim)

> Vamos a aparcar esto, y a mejorar el módulo de comandos. Para que pueda tener inputs de entrada

Contexto previo del chat (también verbatim, para no perder el caso de uso que lo motivó):

> No, me referia a un comando como por ejemplo el de system_info, que esta guardando en el módulo comandos, en la Base de datos. Se podría crear el comando, y permitir que se actualice, de esta forma, no es necesario averiguar el sistema de paquetes del servidor,

---

## 2. Objetivo

Que un comando guardado en `deployer_commands` pueda **declarar parámetros de entrada** y que se pidan al ejecutarlo, de modo que el mismo comando sirva para varios casos sin duplicarlo ni construirlo a mano en TypeScript.

Ejemplo que lo motiva (sustituir `host_update_packages`): un único comando `update_packages` con los inputs `packages` (texto, opcional) y `use_sudo` (booleano, por defecto `true`), que en el propio servidor detecta `apt`/`dnf`/`yum`.

**Alcance de la primera versión:**

- Entra: definir inputs en el formulario del comando, interpolarlos en el script, pedirlos al ejecutar (diálogo), validarlos y previsualizar el comando resuelto.
- No entra: valores persistentes por comando, inputs de tipo fichero/SFTP, expresión de condiciones entre inputs, herencia de inputs entre comandos, ni inputs en la consola SSH suelta.

Casos de uso iniciales:

- `update_packages` con `packages` + `use_sudo` (el caso que originó la idea).
- Comandos de despliegue con `remote_dir`, `branch`, `restart_service`.
- Comandos de consulta con un filtro o un límite (`grep` acotado, `journalctl -n N`).

---

## 3. Estado actual relevante (verificado en el código)

| Elemento | Estado real |
| --- | --- |
| Tabla `deployer_commands` | `src/drizzle/entities/commands.ts:6-21`. Columnas: `key` (PK), `name` (UNIQUE), `description` (JSON TipTap), `command`, `parser` (JSON), `timeout`, `custom`, `enabled`, `internal`, timestamps. **No hay columna de inputs.** |
| Precedente de columna JSON | `parser: text({ mode: 'json' }).$type<OutputParser>()` (`commands.ts:13`). Mismo patrón reutilizable para `inputs`. |
| Tipo `Command` | `src/types/entities.ts:3` → `typeof commands.$inferSelect`. Añadir columna al schema amplía el tipo sin tocar nada más. |
| Definición en el runner | `CommandDefinition` (`src/utils/commands/types.ts:8-19`): `id`, `name`, `command`, `parser`, `timeout_secs`. Sin parámetros. |
| Ejecución | `runCommand` / `runCustomCommand` / `executeCommand` (`src/utils/commands/runner.ts:24,63,71`). **Las raíces de interpolación son fijas: `{ global }`** (`runner.ts:78`); el payload SSH se arma en `runner.ts:100-111`; `exit_code > 0` lanza error (`runner.ts:119-121`). |
| Motor de interpolación | Ya reconoce la raíz `params` (`src/utils/interpolation/types.ts:10`: `global, vars, params, nodes, workflow, run, node`). Resuelve rutas anidadas para raíces no-`global` (`resolver.ts:60-80`), así que `{{params.x}}` funciona sin tocar el motor. |
| Linter del editor | `CommandForm.vue:51-68` valida con raíces `{ global }`; una referencia a `params` daría `scope_not_available`. |
| Autocompletado | `CommandForm.vue:124-141` + `src/plugins/codemirror/autocomplete/variables.ts`: lista los ámbitos de `Object.keys(interpolationRoots.value)` y las entradas de `getEntries()`, que hoy solo salen del ámbito `global`. |
| Formulario | `src/components/form/CommandForm.vue` (`v-model` con `key/name/description/command/parser/timeout/enabled`). No existe editor de inputs. |
| Validación | `useCommandValidation.ts`: `createInsertSchema`/`createUpdateSchema` de `drizzle-orm/zod` sobre la tabla, con refinamientos. Añadir la columna extiende el schema Zod automáticamente (habrá que refinarla). |
| Diálogo de ejecución | `CommandTestDialog.vue`: selector de host (`SelectHost`), preview interpolado/original, salida (`RemoteOutput`) y ejecución con `runCommand` o `runCustomCommand` (líneas 163-174). Sus props son `title/description/command/parser/timeout/commandKey`. |
| Punto de entrada | Acción «Probar» en el listado (`pages/dashboard/commands/index.vue:70-91`) y en el toolbar de edición (`[key]/edit.vue:38-63`), vía `useCommandTestDialog` (`composables/useDialog.ts:53-64`). |
| Seed | `src/composables/deployer/seed_data/commands.ts:154-171`. `seedColumns` incluye `command`/`parser`/`timeout`; `seedWhere: custom = '0'`. No incluye `inputs` porque no existe. |
| Migraciones | `drizzle.config.ts` apunta a `./src/drizzle/entities` y `out: './migrations'`; `bun run drizzle:generate` ejecuta `scripts/migrate-drizzle.ts` (drizzle-kit generate + aplanado a `src-tauri/migrations/*.sql`, embebido por sqlx). |
| Diseño previo relacionado | `.agents/designs/AGENTS.node-workflows.DESIGN.md` §8.1 ya define `WorkflowInput` (`text \| number \| boolean \| select \| host`) y usa la raíz `params`. El contrato se extrae a `src/utils/inputs/` y lo comparten ambos (§4, §6.1). |

Consecuencia: la funcionalidad es un cambio **solo de frontend + esquema**: el motor de interpolación, el transporte SSH (`ssh_execute_command`) y el runner ya aceptan todo lo necesario salvo pasar el ámbito `params`.

---

## 4. Decisiones acordadas

| Fecha | Decisión |
| --- | --- |
| 2026-11-18 | **Almacenamiento:** columna JSON `inputs` en `deployer_commands` (`text({ mode: 'json' }).$type<InputFieldDefinition[]>()`), con el precedente de `parser`. Sin tabla hija. |
| 2026-11-18 | **Contrato del input:** reutilizar la forma de `WorkflowInput` para que comandos y flujos compartan tipo: `{ key, label, type, required, default?, options?, help? }`. |
| 2026-11-18 | **Contrato y render compartidos:** los tipos viven en `src/utils/inputs/` (no en `src/utils/commands/`) y el bloque de valores es un `InputsForm.vue` reutilizable por el diálogo de comandos y, más adelante, por el de flujos. La validación Zod también es compartida. |
| 2026-11-18 | **Defaults con variables globales:** un `default` de tipo `text`/`number`/`select` puede ser una expresión `{{global.slug}}`, resuelta al abrir el diálogo y en el runner. Prohibido usar secretas (llegarían enmascaradas) y cualquier otra raíz. |
| 2026-11-18 | **Tipos de input v1:** `text`, `number`, `boolean`, `select`. Sin `host` (el host se elige en el diálogo de ejecución) y sin ficheros. |
| 2026-11-18 | **Listas:** sin tipo `list`. Una lista de valores se pasa como **texto separado por espacios** (§6.1.1); el llamante hace el `join(' ')` y valida los elementos. |
| 2026-11-18 | **Secretos:** **no hay inputs secretos.** Los secretos son variables globales (`deployer_variables.is_secret`) y se referencian con `{{global.slug}}`, igual que en el diseño de flujos (§8.3). |
| 2026-11-18 | **Referencia en el script:** `{{params.<key>}}` (raíz ya reservada por el motor). |
| 2026-11-18 | **Escapado:** sustitución literal, igual que `{{global.*}}`. El autor decide las comillas en el script según el uso: entrecomilla un valor único (`"{{params.path}}"`) y **no** entrecomilla una lista (§6.1.1). El diálogo muestra la vista previa resuelta antes de ejecutar. |
| 2026-11-18 | **Valores:** no se persisten. `default` se precarga en el diálogo; `required` se valida antes de ejecutar. |
| 2026-11-18 | **Ejecución:** `runCommand(key, hostId, { params, working_dir, timeout_secs })` y `runCustomCommand(definition, hostId, { params })`; las raíces pasan a ser `{ global, params }`. |
| 2026-11-18 | **UI de ejecución:** evolucionar `CommandTestDialog` (mismo diálogo para probar y ejecutar) añadiendo el render de inputs; se mantiene el selector de host y la salida. |
| 2026-11-18 | **UI de definición:** nueva sección «Parámetros de entrada» en `CommandForm.vue` (o componente `CommandInputsEditor.vue`) con alta/baja/reordenación de filas. |
| 2026-11-18 | **Editor:** el linter del script valida `{{params.x}}` contra los inputs definidos **en el mismo formulario** (raíz `params` construida con sus keys y defaults) y el autocompletado lista `params` y sus claves. |
| 2026-11-18 | **Seed:** añadir `inputs` a `seedColumns` para que «Restaurar predeterminados» sincronice también los inputs. |
| 2026-11-18 | **Compatibilidad:** columna `[]` por defecto: los comandos existentes y los internos (`system_info`, `system_metrics`, `upgradable_packages`) siguen funcionando sin cambios. |

**Alternativas descartadas:**

- **Tabla hija `deployer_command_inputs`**: integridad referencial y consultas por input que hoy no se necesitan; añade CRUD, papelera y orden manual que hay que mantener sincronizados con el comando, y complica el seed (upsert atómico de una fila → varias filas). Se puede migrar a tabla más adelante sin cambiar el contrato JSON.
- **Pasar los valores por variables de entorno remotas** (`export VAR=...` + script): exige tocar el contrato con Rust o prefijar el comando en TS, y deja el script menos legible que `{{params.x}}`; además rompe la simetría con `{{global.*}}`.
- **Guardar los valores en `deployer_variables`** para reutilizarlos: las variables son globales y estáticas; los inputs son datos por ejecución (lista de paquetes de un clic), y ensucia el módulo de variables.
- **Escapado automático de los valores**: el motor es genérico y también interpola `working_dir`; escapar "como shell" de forma implícita rompería otros usos y daría una falsa sensación de seguridad (no todos los comandos son bash puro). Se resuelve con vista previa + entrecomillado en el script.
- **Inputs de tipo `host`**: el host ya se elige con `SelectHost` en el diálogo; un input `host` duplicaría el concepto en la v1.
- **Duplicar el contrato de input en comandos y flujos** (`CommandInput` + `WorkflowInput`): cada uno evolucionaría por su lado y habría dos renderers para los mismos cuatro tipos, con dos validaciones distintas de `required`/`default`. Se comparte en `src/utils/inputs/` (§6.1).
- **Input de tipo `list` (array nativo)**: se decidió no incluirlo en la v1; una lista se pasa como texto separado por espacios (§6.1.1). Implicaría un tipo más, widget de tags y validación por elemento.

---

## 5. Conceptos

- **Input (parámetro de entrada)**: campo declarado por un comando que se pide antes de ejecutarlo. Vive en la definición del comando (`deployer_commands.inputs`), no en la ejecución.
- **Valor de entrada**: lo que el usuario rellena en el diálogo para una ejecución concreta. Solo existe en memoria durante esa ejecución.
- **Ámbito `params`**: raíz de interpolación que expone los valores de entrada al script (`{{params.packages}}`). Es distinto de `global` (variables persistentes, posiblemente secretas).
- **Comando ejecutable**: comando con `enabled = 1`, `deleted_at IS NULL` y todos los inputs `required` presentes. Es la condición que ya exige `runCommand` (`runner.ts:40-46`) más la nueva de inputs.

---

## 6. Diseño técnico

### 6.1. Modelo de datos

Columna nueva en `src/drizzle/entities/commands.ts`:

```ts
export const commands = sqliteTable('deployer_commands', {
  // …
  inputs: text({ mode: 'json' }).$type<InputFieldDefinition[]>().notNull().default([]),
})
```

El contrato **no vive en el módulo de comandos**: al ser el mismo que el de los flujos (§8.1 de `AGENTS.node-workflows.DESIGN.md`), se extrae a `src/utils/inputs/` para que ambos lo importen sin duplicarlo.

```ts
// src/utils/inputs/types.ts — contrato compartido comandos ↔ flujos
export type InputFieldType = 'text' | 'number' | 'boolean' | 'select'

export interface InputFieldOption {
  label: string
  value: string | number
}

export interface InputFieldDefinition {
  /** Slug estable usado en `{{params.<key>}}` */
  key: string
  label: string
  type: InputFieldType
  required: boolean
  /** Literal o expresión `{{global.slug}}` (solo text/number/select) */
  default?: string | number | boolean
  options?: InputFieldOption[]
  help?: string
}
```

Estructura prevista del módulo, siguiendo el patrón de `src/utils/interpolation/`:

| Archivo | Contenido |
| --- | --- |
| `types.ts` | `InputFieldType`, `InputFieldOption`, `InputFieldDefinition`, `InputValues` (`Record<string, string \| number \| boolean>`) |
| `schema.ts` | `inputFieldSchema`, `inputFieldsSchema` (array con `key` únicas, máximo 20) y `validateInputValues(fields, values)` |
| `defaults.ts` | `resolveInputDefaults(fields, globalScope)` (§6.1.2) |
| `index.ts` | Reexportaciones |

`deployer_commands.inputs` y `CommandDefinition.inputs?` usan `InputFieldDefinition[]`. Cuando se implemente el motor de flujos, `WorkflowInput` pasa a ser un alias de `InputFieldDefinition` y `InputFieldType` crece con `'host'`; el schema de comandos sigue rechazando `host` y cualquier otro tipo fuera de los cuatro de la v1.

El render de **valores** también es compartido: `src/components/form/inputs/InputsForm.vue` recibe `fields: InputFieldDefinition[]` y `v-model: InputValues`, y pinta un `UFormField` por input con el control de su tipo (`UInput`, `UInputNumber`, `USwitch`, `USelect`). Lo usan el diálogo de comandos (§6.4) y, más adelante, el diálogo de ejecución de flujos. El **editor de definición** sí es específico del formulario de comandos (`CommandInputsEditor.vue`, §6.3): editar `key`/`options` no forma parte del render de valores.

Reglas de validación (Zod, en `useCommandValidation.ts` vía refinamiento del campo, usando `inputFieldsSchema`):

- `key`: `^[a-z][a-z0-9_]*$`, único dentro del array, sin chocar con nada reservado (no hace falta lista negra: el prefijo `params.` ya aísla).
- `label`: no vacío, longitud acotada.
- `select`: `options` con al menos una entrada y `value` único.
- `default` coherente con el tipo (`boolean` ↔ booleano, `number` ↔ numérico, y `default` ∈ `options` en `select`).
- Si `default` es una expresión: solo `{{global.<slug>}}`, la variable debe existir, estar habilitada y **no ser secreta** (§6.1.2).
- Máximo razonable de inputs por comando (p. ej. 20) para que el diálogo no se convierta en un formulario gigante.

Migración: `bun run drizzle:generate --name commands_inputs` genera el directorio en `migrations/` y aplana a `src-tauri/migrations/`. En SQLite el `ADD COLUMN` con `NOT NULL DEFAULT '[]'` es válido; si drizzle-kit recrea la tabla, sqlx lo aplica igual.

### 6.1.1. Listas de valores (sin tipo `list`)

Los valores de un input son siempre `string | number | boolean`. Una lista se representa como **una cadena con los elementos separados por espacios**, que es justo lo que el shell remoto necesita para aplicar *word splitting*:

```bash
# Definición del input
{ key: 'packages', label: 'Paquetes', type: 'text', required: false }

# Llamada desde TableServerUpdates
runCommand('update_packages', hostId, {
  params: { packages: seleccionados.join(' '), use_sudo: true },
})

# Script del comando (sin comillas alrededor de {{params.packages}})
if [ -n "{{params.packages}}" ]; then
  $sudo_cmd apt-get install --only-upgrade -y {{params.packages}}
else
  $sudo_cmd apt-get upgrade -y
fi
```

Reglas de esta convención:

- **No entrecomillar** la expresión de una lista en el script (con comillas llegarían todos los elementos como un único argumento). Sí se entrecomilla cuando solo se comprueba vacío (`[ -n "…" ]`).
- El motor no separa nada: interpola la cadena tal cual. En el diálogo, el campo es un `UInput` normal y el usuario escribe los elementos separados por espacios.
- **El llamante valida los elementos** antes de unirlos cuando el valor sea dinámico (caso de `TableServerUpdates`: nombres de paquete). Sin ese filtro se hereda el riesgo de inyección que hoy tiene `pkgs.join(" ")` en `updates.rs:132,142,148`.
- Una lista vacía se interpola como cadena vacía: por eso el script debe comprobarla con `[ -n "…" ]` antes de usarla.

### 6.1.2. `default` con variables globales

Un `default` puede ser un literal o una expresión `{{global.<slug>}}`, igual que el resto de la plantilla:

```json
{ "key": "remote_dir", "label": "Directorio remoto", "type": "text", "required": true, "default": "{{global.deploy_path}}" }
```

Reglas:

- **Solo la raíz `global`.** Cualquier otro ámbito (`params`, `vars`, `nodes`, `run`…) en un `default` es un error de validación. No hay dependencias entre inputs: un `default` no puede referenciar otro `params`.
- La variable referenciada debe **existir, estar habilitada y no ser secreta**. En el diálogo una secreta llegaría enmascarada (`BLANK_VALUE` desde `loadGlobalScopeMetadata`) y se enviaría el marcador como valor, así que se rechaza al guardar y al abrir el diálogo.
- Solo aplica a `text`, `number` y `select`. En `boolean` el `default` es siempre literal: un interruptor precalculado por una variable global es más confuso que útil.
- El valor resuelto se **coacciona al tipo**: `number` exige un número finito; `select` exige un valor presente en `options`. Si la coacción falla, el input queda vacío y el problema se muestra como error, sin ejecutar.
- `required` se evalúa **después** de aplicar los defaults, y `false` y `0` cuentan como valor presente.
- Se resuelve **una vez al abrir el diálogo** (cuando ya está cargado el ámbito global) y otra vez en el runner. No es reactivo: si se edita la variable global con el diálogo abierto, hay que reabrirlo.
- El valor resuelto no se persiste: vive en el estado del diálogo o en la ejecución, como el resto de `params`.

Puntos de resolución:

| Contexto | Ámbito usado | Nota |
| --- | --- | --- |
| Diálogo | `loadGlobalScopeMetadata()` (secretas enmascaradas) | El rechazo de secretas evita mostrar/enviar el marcador |
| Runner (`runCommand`/`runCustomCommand`) | `loadGlobalScopeForExecution()` (secretas descifradas) | El helper rechaza igualmente las secretas, para que el comportamiento no dependa del contexto |

Claves i18n previstas: `utils.inputs.errors.default_scope` (raíz no permitida), `utils.inputs.errors.default_unknown` (variable inexistente), `utils.inputs.errors.default_disabled`, `utils.inputs.errors.default_secret`, `utils.inputs.errors.default_type`.

### 6.2. Motor de ejecución

`runner.ts`:

```ts
export interface CommandRunOptions {
  working_dir?: string
  timeout_secs?: number
  params?: InputValues
}

// executeCommand:
const roots = { global: globalScope, params: options?.params ?? {} }
```

- `runCommand(key, hostId, options)` y `runCustomCommand(definition, hostId, options)` aceptan `params` (retrocompatible: el tercer argumento ya es opcional y las llamadas actuales no lo pasan).
- La interpolación de `command` y `working_dir` usa las mismas raíces (`runner.ts:85-88`), así que un input puede usarse en `working_dir`.
- **Validación en el runner, no solo en la UI**: si el comando declara inputs `required` y falta alguno, lanzar un error i18n (`utils.commands.errors.missing_params` con la lista). Así cualquier llamada programática (vista de host, futuros flujos) falla rápido.
- Los `default` se aplican en el runner cuando la clave no viene (misma fuente de verdad para UI y ejecución programática), resolviendo las expresiones `{{global.slug}}` con `resolveInputDefaults()` (§6.1.2) antes de validar `required`.
- `redactSecrets` no cambia: no hay inputs secretos; los secretos siguen viniendo de `global`.
- `CommandDefinition` gana `inputs?: InputFieldDefinition[]`; `runCommand` la rellena desde la fila (`runner.ts:48-54`).

### 6.3. Editor de definición (`CommandForm.vue`)

Sección nueva, debajo de `parser` o antes de `timeout`:

- Lista de inputs con alta/baja y controles: `key` (slug), `label`, `type` (select), `required` (switch), `default` (input según tipo), `help`, y `options` (pares etiqueta/valor) cuando el tipo es `select`. El campo `default` acepta `{{global.slug}}` (§6.1.2) y muestra al lado el valor resuelto si la variable está disponible; la validación reutiliza el ámbito global que el formulario ya carga para el linter.
- Mismo lenguaje visual que el editor de reglas del parser (tarjetas con borde, botón de borrar deshabilitado cuando queda una sola fila) para no introducir patrones nuevos.
- El `v-model` del formulario incorpora `inputs`, y `add.vue`/`[key]/edit.vue` no necesitan cambios de lógica.
- El autocompletado y el linter usan `params` poblado con `state.inputs`:
  - `interpolationRoots` pasa a `{ global, params }` (los `params` son los inputs con su `default`; al linter solo le importan las claves, así que un `default` con expresión se usa sin resolver).
  - `interpolationEntries` añade una entrada por input (`path: params.<key>`, `label`, `detail` con el tipo).
  - `getScopes` ya devuelve `Object.keys(roots)` (`CommandForm.vue:140`), así que `params` aparece solo.
  - Al renombrar un `key`, el linter marca las referencias huérfanas (comportamiento actual de `unknown_variable`).

### 6.4. Diálogo de ejecución (`CommandTestDialog.vue`)

Se mantiene un único diálogo (probar y ejecutar es lo mismo cambiando el host):

1. Selector de host (sin cambios) + nuevo bloque «Parámetros» renderizado con el `InputsForm` compartido (§6.1) a partir de `inputs`.
2. El `InputsForm` pinta cada control (`UInput`, `UInputNumber`, `USwitch`, `USelect`) con `help` como texto de ayuda del `UFormField`.
3. Estado inicial: `resolveInputDefaults(inputs, globalScope)` (§6.1.2) con el ámbito de metadatos ya cargado al montar; si un default no se puede resolver, el campo queda vacío y el error se muestra en el panel. `required` se valida después, antes de habilitar «Ejecutar».
4. Vista previa ya existente: debe incluir los `params` resueltos. Se amplía `interpolateSegments` con las raíces `{ global, params }` y se resaltan igual que las variables.
5. Al ejecutar, `runCommand(commandKey, hostId, { params })` o `runCustomCommand({ ..., inputs }, hostId, { params })`, para que el botón «Probar» del formulario pruebe los inputs sin guardar.
6. Errores de validación `params.*` en el mismo panel de issues que hoy muestra `errors`/`warnings`.

`useCommandTestDialog` (`composables/useDialog.ts`) gana `inputs?: InputFieldDefinition[]` en sus opciones; el listado y el toolbar de edición pasan `row.original.inputs` / `state.value.inputs`.

### 6.5. Seguridad y robustez

- Los valores no se guardan ni se registran: solo viven en memoria y viajan dentro del comando SSH de esa ejecución.
- La vista previa muestra el comando resuelto antes de ejecutar (con los valores de `global` secretos enmascarados como hoy).
- La responsabilidad del entrecomillado es del autor del comando; se documenta con un ejemplo de valor único entrecomillado (`"{{params.path}}"`) y de lista sin comillas (§6.1.1) en la ayuda del editor.
- Los inputs de tipo `select` permiten acotar valores a una lista, que es la forma recomendada cuando el valor acaba en una posición sensible.
- Límites de longitud por tipo para evitar comandos desmesurados.
- Las listas viajan como texto separado por espacios (§6.1.1): el llamante valida los elementos; el diálogo muestra el valor completo en la vista previa antes de ejecutar.
- Los `default` solo pueden resolver variables globales **no secretas** (§6.1.2): el valor precargado nunca es un secreto y no se escribe en la BD.

---

## 7. Bloques de implementación

> Cada bloque es un plan independiente en `.agents/plans/` (creados el 2026-11-18, estado **Planificando**).

1. **Modelo y contrato**: columna `inputs`, módulo compartido `src/utils/inputs/` (`types`, `schema`, `defaults`), `CommandDefinition.inputs`, migración (`drizzle:generate` + aplanado), `seedColumns` y validación Zod del campo.
2. **Motor y ámbito `params`**: `params` en `runCommand`/`runCustomCommand`, resolución y aplicación de defaults (incluidas expresiones `{{global.*}}`), validación de `required` con error i18n y `redactSecrets` revisado.
3. **Definición en el formulario**: `CommandInputsEditor.vue` en `CommandForm.vue` + linter/autocompletado de `params` contra los inputs del propio formulario + claves i18n (`form.commands.inputs.*`).
4. **Ejecución con inputs**: `InputsForm.vue` compartido y `CommandTestDialog` con el bloque de parámetros, defaults resueltos, validación, vista previa resuelta, paso de `params` y `inputs` desde listado y toolbar; claves i18n de `dialogs.commands.test.*` y `utils.inputs.*`.
5. **Documentación y changelog**: `AGENTS.frontend.md` (§ comandos/formularios), `docs/content/{es,en}` del módulo comandos y entrada de changelog de la versión.

---

## 8. Verificación prevista

> Orientativa. La verificación la hace el usuario.

- Crear un comando con un input `text` requerido y otro `boolean` con default; guardarlo y reabrirlo: los inputs se conservan y en el orden definido.
- En el editor, `{{params.<key>}}` no marca error y aparece en el autocompletado; una key inexistente se marca como error.
- Probar el comando sin guardar: el diálogo pide los valores, aplica el default, bloquea «Ejecutar» si falta un requerido y la vista previa muestra el comando resuelto.
- Input con `default: "{{global.deploy_path}}"`: el diálogo lo muestra ya resuelto y `runCommand(key, hostId, { params: {} })` aplica el mismo valor desde código.
- Guardar un `default` que referencia una variable global secreta o deshabilitada: el formulario lo rechaza con el mensaje correspondiente.
- Guardar un `default` con `{{params.otro}}` o cualquier raíz distinta de `global`: el formulario lo rechaza.
- Ejecutar contra un host: la salida coincide con el comando interpolado y `exit_code` se refleja.
- Comando sin inputs: se comporta exactamente como hoy (no aparece el bloque de parámetros).
- Comando interno (`system_info`, `system_metrics`, `upgradable_packages`) y vista de host: siguen funcionando sin cambios.
- Tras `bun run drizzle:generate`: existe un `.sql` nuevo en `src-tauri/migrations/` y los comandos existentes conservan sus datos.

---

## 9. Puntos abiertos / futuras fases

- **Valores persistentes por comando** («recordar últimos valores»): requeriría decidir dónde se guardan (¿`settings`?) y si son sensibles. Fuera de la v1.
- **Input de tipo `textarea`** para scripts o listas largas: la v1 usa `text`; añadirlo es un tipo más en el `switch` de render.
- **Input de tipo `list` (array nativo)**: `string[]` con separador configurable, validación por elemento y `UInputTags` en el diálogo. Se descartó para la v1 (§4); al añadirlo, `params` pasaría a aceptar `string[]` y habría que centralizar la conversión array → cadena en un único punto usado por el runner y el diálogo.
- **Input de tipo `host`**: útil para comandos que orquestan varios hosts; choca con el selector de host del diálogo y queda para cuando exista el motor de flujos.
- **Reutilización con `update_packages`**: el primer consumidor real sería el comando que sustituye `host_update_packages` (paquetes + sudo + detección de gestor en el script). No forma parte de este diseño, pero conviene implementarlo después para validar el contrato.
- **Uso desde flujos**: cuando exista el motor de nodos, un nodo `command` debería poder reutilizar `inputs` y `{{params.*}}`. El contrato ya vive en `src/utils/inputs/` y el render de valores en `InputsForm.vue`, así que el diálogo de ejecución de flujos lo importa en lugar de reimplementarlo; `WorkflowInput` pasa a ser un alias de `InputFieldDefinition` y el tipo crece con `'host'`.
- **Aviso de variables globales requeridas** (extrapolación pendiente del §8.3 de flujos): derivar del propio script las `{{global.*}}` con `findReferences(command)` y avisar en el diálogo de las que falten o estén deshabilitadas, con enlace al módulo de Variables. No requiere columna. Límite: una secreta vacía no se detecta (el proxy la entrega como `BLANK_VALUE`).
- **`fail_on_nonzero` y error tipado** (extrapolación pendiente del nodo `command`): hoy `runner.ts:119-121` lanza siempre y usa el stdout crudo como mensaje. Añadir columna `fail_on_nonzero` (default `1`) y un `CommandRunError` con `exit_code`/output permitiría comandos como `grep`, `test -f` o `systemctl is-active`. De paso, alinear `CommandRunResult.raw_output` con el `stdout` que promete el nodo `command` en §9.1 del diseño de flujos.
- **Streaming y cancelar en el diálogo** (extrapolación pendiente): `ssh_execute_command` ya emite `OutputChunk` cada ~100 ms y `ssh_cancel_remote_job` cancela el token registrado; el runner descarta el canal (`channel.onmessage = () => {}`, `runner.ts:98`). Cablearlo daría salida en vivo y botón de cancelar sin tocar el refactor multi-`job_id` de los flujos.
- **`module`/`submodule` en comandos** (extrapolación pendiente): agruparía el listado y el selector del nodo `command` (diseño de flujos §12). Plan propio: columnas, seed y UI de agrupación.
- **Descartadas explícitamente**: `variables` (valores fijos) por comando —solapa con `deployer_variables`—, historial `deployer_command_runs` —persistiría valores de entrada—, y `settings`/`revision`/`retries` —ejecución única y usuario único; `ssh_reconnect_attempts` ya cubre la reconexión—.
- **Renombrar `CommandTestDialog`** a `CommandRunDialog` si se confirma que deja de ser solo «probar»: es un cambio mecánico, pero toca `useDialog.ts` y tres llamadas.
