# Guía de Frontend — DeployerApp

> Guía para tareas de **Vue / TypeScript**. Las reglas generales están en [AGENTS.md](./AGENTS.md).

## 1. Estructura

```
src/
├── assets/css/            ← main.css (paleta, tokens, utilidades PCB), fonts.css (Inter, JetBrains Mono)
├── components/            ← form/, table/, overlay/… (compartidos) y pages/<pagina>/ (de una página)
├── composables/           ← lógica con reactividad (queries/, useSshJobs, useRemoteCommand…)
├── drizzle/               ← drizzle.ts (proxy), lib/stronghold.ts (cripto), lib/schema-types.ts, entities/
├── loaders/               ← defineColadaLoader por dominio (deployerApp, hosts, passkeys, commands, variables, trash)
├── locales/               ← i18n: es/ (referencia de claves) y en/ (espejo)
├── pages/                 ← dashboard/{app,hosts,passkeys,console,file-manager,variables,theme,trash}, deployer/
├── plugins/codemirror/    ← extensiones reutilizables de CodeMirror
├── stores/                ← stores de Pinia (p. ej. remoteFileMarks)
├── types/                 ← entities.ts (manual) y tauri-types.d.ts (generado con ts-rs)
└── utils/                 ← funciones puras sin reactividad (icons.ts, inputs/, schema-form/…)

theme/                     ← temas personalizados de Nuxt UI (raíz del proyecto), un archivo por componente
```

### Componentes por página

`src/components/pages/<pagina>/` refleja la ruta de `src/pages/` (p. ej. `pages/dashboard/console.vue` → `components/pages/console/`). Todo componente creado para una página va ahí, aunque tenga un solo consumidor. Solo se mueve a `components/form/`, `table/`, etc. cuando se comparte de verdad entre páginas. Si se necesita de forma puntual desde otra página, se importa desde su ruta original sin duplicarlo.

### Composables, utils y loaders

- **`composables/`:** lógica con reactividad de Vue (`ref`, `computed`, `onMounted`).
- **`utils/`:** funciones puras sin reactividad. Si no necesita Vue, va aquí.
- **`loaders/`:** `defineColadaLoader` de `vue-router/experimental/pinia-colada`. Son lazy y exponen `data`, `isLoading` y `error`.

## 2. Temas (Nuxt UI v4) y estilo PCB

La identidad visual es de placa de circuito impreso. Todos los componentes son compatibles con tema claro y oscuro.

### Colores semánticos

Paleta en `main.css` bajo `@theme static`, prefijo `deployer-` (`primary`, `secondary`, `success`, `info`, `warning`, `error`, `neutral`). Se mapea en `vite.config.ts → ui.colors`, así que Nuxt UI genera `--ui-primary`, etc. **No redeclarar esos tokens en `main.css`**.

En `main.css` solo se declaran tokens de superficie y texto (`--ui-bg`, `--ui-border`, `--ui-text`…), en `:root` y en `.dark`, además de `--ui-radius` y las variables `--pcb-*`.

**Regla:** los archivos de tema nunca tienen hexadecimales. Usa clases semánticas o tokens `--ui-*`.

### Tipografía

- **Inter** para texto general.
- **JetBrains Mono** (`font-pcb`) para badges, etiquetas técnicas, tooltips y valores numéricos.

### Utilidades CSS

| Clase | Uso |
| --- | --- |
| `pcb-clip-br` | Esquina inferior derecha recortada (botones no cuadrados, inputs) |
| `pcb-clip-badge`, `pcb-clip-badge-alt` | Esquinas opuestas recortadas (chips) |
| `pcb-clip-card` | Las cuatro esquinas recortadas (cards, modales) |
| `pcb-clip-hex` | Hexágono achatado (indicadores de estado) |
| `pcb-shadow-xs/sm/md/lg`, `pcb-shadow-neutral`, `pcb-shadow-hover-md` | Glow vía `filter: drop-shadow` |
| `pcb-trace-top`, `pcb-trace-bottom`, `pcb-trace-left`, `pcb-trace-left-current` | Trazas de borde |
| `pcb-corners`, `pcb-pad` | Nodos circulares |
| `pcb-animate-pulse`, `pcb-animate-flow` | Pulso en hover (botones), flujo (progress) |
| `pcb-animate-blink` | Parpadeo LED: solo de forma explícita y puntual |

### Reglas críticas de estilo

- **`box-shadow` no es compatible con `clip-path`.** En elementos con `pcb-clip-*`, usa `filter: drop-shadow(...)`, nunca `shadow-[...]`. Tampoco combines dos utilidades que fijen `filter` en el mismo selector.
- **`pcb-clip-*` no se aplica a elementos circulares** ni a iconos. En `button.ts` el clip se condiciona a la variante `square`: `false` → `pcb-clip-br`, `true` → sin clip.
- **`pcb-animate-blink` nunca va por defecto** en un color o variante. Se añade a mano donde haga falta.
- **Estados `disabled` deben anular `hover`/`active`:** `disabled:pointer-events-none` (nativos) o `data-disabled:pointer-events-none` (Reka UI).

### Checklist para un theme nuevo o modificado

- Sin hexadecimales.
- Slots con `pcb-clip-*` usan `drop-shadow`.
- Sin dos reglas de `filter` en el mismo selector.
- `pcb-clip-*` no en elementos circulares.
- Sin `pcb-animate-blink` por defecto.
- Slots con `hover:`/`active:` llevan `disabled:pointer-events-none`.

Los temas se registran en `vite.config.ts → ui`. El alias para `switch` es `switchTheme` porque `switch` es palabra reservada.

## 3. Acceso a datos

- **Todas** las lecturas y escrituras de tablas van por **Drizzle en modo proxy** (`src/drizzle/drizzle.ts`), que delega en `query_raw`. El proxy cifra, descifra y enmascara los campos `encryptedText(...)` con `src/drizzle/lib/stronghold.ts`.
- En lectura, por defecto los valores `ENC:` se enmascaran a `BLANK_VALUE`. Con `withDecryption(true, fn)` se descifran.
- En escritura, el proxy cifra los campos declarados y elimina antes las asignaciones centinela o `ENC:`.
- **Ninguna escritura vive en un loader.** Las escrituras van con `db.insert/update/delete` o, si hace falta lógica de backend, con `invoke` directo en el sitio de uso.
- No existe acceso directo a SQLite desde el frontend.

```ts
import { db, withDecryption } from '@/drizzle/drizzle'
import { hosts, variables } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

const row = await db.select().from(hosts).where(eq(hosts.id, id)).limit(1)
const raw = await withDecryption(true, () => db.select().from(hosts).where(eq(hosts.id, id)).limit(1))
await db.insert(variables).values({ name, slug, value })
```

### Queries CRUD

Las entidades (`variables`, `hosts`, `commands`, `passkeys`) usan la factoría `createCrudQuery` de `composables/queries/crud.ts`. Cada entidad solo declara tabla, PK, `cacheKey`, prefijo i18n y hooks. La factoría gestiona el ciclo *toast persistente → sentencia → invalidación → toast de éxito o error*.

- `findAll` y `find` excluyen la papelera por defecto. `{ onlyDeleted: true }` lista solo la papelera; `{ includeDeleted: true }` no filtra.
- `remove(key)` hace borrado lógico con **Deshacer**. `remove(key, { purge: true })` borra físicamente. `remove(key, { unlink: true })` pone a `NULL` las FK antes de borrar.
- `purgeDeleted()` vacía la papelera y devuelve `{ purged, blocked }`.
- Las filas con `internal: true` no se pueden borrar ni purgar (hoy solo `commands`).
- Las lecturas directas fuera de la factoría (loaders, componentes) deben filtrar con `isNull(tabla.deleted_at)`.

### Unicidad y soft-delete

Los índices `UNIQUE` son globales, así que una fila borrada sigue ocupando su `name`, `key` o `slug`. Por eso las validaciones `$count` no filtran por `deleted_at`: para reutilizar un nombre hay que restaurar la fila. Si algún día se usan índices parciales, habrá que migrarlos y añadir el filtro a los validadores.

Las validaciones (`composables/validation/*`) usan `db.$count(tabla, condición)` con `eq`/`and`/`ne` de `drizzle-orm`. Nunca SQL manual interpolado.

### Invalidación de caché

`invalidateCacheQueries()` (`composables/queries/shared.ts`) invalida por prefijo, pero **no propaga** el error de un refetch fallido. Así, una mutación aplicada no se reporta como fallida aunque el loader de detalle responda `not-found`.

### Diálogos de borrado

`useCrudDeleteConfirm` consulta `findReferences` y `findVariableUsages` antes de borrar. Si hay referencias, ofrece **Desvincular y eliminar**. Si solo hay usos de variables, ofrece **Eliminar de todos modos**: las variables se referencian por texto (`{{global.slug}}`), no por FK. El vaciado de papelera pide confirmación doble.

## 4. Llamadas a comandos Tauri

Para operaciones con lógica de backend, usa `invoke` directamente:

```ts
import { invoke } from '@tauri-apps/api/core'
import type { CommandResponse } from '@/types/tauri-types'

const result = await invoke<CommandResponse<GeneratedPasskey>>('generate_passkey', { input })
if (result.success) {
	// result.data
}
```

- Comandos en uso: `test_connection`, `generate_passkey`, `derive_passkey_info`, `export_public_key`, comandos de BD y setup (`set_database_path`, `initialize_database`, `execute_migrations`…), `get_vault_password`, `get_vault_path`, `check_vault_health`, y los de SSH (`ssh_execute_command`, `ssh_upload_file`, `ssh_download_file`, `ssh_list_remote_dir`, `ssh_file_manager_transfer`, `ssh_cancel_remote_job`).
- Los comandos de información del sistema, métricas, paquetes actualizables y actualización de paquetes **no son comandos Rust**: se ejecutan como comandos guardados con `runCommand(...)` → `ssh_execute_command`, y se parsean en TypeScript (`src/types/entities.ts`).
- No llamar a comandos de Docker (Hub o Compose remoto): ya no existen en el backend.

## 5. Consola remota y gestor de archivos

### Motores de jobs

- **`useSshJobs`** (`composables/useSshJobs.ts`) es el motor genérico: registro reactivo multi-job por clave, con estado (`pending`, `running`, `success`, `error`, `cancelled`, `skipped`, `interrupted`), salida por job y tiempos. Expone `cancel(key?, { cascade })`, `cancelAll()` y `runBatch(...)` para el gestor.
- **`useRemoteCommand`** es la fachada de la consola sobre `useSshJobs`. Mantiene la API que usan los componentes: `execute`, `upload`, `download`, `cancel`, `clear`.
- **`jobs` es un `reactive(Map)`.** Las mutaciones deben hacerse sobre el objeto reactivo que devuelve `get()`. Un objeto crudo guardado con `set()` no notifica cambios.

### Eventos y resultados

- Eventos del Channel: `started` (guarda el `job_id`), `output_chunk`, `finished` (`status`, `exit_code`, `duration_seconds`, `message`) y `error` (transporte).
- `success: true` no implica que el comando remoto haya tenido éxito: revisa `data.exit_code`.
- Los componentes leen el motivo del fallo de `result.message_params.reason` o de `t(result.message_key, result.message_params)`, **no** de un prop tras el `await`: el prop es una instantánea del render anterior.

### Componentes

- Consola (`src/components/pages/console/`): `ConsoleCommand.vue`, `ConsoleFileUpload.vue`, `ConsoleFileDownload.vue`, `ConsoleOutput.vue`. `SelectHost` es compartido.
- Gestor de archivos (`src/components/pages/file-manager/`): `FileManagerPanel.vue` (un panel parametrizable, `origin: 'local' | 'remote'`), `FileTree.vue`, `TransferQueue.vue`.
- Página: `pages/dashboard/file-manager.vue`, con pestañas Archivos y Transferencias.

### Gestor de archivos

- **Persistencia:** todo el estado vive en SQLite (`fileManagerPersistence.ts` es el único acceso a `db`). `localStorage` solo se usa una vez para migrar datos antiguos. `KeepAlive` mantiene la página viva.
- **Stores:** `useFileManagerPreferences` (pestaña, host, rutas, concurrencia), `useFileManagerListings` (instantáneas por `scope_key`) y `useFileManagerQueue` (cola ordenada por `createdAt` descendente).
- **Carga:** cada panel pide **un nivel**. Stale-while-revalidate: muestra la instantánea y revalida contra local o SFTP. Los directorios expandidos piden su nivel hijo.
- **Selección:** `FileTree` usa `UTree multiple` con `propagateSelect`. **Solo el icono cambia la selección**, no el clic en la fila. Los topes de expansión son profundidad 5, 500 entradas por directorio y 5.000 nodos.
- **Orden:** lo impone solo el frontend con `sortFileEntries()` (`utils/fileEntries.ts`): directorios primero, después archivos, con `Intl.Collator` por idioma.
- **Transferencias:** los botones `→` y `←` crean una petición por entrada seleccionada **de nivel superior** (`topLevelEntries()`). Sin ese filtro, `propagateSelect` duplicaría bloques.
- **Rutas:** las locales usan separadores nativos; las remotas siempre `/`.
- **Permisos locales:** `fs:allow-read-dir` y `fs:allow-stat`. No hay permisos de escritura ni lectura de contenido desde el frontend.
- **Reinicio:** los jobs `pending` o `running` se restauran como `interrupted` con `jobId: null`.

## 6. Gotchas

### `data` de pinia-colada es un `shallowRef`

Los loaders exponen `data` como `shallowRef`. **Mutar una propiedad anidada no dispara reactividad**, aunque el dato cambie en memoria. Para reflejarlo hay dos opciones:

- Reasignar el valor completo: `data.value = { ...data.value, prop: nuevo }`.
- Refetch del loader (`reload`). Es más lento porque consulta la BD y muestra `isLoading`.

### Entidades con `value: string`

`defineColadaLoader` aplica `Exclude<Data, NavigationResult>`, y `NavigationResult` tiene una propiedad `value`. Cualquier entidad con `value: string` se colapsa a `never`. En el consumidor hay que hacer cast:

```ts
const { data: entityData } = loadVariableById()
const entity = computed(() => entityData.value as Variable | undefined)
```

### `vnode` en la toolbar

En `useToolbarContent.ts`, `vnode` debe ser una factory `() => VNode`, nunca un VNode estático: los estáticos congelan valores reactivos.

### Drag & drop

Si se reintroduce Sortable.js: importar `@vueuse/integrations/useSortable` (no el barrel), usar `forceFallback: true` (el HTML5 nativo no es fiable en webviews) y `watchElement: true` si el contenedor está tras un `v-if` asíncrono.

## 7. Internacionalización

- `vue-i18n`. Los mensajes de error del backend llegan como claves i18n. El frontend nunca muestra texto de backend sin traducir.
- Las claves son `snake_case`. No usar `<...>` como marcador en los mensajes: `escapeParameter: true` lo convierte en HTML escapado. Usar `params.clave` o `{nombre}`.
- **`es/`** es la referencia de claves (tipos y `warnMissingKeys`). **`en/`** es su espejo con las mismas claves.
- Cada archivo exporta con `satisfies LocaleMessageValue`, nunca con cast.
- `scripts/generate-i18n-schema.ts` genera `typed-locale.d.ts` (autogenerado, en `.gitignore`). Tras añadir claves, ejecuta `bun run i18n:types`: `bun run build` no lo hace.
- Claves con función (`(ctx) => ...`) se normalizan a `string` en el schema solo para tipos.
- Para un idioma nuevo, añadir sus globs en `LOCALE_GLOBS`, `DATETIME_GLOBS` y `NUMBER_GLOBS` de `src/locales/_loader.ts`.

## 8. Iconos

Todos los iconos están en `src/utils/icons.ts`. En código nuevo nunca escribir `'i-tabler-...'` literal:

```ts
import { ICONS, getModuleIcon, getModuleSwitchIcons } from '@/utils/icons'

getModuleIcon('hosts')                 // plural: listados, navegación
getModuleIcon('hosts', 'singular')     // elemento individual activo
getModuleIcon('hosts', 'off')          // inactivo o 404
```

Algunos archivos activos aún tienen iconos literales. Al tocarlos, migrarlos a `ICONS` o `getModuleIcon`.

## 9. Toolbar

`useToolbarContentCreate` y `useToolbarContentEdit` (`useToolbarContent.ts`). Los botones extra usan `vnode: () => VNode` con posiciones nombradas (`ExtraButtonPosition`).

## 10. Formularios JSON-Schema

Sistema basado en `json-schema-library` (jsl) en `src/utils/schema-form/*` y `src/components/form/schema/*`. El núcleo es agnóstico: no importa ningún esquema concreto.

- **Entrada:** `JsonSchemaEditor.vue` con `v-model` de texto. Props: `schema`, `formatOutput` (`'yaml' | 'json'`), `widgets`, `resolveTitle`, `resolveDescription`, `resolveMessage`.
- **Composable:** `useSchemaToForm(schema, options)` devuelve `root`, `formData`, `errors`, `validate`, `get`, `set`, `remove`.
- **Clasificación:** `classifyNode` devuelve el tipo del nodo (`string`, `object`, `array`, `map`, `union`…). Los componentes `SchemaField*` despachan según ese tipo.
- **Contenedores:** en objetos, los campos simples van primero y los contenedores van como pestañas.
- **`$ref` y `allOf`:** jsl no los resuelve solos. Usa `resolveNode(node)`.
- **Defaults:** `getData()` solo incluye propiedades `required`. Las opcionales no entran.
- **Widgets:** `widgetsNormalizer` marca nodos con `x-widget`; el componente se pasa en `widgets`.
- **Validación:** errores como claves `form.schema_form.errors.*`.

Antes de escribir un parser manual de `$ref` o `allOf`, usa las utilidades de `jsl.ts`.

## 11. CodeEditor

`src/components/form/textareas/CodeEditor.vue` es el editor de código (CodeMirror 6). Úsalo solo en campos de código.

- Extensiones en `src/plugins/codemirror/` (lenguajes, lint, autocompletado, tema). Para añadir un lenguaje: `types.ts`, `languages.ts` y `LANGUAGE_NAMES`.
- Props principales: `selectable`, `languages`, `lint`, `autocomplete`, `highlight`, `extensions`.
- Modelos: `v-model` (texto con `\n`) y `v-model:language` (por defecto `'plain'`).
- Para bash, el componente ofrece dos switches: heredoc (`bash <<'DEPLOYER_EOF'`) y `bash -c`. Su estado se deriva del texto.
- Colores con tokens `--ui-*`, sin hexadecimales.
- Los comandos con barras invertidas (`\"`, `\$`, `\n`) se escriben con `String.raw`. Una plantilla normal consume los escapes antes de guardar el comando en SQLite.
