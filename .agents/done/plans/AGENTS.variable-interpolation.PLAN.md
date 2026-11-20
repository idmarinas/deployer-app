# Plan: Sistema de interpolación de variables globales

## Estado

**Completado**

---

## Instrucciones dadas (verbatim)

> Hay que crear el sistema de interpolación para las variables (las globales)
>
> Vamos a planificar como va a ser.
>
> ¿Cual es el formato para la interpolación de variables?
>
> Se tiene que tener  en cuenta que hay variables globales (deployer_variables en la base de datos) y abrá variables para los nodos/workflows que todavia no está implementado.

> El ambito secrets, no es necesario, ya que las variables, ya admiten ser secret o no.

> Escribe el plan según las instrucciones de AGENTS.todo.md

> El formato de interpolación puede colisionar si en el comando hay formato como {NAME} por ejmplo en los comandos docker para resolver ciertos datos.

> El formato de interpolación no debería permitir espacios alrededor de la ruta {{global.ruta}} esto es correcto {{ global.ruta }} esto no es correcto.
>
> Una vez hecho ese cambio procede con la implementación.

---

## Resumen

Crear un sistema de **interpolación de plantillas** para resolver variables dentro de textos de la aplicación, empezando por las **variables globales** (`deployer_variables`) y dejando preparado el mismo motor para las futuras variables de nodos/workflows.

El formato definitivo es `{{ámbito.ruta}}` (sin espacios):

- `{{global.slug}}` → variable global.
- `{{vars.slug}}` → variable de workflow (futuro).
- `{{params.slug}}` → input del workflow (futuro).
- `{{nodes.<key>.output.<path>}}` → output de un nodo (futuro).
- `{{workflow.key}}`, `{{run.id}}` → metadatos (futuro).

**El ámbito es obligatorio.** No existe el atajo `{{slug}}`. Esto evita colisiones con plantillas de terceros como las de Docker/Go (`{{.Names}}`, `{{end}}`, `{{json .}}`), Helm o Jinja.

Tampoco existe un ámbito `secrets`: **el secreto es una propiedad de la variable (`is_secret`)**, no una sintaxis distinta. El resolvedor consulta los metadatos de cada variable para decidir si puede mostrarla o resolverla.

La interpolación se hará **en tiempo de ejecución**, no al guardar. La plantilla original se conserva en BD.

### Decisiones confirmadas

- Las variables globales **secretas sí se pueden usar** en comandos: se descifran **solo en el momento de ejecutar**, nunca en preview, lint, listados ni logs.
- La **consola manual interpola siempre**: `RemoteCommand.vue` pasa por el mismo motor antes de enviar el comando.
- **Modo estricto**: una referencia inexistente, deshabilitada o eliminada **bloquea la ejecución**; además, el linter y el preview la señalan **antes** para que se pueda corregir.

---

## Decisiones

| Decisión | Elección | Razón |
| --- | --- | --- |
| Delimitadores | `{{ ... }}` | Mantiene la estética de plantilla y encaja con el diseño de workflows. |
| Forma única | `{{ámbito.ruta}}` | El ámbito explícito evita colisiones y ambigüedades. |
| Atajo sin ámbito | **No existe** | `{{slug}}` no se interpreta; se deja literal. Evita que una variable global tape futuras variables de nodo/workflow. |
| Espacios | **Prohibidos** | `{{global.slug}}` es válido; `{{ global.slug }}` produce `invalid_path`. Así la gramática es inequívoca y no se cuela una expresión sin resolver. |
| Detección | Solo raíces conocidas | El parser solo interpreta `global`, `vars`, `params`, `nodes`, `workflow`, `run` y `node`. Cualquier otro `{{...}}` queda intacto. |
| Colisión Docker/Go | Resuelta por ámbito obligatorio | `{{.Names}}`, `{{end}}`, `{{json .}}`, `{{range .}}` no tienen la forma `raíz.ruta` y no se tocan. |
| Fallback entre ámbitos | **No** | Cada ámbito es independiente; no hay resolución implícita entre ellos. |
| Ámbito de secretos | **No existe** `secrets.*` | Una variable ya lleva `is_secret`; el secreto es metadato, no ámbito. |
| Resolución | En ejecución | Los valores pueden cambiar; la BD guarda la plantilla sin resolver. |
| Variables deshabilitadas | **Error** | La interpolación solo considera `enabled = 1` y `deleted_at IS NULL`. |
| Variable inexistente | **Error** | Evita sustituciones vacías peligrosas (`rm -rf {{global.path}}` → `rm -rf `). |
| Recursión en valores | **No** en v1 | Evita ciclos y fugas indirectas de secretos. Los valores son literales. |
| Operadores/funciones | **No** en v1 | El diseño de workflows ya establece que las comparaciones se hacen con el nodo `condition`. |
| Escape | `\{{` → `{{` | Para el caso raro de que una plantilla de terceros use exactamente `{{global.foo}}` y no deba interpolarse. |
| Tipo de retorno | Entero = tipo original; embebido = string | Necesario para el futuro motor de workflows. Para comandos siempre string. |
| Secretos en v1 | **Resolver solo al ejecutar** | Se descifran con el vault justo antes de invocar SSH; preview, lint, listados y logs solo ven `is_secret` (valor `BLANK_VALUE`). |
| Redacción | **Sí** | Cualquier valor secreto usado en un error, log o mensaje se sustituye por un marcador antes de mostrarse. |
| Consola manual | **Interpolar siempre** | Misma semántica que los comandos guardados; la plantilla se resuelve antes de enviar. |
| Modo estricto | **Error + aviso previo** | La ejecución se bloquea ante cualquier referencia inválida; el linter y el preview la muestran antes para corregirla. |

---

## Contexto actual verificado

### Tabla `deployer_variables`

`src/drizzle/entities/variables.ts`:

- `id`
- `name` único
- `slug` único, formato `^[a-z0-9]+(_[a-z0-9]+)*$`
- `description` (JSONContent)
- `enabled` (boolean, por defecto `false`)
- `is_secret` (boolean)
- `value` (`encryptedText('value', { condition: 'is_secret' })`, obligatorio)
- `updated_at`, `created_at`, `deleted_at`

La migración vive en `migrations/20261109194600_variables_v0.3.0/migration.sql` y `src-tauri/migrations/20261109194600_variables_v0.3.0.sql`.

### Acceso a datos

- El frontend usa Drizzle en modo proxy (`src/drizzle/drizzle.ts`).
- Las lecturas normales **enmascaran** los valores `ENC:` como `BLANK_VALUE`; solo se descifran con `withDecryption(true, fn)`.
- El borrado actual es **físico**, pero se debe seguir filtrando `deleted_at IS NULL`.
- El listado de variables (`pages/dashboard/variables/index.vue`) muestra actualmente la forma antigua `{{slug}}`; habrá que cambiarla a `{{global.slug}}`.

### Ejecución de comandos

- `src/utils/commands/runner.ts`:
  - `runCommand(key, hostId, options)` lee `deployer_commands` y ejecuta.
  - `runCustomCommand(definition, hostId, options)` ejecuta un comando ad-hoc.
  - Ambos terminan en `executeCommand`, que invoca `ssh_execute_command`.
- `src/components/overlay/CommandTestDialog.vue` usa ambos caminos.
- `src/pages/dashboard/hosts/[id]/(view).vue` usa `runCommand` para información/métricas.
- `src/components/remote/RemoteCommand.vue` ejecuta comandos manuales directamente contra `ssh_execute_command`.

### UI del comando

- `src/components/form/CommandForm.vue` usa `CodeEditor`.
- `CodeEditor.vue` ya admite una prop `lint` (CodeMirror `LintSource`), reutilizable para marcar variables desconocidas.

### i18n y docs

- Los locales se cargan automáticamente desde `src/locales/es/**/*.ts` y `src/locales/en/**/*.ts`.
- Nuevos archivos de locales requieren `bun run i18n:types`.
- La documentación de variables está en `docs/content/es/008.variables/1.overview.md` y `2.manage.md` (solo existe versión `es`).

---

## Formato de interpolación

### Gramática

```text
{{ raíz.ruta }}
```

- `{{` y `}}` son los delimitadores.
- **No se permiten espacios** ni tabulaciones dentro de las llaves:
  - `{{global.deploy_path}}` → válido.
  - `{{ global.deploy_path }}` → **no válido**; se trata como error `invalid_path` si la raíz es conocida.
  - `{{global.deploy_path }}` → **no válido**; mismo error.
- La raíz es obligatoria y debe ser una de las conocidas.
- La ruta es una secuencia de segmentos separados por puntos:
  - `[A-Za-z_][A-Za-z0-9_]*`
  - Los slugs globales reales siguen la validación de la tabla (minúsculas, números y `_`).
- El punto separa ámbito y ruta; los slugs no pueden contener puntos.
- No se admiten llaves anidadas, operadores ni funciones.
- Si la raíz no es conocida, **la expresión se deja literal** (no es un error). Esto protege plantillas de Docker/Go, Helm, Jinja, etc.
- Si la expresión contiene espacios pero su versión sin espacios empezaría por una raíz conocida (`{{ global.foo }}`), **sí es un error**: evita que un usuario crea que interpoló algo y el servidor reciba la expresión literal.

### Ámbitos

| Ámbito | Uso | Estado |
| --- | --- | --- |
| `global` | `deployer_variables` | Ahora |
| `vars` | Variables del workflow | Futuro |
| `params` | Inputs del workflow | Futuro |
| `nodes` | Outputs de nodos anteriores | Futuro |
| `workflow` | Metadatos del workflow | Futuro |
| `run` | Metadatos de la ejecución | Futuro |
| `node` | Variables locales de nodo, si se añaden | Reservado |

> `secrets` **no** es un ámbito válido. `{{secrets.GHCR_PAT}}` no se interpreta (se deja literal); la forma correcta será `{{vars.GHCR_PAT}}` con `is_secret = true` cuando existan variables de workflow.

### Colisiones con plantillas de terceros

| Plantilla | Ejemplo | ¿Colisiona? |
| --- | --- | --- |
| Placeholder de una sola llave | `{NAME}`, `${NAME}` | **No**. No usa `{{...}}`. |
| Docker/Go template | `{{.Names}}` | **No**. No tiene la forma `raíz.ruta`. |
| Docker/Go template | `{{end}}`, `{{else}}`, `{{if .State.Running}}` | **No**. No tiene la forma `raíz.ruta`. |
| Docker/Go template | `{{json .}}`, `{{range .}}` | **No**. No tiene la forma `raíz.ruta`. |
| Helm/Jinja | `{{ .Values.foo }}`, `{{ user.name }}` | **No**. La raíz no está en la lista de ámbitos conocidos. |
| Helm/Jinja con variable `global` | `{{ global.foo }}` | **Sí, caso raro**. Se escapa como `\{{ global.foo }}`. |

El escape `\{{` lo consume el motor antes de enviar el comando a SSH, por lo que el servidor recibe `{{` literal.

### Ejemplos

```bash
mkdir -p {{global.deploy_path}}/releases
cd {{global.deploy_path}} && docker compose up -d
docker ps --format '{{.Names}}'        # intacto: no es una expresión de DeployerApp
docker ps --format '{{end}}'           # intacto: no tiene raíz.ruta
echo "\{{global.literal}}"             # imprime {{global.literal}}
```

Futuro:

```text
cd {{vars.remote_base}}
curl {{params.healthcheck_url}}
echo {{nodes.build.output.exit_code}}
```

### Semántica de resolución

1. Se buscan expresiones con la forma exacta `{{raíz.ruta}}` (sin espacios) donde `raíz` sea un ámbito conocido.
2. Si la raíz no es conocida → se deja literal.
3. Si la expresión contiene espacios y, sin ellos, empezaría por una raíz conocida → error `invalid_path`.
4. Si la raíz es conocida pero ese ámbito no está disponible en el contexto actual → error claro.
5. Si la ruta no existe → error claro.
6. Si la variable existe pero está deshabilitada → error específico.
7. Si la variable es secreta:
   - en preview, lint y listados **no se revela**: se trata como no disponible y el motor devuelve `secret_variable` en modo validación;
   - **solo en ejecución** se descifra el valor, y nunca se incluye en logs ni mensajes de error (se redacta).
8. Si el texto completo es una única expresión, se devuelve el valor con su tipo original.
9. Si la expresión está embebida en texto, se convierte a string.
10. Un `\{{` se convierte en `{{` literal y no se interpreta.
11. En modo validación (`validateTemplate`) una referencia inválida produce un aviso con posición, pero no lanza; en modo ejecución (`interpolateString`) lanza `InterpolationError` y el comando no se envía.

---

## Arquitectura propuesta

```text
src/utils/interpolation/
├── types.ts       ← ámbitos, referencias, opciones, errores
├── parser.ts      ← tokenización de {{ raíz.ruta }} y escape \{{
├── resolver.ts    ← resolución de rutas, interpolateString/interpolateValue
├── redact.ts      ← sustitución de valores secretos por un marcador
└── index.ts       ← API pública

src/drizzle/lib/variables.ts
└── loadGlobalScope(opts)  ← metadatos (UI) o valores descifrados (ejecución)

src/utils/commands/runner.ts
└── resuelve command y working_dir antes de ssh_execute_command

src/composables/useRemoteCommand.ts
└── resuelve command y working_dir antes de ssh_execute_command (consola)
```

### API orientativa

```ts
interface InterpolationRoots {
  global?: Record<string, InterpolationVariable>
  vars?: Record<string, unknown>
  params?: Record<string, unknown>
  nodes?: Record<string, unknown>
  workflow?: Record<string, unknown>
  run?: Record<string, unknown>
}

interface InterpolationVariable {
  value: unknown
  isSecret: boolean
}

function interpolateString(template: string, roots: InterpolationRoots, options?: InterpolationOptions): string
function interpolateValue(value: unknown, roots: InterpolationRoots, options?: InterpolationOptions): unknown
function findReferences(template: string): TemplateReference[]
function validateTemplate(template: string, roots: InterpolationRoots): InterpolationIssue[]
function redactSecrets(text: string, secrets: string[]): string
```

`InterpolationOptions` incluye:

```ts
{
  /** Si es true, las variables secretas se consideran no disponibles. Default: true. */
  maskSecrets?: boolean
  /** Valores secretos ya resueltos que deben redactarse en errores. */
  redact?: string[]
}
```

`InterpolationError` debe incluir:

- `code`: `scope_not_available` | `unknown_variable` | `disabled_variable` | `secret_variable` | `invalid_path`
- `expression`: texto original de la expresión.
- `path`: ruta intentada.
- `offset`: posición de la expresión en la plantilla (para el linter).
- `messageKey` y `messageParams` para i18n, ya redactados.

### Carga de variables globales

Hay dos modos de lectura, ambos desde `src/drizzle/lib/variables.ts`:

#### `loadGlobalScopeMetadata()` — UI, linter y preview

Devuelve solo lo necesario para validar y listar, **sin valores secretos**:

```ts
{
  slug: string
  name: string
  enabled: boolean
  is_secret: boolean
  /** Valor público; `BLANK_VALUE` si es secreta. */
  value: string
}
```

Consulta con Drizzle normal (proxy enmascarando):

```ts
db.select({
  slug: variables.slug,
  name: variables.name,
  value: variables.value,
  enabled: variables.enabled,
  is_secret: variables.is_secret,
})
.from(variables)
.where(isNull(variables.deleted_at))
```

Para las secretas, `value` llega como `BLANK_VALUE`; el motor las marca como `isSecret: true` y `maskSecrets: true` las reporta como `secret_variable` en validación.

#### `loadGlobalScopeForExecution()` — justo antes de SSH

Devuelve las **mismas claves**, pero con el valor descifrado de las secretas. Solo se llama desde `runner.ts` y desde `RemoteCommand.vue`/`useRemoteCommand`.

**No usar el flag global `withDecryption`** para esto: `withDecryption` es síncrono y el proxy lee `isDecryptEnabled()` **después** del `await invoke(...)`, así que el flag ya se habría restaurado. Además, el flag es global y cualquier lectura concurrente (hosts, passkeys) se descifraría sin querer.

Enfoque propuesto, **con alcance por valor**:

1. Leer las filas con el proxy normal (los secretos llegan como `BLANK_VALUE`).
2. Para las filas con `is_secret = true`, hacer una lectura cruda puntual con `invoke('query_raw', ...)` que devuelva solo `slug` e `value` (el proxy no interviene, así que llega el `ENC:{version}:<base64>` real).
3. Descifrar cada valor con `decrypt(encryptScope('deployer_variables', 'value'), ciphertext)` de `src/drizzle/lib/stronghold.ts`.
4. Si el descifrado falla, lanzar un error i18n que **no incluya** ni el ciphertext ni el slug del valor.

Ventajas: no se toca el flag global, no hay fugas cruzadas y el valor secreto vive solo en la estructura en memoria que consume el motor. El SQL crudo se construye con parámetros (`?`), nunca interpolando slugs a mano.

> `ENCRYPTED_FIELDS` de `stronghold.ts` todavía no lista `deployer_variables.value`; conviene añadirlo para que el diagnóstico del vault lo muestre (no es obligatorio para el descifrado, que usa `encryptScope(...)`).

Clasificación en ambos modos:

- `enabled = true` y `is_secret = false` → valor interpolable.
- `enabled = true` y `is_secret = true` → interpolable solo en ejecución; en validación, `secret_variable`.
- `enabled = false` → `disabled_variable`.

Los valores descifrados **nunca** se guardan en caché de Pinia Colada, ni en `localStorage`, ni en el estado de un componente que sobreviva a la ejecución.

---

## Cambios necesarios

### 1. Motor puro

- Crear `src/utils/interpolation/types.ts`.
- Crear `src/utils/interpolation/parser.ts`.
- Crear `src/utils/interpolation/resolver.ts`.
- Crear `src/utils/interpolation/redact.ts`.
- Crear `src/utils/interpolation/index.ts`.

Sin dependencias de Vue ni de la BD en estos archivos.

### 2. Acceso a variables globales

- Crear `src/drizzle/lib/variables.ts` con `loadGlobalScopeMetadata()` y `loadGlobalScopeForExecution()`.
- Opcional: añadir un loader `useVariablesForInterpolation` en `src/loaders/variables.ts` que consuma el modo metadatos para la UI y el linter.
- No modificar el esquema ni las migraciones.
- Añadir `deployer_variables.value` a `ENCRYPTED_FIELDS` en `src/drizzle/lib/stronghold.ts` (diagnóstico del vault).

### 3. Runner de comandos

En `src/utils/commands/runner.ts`:

- Cargar el ámbito global en modo ejecución antes de invocar SSH.
- Interpolar `definition.command`.
- Interpolar `options.working_dir` si existe.
- No interpolar `parser`, `timeout`, `name` ni `description`.
- Pasar los valores secretos resueltos a `redactSecrets` para limpiar cualquier mensaje de error antes de lanzarlo.
- Capturar `InterpolationError` y lanzar un `Error` con mensaje i18n (sin valores).
- Mantener el comportamiento actual de errores de comando/SSH.

Punto de integración:

```ts
const globals = await loadGlobalScopeForExecution()
const roots = { global: globals }
const resolvedCommand = interpolateString(definition.command, roots, { maskSecrets: false })
const resolvedWorkingDir = options?.working_dir
  ? interpolateString(options.working_dir, roots, { maskSecrets: false })
  : undefined
```

### 4. UI de comandos

- `src/components/form/CommandForm.vue`:
  - Cuadro de ayuda sobre el editor con los disparadores del autocompletado (`{{`, `{{g`, `{{global.`, `{{global.de`, `{{de`, `\{{`) y una nota sobre las secretas. Sustituye al antiguo selector de variables.
  - Resaltado en el editor con la prop `highlight` de `CodeEditor`: mismo código de color que la vista previa (primario para normales, ámbar para secretas). Es informativo, no una advertencia.
  - Linter de CodeMirror con `findReferences` + `validateTemplate` sobre el modo metadatos:
    - variable inexistente/eliminada → error;
    - deshabilitada → error;
    - secreta → **no se muestra** en el linter ni en el listado del formulario (es válida en ejecución y el ámbar ya la identifica);
    - ámbito no disponible → error.
  - El linter se pasa a `CodeEditor` mediante la prop `lint` ya existente.
- `src/components/overlay/CommandTestDialog.vue`:
  - Mostrar un preview del comando resuelto antes de ejecutar, usando `loadGlobalScopeMetadata()` y sustituyendo las secretas por un marcador (`••••••`).
  - **Dos pestañas**: *Interpolada* (primera, por defecto) y *Original* (la plantilla guardada sin resolver). `interpolateSegments()` devuelve texto y referencias por separado para pintar ambas vistas.
  - Resaltar las expresiones en ambas pestañas: color primario para variables normales y ámbar para secretas (enmascaradas en la vista interpolada).
  - El aviso de secretas ocupa **una sola línea** con el marcador de ejemplo en ámbar (`••••••`), renderizado con `<i18n-t>` y un slot `marker`.
  - Si la interpolación falla, mostrar el error y deshabilitar la ejecución.
  - Al ejecutar, el runner vuelve a resolver con valores reales; el preview nunca contiene secretos.
- `src/pages/dashboard/variables/index.vue`:
  - Cambiar la forma mostrada de `{{slug}}` a `{{global.slug}}`.
  - Añadir botón de copiar `{{global.slug}}`.
- `src/composables/useRemoteCommand.ts` + `src/components/remote/RemoteCommand.vue`:
  - **Interpolar siempre** en `execute(input)`: resolver `command` y `working_dir` con `loadGlobalScopeForExecution()` antes de invocar `ssh_execute_command`.
  - Si la interpolación falla, rellenar `errorMessage` con el mensaje i18n (redactado) y devolver `null` sin abrir SSH.
  - `RemoteCommand.vue` ya notifica el fallo a partir de `errorMessage`; opcionalmente añadir un aviso bajo el textarea cuando el comando contenga referencias.
  - El texto del textarea conserva la plantilla; nunca se reemplaza por el valor resuelto.

### 5. i18n

Crear:

- `src/locales/es/utils/interpolation.ts`
- `src/locales/en/utils/interpolation.ts`

Claves mínimas:

```ts
errors: {
  scope_not_available: 'El ámbito "{scope}" no está disponible en este contexto.',
  unknown_variable: 'La variable "{path}" no existe o fue eliminada.',
  disabled_variable: 'La variable "{path}" está deshabilitada.',
  secret_variable: 'La variable "{path}" es secreta y no puede mostrarse en este contexto.',
  invalid_path: 'La ruta "{path}" no es válida. Debe tener la forma ámbito.ruta, sin espacios.',
  decrypt_failed: 'No se pudo descifrar la variable secreta "{path}".',
},
warnings: {
  secret_variable: 'La variable "{path}" es secreta: se resolverá solo al ejecutar.',
},
common: {
  redacted: '••••••',
}
```

Ejecutar `bun run i18n:types` después.

### 6. Documentación

Actualizar `docs/content/es/008.variables/1.overview.md`:

- Documentar `{{global.slug}}` como forma única.
- Indicar que `{{slug}}` sin ámbito no se interpreta.
- Indicar que solo se resuelven variables habilitadas y no eliminadas.
- Indicar que una variable inexistente/deshabilitada produce error y bloquea la ejecución.
- Explicar que las secretas se resuelven **solo al ejecutar** y nunca aparecen en preview, linter ni logs.
- Explicar el escape `\{{`.
- Aclarar que `secrets.*` no existe: el secreto es `is_secret`.
- Mencionar los ámbitos futuros (`vars`, `params`, `nodes`, etc.) sin implementarlos.
- Advertir de que plantillas de Docker/Go como `{{.Names}}` o `{{end}}` se dejan intactas.
- Indicar que la consola manual también interpola.

> En los ejemplos de Docus, usar bloques de código para que `{{ ... }}` no se confunda con las variables de plantilla de la documentación (`{{project_name}}`).

---

## Verificación prevista

- `{{global.deploy_path}}` resuelve el valor de una global habilitada.
- `{{ global.deploy_path }}` (con espacios) produce `invalid_path` y bloquea la ejecución.
- `{{global.deploy_path }}` (espacio final) produce `invalid_path`.
- `{{deploy_path}}` se deja literal (sin ámbito).
- `{{.Names}}`, `{{end}}`, `{{json .}}` se dejan literales.
- `{{global.no_existe}}` lanza error antes de ejecutar SSH.
- Variable deshabilitada lanza error específico.
- Variable secreta:
  - en el linter aparece como advertencia informativa, no como error;
  - en el preview se muestra `••••••`;
  - al ejecutar se descifra y el comando llega al servidor con el valor real;
  - ningún mensaje de error contiene el valor.
- El linter marca inexistente/deshabilitada y el botón de ejecutar queda bloqueado mientras haya errores.
- `\{{global.literal}}` produce `{{global.literal}}`.
- `{{vars.algo}}` en un comando lanza `scope_not_available`.
- El comando guardado en BD no se modifica tras ejecutar.
- `CommandTestDialog` muestra el preview y no ejecuta si hay error de interpolación.
- `useRemoteCommand.execute` interpola `command` y `working_dir` y, si falla, rellena `errorMessage` sin enviar nada.
- `bun run i18n:types`.
- `bun run build` (vue-tsc + vite).

No se prevén cambios en Rust: el descifrado de secretas se hace en el frontend con el vault (`decrypt` de `stronghold.ts`) tras una lectura cruda puntual vía `query_raw`.

---

## Riesgos y gotchas

- **Colisiones**: el ámbito obligatorio y la lista cerrada de raíces evitan las plantillas de Docker/Go y la mayoría de Helm/Jinja. El único caso raro es una plantilla que use exactamente `{{global.foo}}`; se resuelve con `\{{`.
- **Secretos**: el proxy Drizzle enmascara los valores `ENC:`; no consumir `value` de un `returning()` ni de una lectura normal para interpolar secretas. Para ejecutar, lectura cruda puntual + `decrypt` por valor.
- **`withDecryption` asíncrono**: no reutilizarlo para secretas. El flag es global, se restaura antes de que termine el `await` y afectaría a lecturas concurrentes (p. ej. `deployer_hosts.password`).
- **Redacción**: cualquier error de SSH, parser o interpolación debe pasar por `redactSecrets` antes de mostrarse; un comando fallido puede incluir el valor secreto en su salida.
- **`deleted_at`**: el borrado es físico, pero se debe filtrar igualmente por si se implementa borrado lógico.
- **No interpolar** parser, timeout, nombres ni descripciones.
- **Consistencia de workflows**: en una ejecución futura, construir un snapshot inmutable de variables al inicio para que todos los nodos vean los mismos valores.
- **i18n**: no hardcodear mensajes en español; el backend/frontend devuelven claves i18n.

---

## Estado actual

Implementado y verificado. Estado del plan: **Completado** (11/11/2026). El usuario confirmó en la app el funcionamiento del autocompletado; el modo estricto quedó corregido para bloquear también variables inexistentes en ejecución.

### Archivos creados

- `src/utils/interpolation/{types,parser,resolver,redact,index}.ts` — motor puro, sin dependencias de Vue ni de la BD. `interpolateSegments()` devuelve texto/referencias para las vistas previas resaltadas.
- `src/utils/interpolation/completion.ts` — fuente de autocompletado para CodeMirror (dependencia añadida: `@codemirror/autocomplete`).
- `src/drizzle/lib/variables.ts` — `loadGlobalScopeMetadata()` y `loadGlobalScopeForExecution()`.
- `src/locales/{es,en}/utils/interpolation.ts` — mensajes del motor.

### Archivos modificados

- `src/drizzle/lib/stronghold.ts` — `deployer_variables.value` en `ENCRYPTED_FIELDS`.
- `src/utils/commands/runner.ts` — interpola `command`/`working_dir` y redacta errores.
- `src/composables/useRemoteCommand.ts` — interpola en la consola manual y redacta errores/eventos.
- `src/components/form/textareas/CodeEditor.vue` — `insertAtCursor` expuesto, prop `autocomplete` (CodeMirror `CompletionSource`) y prop `highlight` (rangos con `Decoration.mark`, recreados al cambiar de fuente o de documento).
- `src/components/form/CommandForm.vue` — cuadro de ayuda con los disparadores del autocompletado, autocompletado, linter (solo errores) y resaltado de variables.
- `src/components/overlay/CommandTestDialog.vue` — preview con pestañas *Interpolada*/*Original*, resaltado de variables, aviso de secretas en una línea y bloqueo de ejecución.
- `src/pages/dashboard/variables/index.vue` — muestra y copia `{{global.slug}}`.
- `src/locales/{es,en}/form/commands.ts` y `src/locales/{es,en}/dialogs/commands.ts` — claves de UI.
- `docs/content/es/008.variables/1.overview.md` — formato, resolución, secretas, autocompletado, resaltado en el editor, escape y ámbitos futuros.

### Detalles de implementación relevantes

- El parser solo considera expresiones sin espacios. `{{ global.x }}` produce `invalid_path` cuando su versión compacta empieza por una raíz conocida; cualquier raíz desconocida queda literal.
- En ejecución, una variable global inexistente lanza `unknown_variable` (no se sustituye por cadena vacía): `resolveGlobalVariable` aplica la misma comprobación que `checkReference`, de modo que el modo estricto también bloquea comandos no validados antes por la UI.
- Las secretas se enmascaran con `••••••` en preview/lint (`maskSecrets` por defecto) y solo se descifran en `loadGlobalScopeForExecution()` (lectura cruda por `query_raw` + `decrypt` por valor, sin `withDecryption`).
- Si una secreta no tiene ciphertext (valor vacío), se resuelve como cadena vacía; nunca se inyecta el marcador `BLANK_VALUE`.
- El linter de `CommandForm` se reconstruye al cambiar las variables o el idioma, y se desactiva si falla la carga de metadatos para no marcar falsos negativos.
- **Resaltado en el editor**: `CommandForm` calcula los rangos con `findReferences()` y los clasifica con `isInterpolationVariable(global[slug])?.isSecret`. `CodeEditor` los pinta con `Decoration.mark` (`cm-interpolation` / `cm-interpolation-secret`, colores `--ui-primary` / `--ui-warning`), igual que la vista previa. Las secretas no aparecen en el linter ni en el listado de errores: son válidas y el ámbar ya las identifica.
- `CommandTestDialog` bloquea la ejecución mientras haya errores de interpolación y muestra el preview solo cuando la plantilla se puede resolver.
- **Preview con pestañas**: `interpolateSegments()` (motor) devuelve fragmentos `text`/`reference`; la pestaña *Interpolada* pinta `text` y la *Original* pinta `expression`, resaltando ambos casos. El texto se escapa antes de `v-html` porque los valores resueltos son datos del usuario.
- **Autocompletado**: se activa al escribir `{{`. En ese momento lista solo los **ámbitos disponibles** para el documento (`getScopes()`, hoy únicamente `global`); al escribir una letra lista las variables y filtra: con punto por ruta (`{{global.de`), sin punto comparando también el slug (`{{de`). Cada opción muestra el **nombre** como título y, en una segunda línea (`.cm-completionDetail` con `flex-basis: 100%`), `global.slug [valor]`; el valor secreto es `••••••`, los largos se recortan a 40 caracteres y las secretas llevan un icono de candado (`.cm-completionIcon-secret`). No hay atajo manual: `Ctrl+Espacio` no abre nada fuera de una expresión `{{`. Las secretas se incluyen (solo se inserta la expresión, nunca el valor). El reemplazo consume un `}}` ya escrito para no duplicar llaves y, si el cursor está en medio de la ruta (`{{global.de|ploy_path}}`), absorbe el resto del identificador para no dejar texto duplicado. Las raíces desconocidas no abren la lista.

### Verificación ejecutada

- `bun run i18n:types` — correcto.
- `bun run build` (`vue-tsc --noEmit` + `vite build`) — correcto.
- `interpolateSegments()` reconstruye exactamente el mismo texto que `interpolateString()` (probado con variables normales, secretas, escapadas y raíces desconocidas; el test temporal se eliminó después).
- Render SSR del aviso de secretas del diálogo comprobado en `es`/`en`.
- Fuente de autocompletado probada con `CompletionContext`: `{{` → `['global']`; `{{g` → variables + `global`; `{{global.`/`{{global.de`/`{{de` filtran; `\{{` y la invocación explícita sin `{{` devuelven `null`. Las opciones usan el nombre como `label`, `global.slug [valor]` como `detail` y `type: 'variable secret'` cuando la variable es secreta (icono de candado).
- Clases `bg-primary/10`, `bg-warning/10`, `bg-accented`, `bg-elevated`, `text-highlighted`, `text-primary` y `text-warning` presentes en el CSS generado.
- Motor probado contra la verificación prevista: `{{global.deploy_path}}` resuelve; `{{ global.deploy_path }}` y `{{global.deploy_path }}` → `invalid_path`; `{{deploy_path}}` y plantillas Docker/Go quedan literales; `{{global.nope}}` → `unknown_variable` en ejecución y en el linter; deshabilitada → `disabled_variable`; secreta → `••••••` en preview y valor real con `maskSecrets: false`; `\{{...}}` se desescapa; `{{vars.algo}}` → `scope_not_available`; `collectSecretValues` + `redactSecrets` ocultan el valor en errores.
