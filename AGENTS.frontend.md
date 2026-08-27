# Guía de Frontend - DeployerApp

> Guía específica para tareas de **Vue / TypeScript**. Lee también [AGENTS.md](./AGENTS.md) para las reglas comunes.

---

## 1. Estructura del Frontend

```
src/
├── assets/
│   └── css/
│       ├── main.css     <- Paleta + tokens semánticos + utilidades PCB
│       ├── fonts.css    <- @font-face de Inter y JetBrains Mono (autohospedadas)
│       └── fonts/        <- Archivos .woff2 de las fuentes
├── components/          <- Componentes reutilizables de UI (form/, pages/, table/, remote/...)
├── composables/         <- Lógica con reactividad de Vue (useSchemaToForm, useRemoteCommand, queries/, ...)
├── lib/                 <- Capa de datos: db.ts (Drizzle proxy), schema.ts/relations.ts (auto), schema-types.ts, entities/, docker-compose/
├── loaders/             <- Loaders de datos (defineColadaLoader de pinia-colada), organizados por dominio
├── locales/             <- i18n (es/, _loader.ts)
├── pages/               <- Vistas de la aplicación (dashboard/{app,hosts,passkeys,projects/docker/compose,console,theme}, deployer/)
├── schemas/             <- JSON Schema de edición (compose-spec.json, composer-schema.json)
├── types/               <- Tipos (entities.ts, tauri-types.d.ts auto-generados)
└── utils/               <- Funciones puras sin reactividad de Vue

theme/                   <- Temas personalizados de componentes Nuxt UI (raíz del proyecto)
├── index.ts             <- Barrel de re-exports
├── alert.ts
├── badge.ts
├── button.ts
├── card.ts
├── checkbox.ts
├── contextMenu.ts
├── dashboardNavbar.ts
├── dashboardPanel.ts
├── dashboardSidebar.ts
├── dropdownMenu.ts
├── input.ts
├── modal.ts
├── navigationMenu.ts
├── progress.ts
├── radioGroup.ts
├── select.ts
├── separator.ts
├── switch.ts
├── table.ts
├── tabs.ts
├── textarea.ts
├── toast.ts
└── tooltip.ts
```

> **Nota sobre el historial:** los catálogos de `projects`, `tasks`, `variables` y `deployments` de versiones anteriores se retiraron del código activo; sus archivos quedan como `.back` (historial personal, no tocar). Los loaders activos de datos son `deployerApp.ts`, `docker_composes.ts`, `hosts.ts` y `passkeys.ts`.

---

## 2. Sistema de Temas (Nuxt UI v4) — Identidad visual "PCB"

DeployerApp tiene una identidad visual inspirada en placas de circuito impreso (PCB), coherente con el logo de la app (cohete + circuito). Todos los componentes Nuxt UI están personalizados bajo este lenguaje, y son **compatibles con tema claro y oscuro** de forma automática.

### Paleta y colores semánticos

Paleta custom registrada en `main.css` bajo `@theme static` con el prefijo `deployer-`:

- `deployer-primary` → Azul eléctrico (#0a8dff)
- `deployer-secondary` → Morado neón (#821aff)
- `deployer-success` → Verde azulado (#00c8a3)
- `deployer-info` → Cyan neón (#00c7ff)
- `deployer-warning` → Amarillo-naranja (#e6b200)
- `deployer-error` → Rojo magenta (#ff0a55)
- `deployer-neutral` → Gris azulado (claro y oscuro)

Estos se mapean como colores semánticos de Nuxt UI en `vite.config.ts → ui.colors`:

```ts
colors: {
  primary: 'deployer-primary',
  secondary: 'deployer-secondary',
  success: 'deployer-success',
  info: 'deployer-info',
  warning: 'deployer-warning',
  error: 'deployer-error',
  neutral: 'deployer-neutral',
}
```

> **Clave:** al estar mapeado en `ui.colors`, Nuxt UI genera automáticamente las variantes claro/oscuro de cada color **y sus propios `--ui-primary`, `--ui-secondary`, etc.** Por eso esos tokens de color semántico **NO se redeclaran en `main.css`**. Solo se declaran los tokens de superficie/texto (`--ui-bg`, `--ui-text`...). Los archivos de tema **nunca deben hardcodear hexadecimales** — siempre clases semánticas o tokens `--ui-*`.

### Tokens semánticos Nuxt UI (`--ui-*`) declarados en `main.css`

En `main.css` se declaran en `:root` (modo claro) y se sobreescriben en `.dark` (modo oscuro):

- `--ui-bg`, `--ui-bg-elevated`, `--ui-bg-accented`, `--ui-bg-inverted`
- `--ui-border`, `--ui-border-accented`, `--ui-border-inverted`
- `--ui-text`, `--ui-text-dimmed`, `--ui-text-muted`, `--ui-text-toned`, `--ui-text-highlighted`, `--ui-text-inverted`
- `--ui-radius`

Los colores semánticos (`--ui-primary`, `--ui-secondary`, `--ui-success`...) **no se declaran aquí**: ya los genera Nuxt UI desde `ui.colors`.

Variables propias PCB: `--pcb-trace`, `--pcb-trace-glow`, `--pcb-pad`, `--pcb-board`, `--pcb-silk` — con valores distintos en claro/oscuro.

### Tipografía

- **Inter** (texto general) — autohospedada en `src/assets/css/fonts/`.
- **JetBrains Mono** (`font-pcb`) — badges, labels técnicos, tooltips, valores numéricos.

### Utilidades CSS reutilizables (definidas en `main.css`)

| Clase                                     | Uso                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `.pcb-clip-br`                            | Esquina inferior-derecha recortada — botones (no-square), inputs                |
| `.pcb-clip-badge` / `.pcb-clip-badge-alt` | Esquinas opuestas recortadas — badges tipo chip SMD                             |
| `.pcb-clip-card`                          | Las 4 esquinas recortadas — cards, modals                                       |
| `.pcb-clip-hex`                           | Hexágono achatado — indicadores de estado                                       |
| `.pcb-shadow-xs/sm/md/lg`                 | Glow de marca vía `filter: drop-shadow(...)` — **obligatorio con `pcb-clip-*`** |
| `.pcb-shadow-neutral`                     | Sombra neutra vía `drop-shadow` — cards/elementos sin énfasis de color          |
| `.pcb-shadow-hover-md`                    | Variante hover de glow                                                          |
| `.pcb-trace-top` / `.pcb-trace-bottom`    | Línea de traza energizada en borde sup/inf                                      |
| `.pcb-trace-left`                         | Indicador lateral degradado fijo azul→morado                                    |
| `.pcb-trace-left-current`                 | Igual pero usa `currentColor` — para alert, toast (fijar con `text-{color}-*`)  |
| `.pcb-corners`                            | Nodos circulares en esquinas — cards, modals                                    |
| `.pcb-pad`                                | Pad de soldadura circular inline                                                |
| `.pcb-animate-pulse`                      | Pulso de energía en hover — botones solid                                       |
| `.pcb-animate-flow`                       | Flujo de gradiente — progress                                                   |
| `.pcb-animate-blink`                      | Parpadeo LED — **solo uso explícito y puntual**                                 |
| `.font-pcb`                               | Aplica JetBrains Mono                                                           |

### ⚠️ Regla crítica: `box-shadow` NO es compatible con `clip-path`

`box-shadow` se proyecta sobre la caja rectangular original, antes del `clip-path`. En elementos con `pcb-clip-*` esto produce sombras rectangulares con esquinas "fantasma" visibles. Lo mismo aplica a `@keyframes` que animen `box-shadow` (ver `pcb-pulse` en `main.css`, que anima `filter` por este motivo).

**Regla:** todo elemento con `pcb-clip-*` usa `filter: drop-shadow(...)` — nunca `shadow-[...]`. No combinar dos utilidades que fijen `filter` en el mismo selector (`hover:pcb-shadow-*` + `hover:pcb-animate-pulse`): solo una "gana". Si hay animación de pulso en hover, esa es la única regla de filter.

### ⚠️ Regla crítica: `pcb-clip-*` incompatible con formas circulares

`clip-path` define una silueta poligonal. Si el elemento también tiene `border-radius` que lo hace circular (p. ej. un botón `square` con `rounded-full`), el clip-path corta esquinas rectas justo en la zona donde el radio intenta curvar — se ven "esquinas rectas" dentro del propio círculo.

**Regla:** nunca aplicar `pcb-clip-*` a un elemento que vaya a tener `border-radius` circular o que sea icon-only. En `button.ts` esto se resuelve condicionando el clip-path a la variant `square`:

```ts
variants: {
  square: {
    false: { base: 'pcb-clip-br' }, // botón rectangular → esquina recortada
    true:  { base: '' },            // botón icon-only → sin clip-path
  },
},
```

El theme base de Nuxt UI define `variants.square: { true: "" }` (solo padding via compoundVariants). Al redefinir `square` en el custom theme, `defu` fusiona ambos sin conflicto: el resultado es `{ true: "", false: "pcb-clip-br" }`. Verificado contra `node_modules/@nuxt/ui/dist/shared/ui.*.mjs`.

### ⚠️ Regla: animaciones de "atención" (`pcb-animate-blink`) nunca por defecto

No se aplica en ningún `color`/`variant` por defecto — se añade manualmente y puntualmente:

```vue
<UBadge label="CRÍTICO" color="error" variant="solid" class="pcb-animate-blink" />
```

### ⚠️ Regla crítica: estados `disabled` deben anular `hover`/`active`/`highlighted`

`hover:`, `active:`, `data-highlighted:` se disparan por posición del cursor independientemente del estado disabled.

**Regla:** todo slot interactivo con `hover:`/`active:` incluye `disabled:pointer-events-none` junto a la reducción de opacidad. En componentes de Reka UI donde el disabled se marca con atributo de datos, usar `data-disabled:pointer-events-none`.

```ts
// Pseudo-clase nativa (botones, checkbox, switch, tabs, inputs...)
'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none'

// Atributo de datos (items de menús, links de navegación en Reka UI...)
'data-disabled:opacity-40 data-disabled:cursor-not-allowed data-disabled:pointer-events-none'
```

Componentes que ya siguen esta regla: `button`, `select` (base + item), `checkbox`, `switch`, `tabs` (trigger), `navigationMenu` (link + childLink), `dropdownMenu`/`contextMenu` (item).

### Registro de temas en vite.config.ts

```ts
ui({
  ui: {
    colors: { ... },
    icons: { ... },
    alert: theme.alert,
    badge: theme.badge,
    button: theme.button,
    card: theme.card,
    checkbox: theme.checkbox,
    contextMenu: theme.contextMenu,
    dropdownMenu: theme.dropdownMenu,
    input: theme.input,
    modal: theme.modal,
    navigationMenu: theme.navigationMenu,
    progress: theme.progress,
    radioGroup: theme.radioGroup,
    select: theme.select,
    separator: theme.separator,
    switch: theme.switchTheme,   // ← alias: "switch" es palabra reservada en JS
    table: theme.table,
    tabs: theme.tabs,
    textarea: theme.textarea,
    toast: theme.toast,
    tooltip: theme.tooltip,
    dashboardNavbar: theme.dashboardNavbar,
    dashboardPanel: theme.dashboardPanel,
    dashboardSidebar: theme.dashboardSidebar,
  },
})
```

### Concepto visual por componente

| Componente                             | Tratamiento PCB                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `button`                               | Esquina inf-derecha recortada (solo no-square), pulso en hover solid, `drop-shadow`       |
| `badge`                                | Esquinas opuestas tipo chip SMD, fuente mono, `drop-shadow`                               |
| `input` / `textarea` / `select`        | Esquina inf-izquierda recortada, glow `drop-shadow` en focus                              |
| `checkbox`                             | Pad de soldadura cuadrado, degradado de marca al marcar                                   |
| `switch`                               | Track como pista de circuito, thumb como pad deslizante                                   |
| `card` / `modal`                       | 4 esquinas recortadas + nodos (`pcb-corners`), traza en header/footer, `drop-shadow`      |
| `tabs`                                 | Indicador activo como puente conductor deslizante                                         |
| `progress`                             | Pista con anillo, relleno con flujo animado                                               |
| `separator`                            | Línea de traza con degradado, label en mono                                               |
| `tooltip`                              | Panel tipo "readout" técnico, fuente mono                                                 |
| `alert`                                | Traza lateral izquierda (`pcb-trace-left`)                                                |
| `toast`                                | Fondo tintado + traza lateral (`pcb-trace-left-current`) + borde — distinguible sin icono |
| `navigationMenu`                       | Item activo con traza lateral izquierda                                                   |
| `dashboardNavbar` / `dashboardSidebar` | Traza energizada en separación header/footer                                              |
| `table`                                | Cabecera sticky, nodo PCB en primera columna, filas iluminadas en hover                   |
| `dropdownMenu` / `contextMenu`         | Panel readout, item resaltado con borde-traza izquierdo                                   |

### Estructura de un archivo de tema — checklist

```ts
export default {
	slots: { base: '...' },
	variants: {/* solo si el componente necesita condicionar pcb-clip-* por variant */},
	compoundVariants: [{ color: 'primary', variant: 'solid', class: '...' }],
}
```

Al añadir o modificar cualquier theme file, verificar:

- ✅ Sin hexadecimales hardcodeados — solo clases semánticas o tokens `--ui-*`
- ✅ Slots con `pcb-clip-*` usan `drop-shadow`, nunca `shadow-[...]`
- ✅ No hay dos reglas de `filter` en el mismo selector
- ✅ `pcb-clip-*` no se aplica a elementos que sean o puedan ser circulares
- ✅ Ningún color/variant lleva `pcb-animate-blink` por defecto
- ✅ Slots con `hover:`/`active:` llevan `disabled:pointer-events-none` o `data-disabled:pointer-events-none`

---

## 3. Convenciones de Desarrollo

### Composables vs Utilidades vs Loaders

- **`/composables`**: Solo para lógica que usa reactividad de Vue (`ref`, `computed`, `onMounted`, etc.).
- **`/utils`**: Para funciones puras sin reactividad. Si una función no necesita Vue, va aquí.
- **`/loaders`**: Loaders de datos creados con `defineColadaLoader` de `vue-router/experimental/pinia-colada`. Cada loader exporta una función (ej. `useHostById`) que se usa en el `<script setup>` de la página. Los loaders son **lazy** por defecto y exponen `data`, `isLoading`, `error`.

### Composables de datos (`useQuery.ts`)

- **Lecturas de datos**: los loaders en `src/loaders/` usan `defineColadaLoader` de `pinia-colada` y se consumen directamente en las páginas (ej. `useHostById()`, `useDockerComposeListAll()`, `usePasskeysListAll()`, `useDeployerAppInfo()`). No hay barrel intermedio.
- La validación de unicidad de los schemas Zod (`composables/schemas/*.ts`) usa `countWhere(table, condition)` de `composables/queries/shared.ts` directamente. Construye la condición con `eq`/`and`/`ne` de `drizzle-orm` sobre la tabla importada desde `@/lib/schema` — nunca SQL manual interpolado.

  ```ts
  // composables/schemas/hosts.ts
  import { and, eq, ne } from 'drizzle-orm'
  import { countWhere } from '@/composables/queries/shared'
  import { hosts } from '@/lib/schema'

  .refine(async (value) => {
    const condition = hostId
      ? and(eq(hosts.name, value), ne(hosts.id, hostId))!
      : eq(hosts.name, value)
    const exist = await countWhere(hosts, condition)
    return exist <= 0
  }, t('validation.hosts.name.not_unique'))
  ```
- Los **tipos** de las entidades (ej. `HostRow`) provienen del schema Drizzle (`@/lib/schema`); los tipos generados por Rust (entidades `Host`, `DockerCompose`, y los inputs/respuestas de comandos) se importan desde `@/types/entities` y `@/types/tauri-types` (auto-generados por `ts-rs`).
- **Ninguna escritura vive en un loader.** Las operaciones sobre datos (INSERT/UPDATE/DELETE) se hacen con Drizzle (`db.insert/update/delete` en `@/lib/db.ts`, vía `query_raw`) o, si hay lógica de backend (SSH/SFTP, caché Docker Hub, gestión de BD), con un `invoke('...')` directo al comando Rust en el sitio de uso — nunca a través de un wrapper intermedio.

### Acceso a la base de datos

- Todo el acceso a datos (lecturas **y** escrituras) va por **Drizzle en modo proxy** (`src/lib/db.ts`), que delega en el comando Tauri `query_raw`.
  - Por defecto (`_decryptEnabled == false`), el proxy envía `maskFields` y el backend sustituye `ENC:` por `BLANK_VALUE`.
  - Con `withDecryption(true, fn)`, el proxy envía `decryptFields` y el backend descifra con la master key.
  - En escrituras, el proxy detecta los campos cifrados desde el schema (via `detectEncryptedFieldsFromSchema`) y construye el `encryptMask`; elimina además los valores centinela/`ENC:` antes del invoke (`stripEncryptedValues`).
- Los comandos Rust `invoke('...')` solo se usan para operaciones con lógica de backend (SSH/SFTP, cripto de claves, caché Docker Hub, gestión de BD).
- No existe acceso directo a SQLite desde el frontend — todo pasa por los comandos Tauri.

---

## 4b. Sistema de iconos centralizado (`src/utils/icons.ts`)

Todos los iconos de la app (Tabler vía Nuxt UI) están centralizados en `src/utils/icons.ts`. **No hardcodear `'i-tabler-...'` como string literal en componentes/composables nuevos** — importar siempre desde aquí.

```ts
import { ICONS, getModuleIcon, getModuleSwitchIcons, toIconify } from '@/utils/icons'
```

### `MODULE_ICONS` / `getModuleIcon(moduleName, variant?, isIconify?)`

Un set `{ plural, singular, off }` por cada módulo (`hosts`, `projects`, `deployments`, `variables`, `global_variables`, `passkeys`, `tasks`, `docker_composes`):

- `plural` — icono de listado/navegación/módulo (sidebar, `UDashboardNavbar`, `UEmpty`).
- `singular` — icono de un elemento individual activo.
- `off` — icono del elemento inactivo/deshabilitado (errores 404 de entidad, switches).

```ts
getModuleIcon('hosts') // 'i-tabler-cloud-network' (plural, por defecto)
getModuleIcon('hosts', 'singular') // 'i-tabler-server'
getModuleIcon('hosts', 'off') // 'i-tabler-server-off'
getModuleIcon('hosts', 'singular', true) // 'tabler:server' (formato Iconify, para <Icon /> de @iconify/vue)
```

`getModuleSwitchIcons(moduleName, isIconify?)` devuelve `{ uncheckedIcon, checkedIcon }` listo para `USwitch`/`UToggle` (usa `off`/`singular`).

### `ICONS` — resto de iconos, agrupados por categoría

`app`, `actions`, `status`, `auth`, `server`, `database`, `calendar`, `framework`, `social`, `misc`. Ver el propio archivo para el listado completo.

### Migración completada

Las páginas activas (`pages/dashboard/{app,hosts,passkeys,projects/docker/compose}/...`) ya usan `ICONS`/`getModuleIcon`. No queda ningún `i-tabler-...` hardcodeado conocido fuera de archivos no tocados (revisar al editar cualquier archivo nuevo que use iconos).

> `getModuleIcon` cubre el `ModuleName` completo (8 módulos), sin importar que algunos (deployments, variables, global_variables, tasks) ya no tengan páginas propias en el código activo.

---

## 4. Toolbar

El contenido de la toolbar se gestiona con el composable `useToolbarContent.ts`:

- `useToolbarContentCreate` — para vistas de creación.
- `useToolbarContentEdit` — para vistas de edición.
- Los botones extra usan el patrón `vnode: () => VNode` (factory) con posiciones nombradas (`ExtraButtonPosition`).

> **Importante:** `vnode` debe ser siempre una función factory `() => VNode`, nunca un VNode estático. Los VNodes estáticos congelan los valores reactivos en el momento de creación.

---

## 5. Internacionalización (i18n)

- Se usa `vue-i18n`.
- Los mensajes de error del backend llegan como claves i18n con parámetros `HashMap<String, String>`.
- El backend es agnóstico al idioma — nunca devuelve strings en español directamente.
- **Todas las claves de traducción deben estar en `snake_case`** (ej. `database.migrationSuccess`, `hosts.name.not_unique`). No usar `camelCase` ni `kebab-case` en claves de mensajes.

### Carga de mensajes (`src/locales/_loader.ts`)

- Cada idioma tiene su carpeta (`src/locales/es/`, `src/locales/en/`...) con un archivo `.ts` por cada grupo de mensajes (`common.ts`, `entity/host.ts`, `pages/setup.ts`...).
- `_loader.ts` usa `import.meta.glob` para cargar todos los `.ts` de `es/**` (excluyendo `es/formats/**`, que son los formatos de fecha/número) y los ensambla en un objeto anidado según la ruta del archivo (`pages/setup.ts` → `{ pages: { setup: {...} } }`).
- Caso especial: un archivo `index.ts` fusiona sus claves directamente en el padre en vez de anidarse bajo `index` (ej. `pages/index.ts` → `result.pages`, no `result.pages.index`).
- En `DEV`, se avisa por consola si a un idioma le faltan archivos respecto al idioma de referencia (`es`).
- Al añadir un idioma nuevo: añadir sus entradas en `LOCALE_GLOBS`, `DATETIME_GLOBS` y `NUMBER_GLOBS` de `_loader.ts`.

### Mensajes type-safe (autocompletado y validación de `t()` / `$t()`)

- Cada archivo de mensajes exporta con `satisfies LocaleMessageValue` (nunca con el cast `<LocaleMessageValue>{...}`) para conservar el tipo literal de sus claves:

  ```ts
  import type { LocaleMessageValue } from 'vue-i18n'

  export default {
  	active: 'Activo',
  	confirm: { label: 'Confirmar', delete: 'Eliminar' },
  } satisfies LocaleMessageValue
  ```

- `scripts/generate-i18n-schema.ts` recorre `src/locales/es/**` (misma exclusión de `formats/` y misma regla de `index.ts` que `_loader.ts`) y genera `typed-locale.d.ts` en la raíz del proyecto: un `import type` + `typeof` por cada archivo, compuestos en una interfaz `MessageSchema` que aumenta `DefineLocaleMessage` de `vue-i18n` vía `declare module`.
- **Claves con función** (`(ctx: MessageContext) => ...`, ej. `overlays.toast.description.error`): el generador las normaliza a `string` en el schema vía el tipo `NormalizeMessages`. Motivo: vue-i18n v11 calcula las claves válidas de `t()` del Composition API con `JsonPaths` (`@intlify/core-base`), que recursa dentro de cualquier valor que extienda `Record<string, any>` — una función también lo extiende — excluyendo del autocompletado la clave original. Normalizarlas a hojas `string` las restaura; es types-only (no afecta al runtime ni al retorno de `t()`).
- `typed-locale.d.ts` es un archivo **autogenerado** (está en `.gitignore`) — nunca editarlo a mano. Se regenera automáticamente en `bun run dev` (que ejecuta `i18n:types`); también se puede regenerar manualmente con `bun run i18n:types`. **Nota:** `bun run build` actualmente **no** ejecuta `i18n:types` (solo `vue-tsc --noEmit && vite build`), por lo que si se añaden claves hay que lanzar `i18n:types` antes del build.
- Gracias a la augmentation global, `t('common.active')`, `useI18n().t(...)` y `$t(...)` en plantillas quedan autocompletados y validados en toda la app sin tipar cada `useI18n()` manualmente.
- Al añadir un archivo de mensajes nuevo en `es/`, no hace falta tocar `typed-locale.d.ts` — se regenera solo en el siguiente `dev`/`build`/`i18n:types`. El idioma `en` no tiene su propio schema: solo `es` se usa como referencia de tipos (igual que es la referencia para `warnMissingKeys` en runtime).

---

## 6. Llamadas a comandos Tauri

### Acceso a datos: Drizzle proxy (recomendado para CRUD)

Todas las operaciones sobre las tablas de la BD (SELECT, INSERT, UPDATE, DELETE) se hacen con **Drizzle en modo proxy** (`src/lib/db.ts`, `db` exportado). El proxy detecta los campos cifrados desde el schema (`encryptedText(...)` en `src/lib/schema-types.ts`), emite el SQL, y delega en el comando `query_raw` de Rust, que se encarga de cifrar (escrituras), descifrar (lecturas con `withDecryption`) o enmascarar (lecturas por defecto) los campos.

```ts
import { db } from '@/lib/db'
import { hosts, projects_docker_compose } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { withDecryption } from '@/lib/db'

// Lectura sin descifrado (los campos cifrados llegan como BLANK_VALUE)
const row = await db.select().from(hosts).where(eq(hosts.id, id)).limit(1)

// Lectura con descifrado explícito
const raw = await withDecryption(true, () =>
	db.select().from(hosts).where(eq(hosts.id, id)).limit(1),
)

// Escritura
await db.insert(projects_docker_compose).values({ name, host_id })
```

### Comandos `invoke` (lógica de backend)

Para operaciones que Drizzle no puede cubrir (SSH/SFTP, cripto de claves, caché Docker Hub, gestión/inicialización de BD), se llama `invoke(...)` directamente en el sitio de uso. Comandos disponibles (ver `src-tauri/src/lib.rs`):

- **Hosts:** `test_connection`, `host_updates`, `host_check_system_info`, `host_check_metrics`, `host_update_packages`.
- **Passkeys:** `generate_passkey`, `derive_passkey_info`, `export_public_key`.
- **Docker Hub:** `cache_docker_search`, `cache_docker_tags`.
- **Docker Compose remoto:** `sync_project_docker_compose_files`, `project_docker_compose_up/down/ps/logs/restart/pull`.
- **BD / setup (deployer):** `get_database_path`, `set_database_path`, `check_database_exists`, `initialize_database`, `create_database_file`, `validate_database_sqlite`, `get_app_info`, `get_database_info`, `get_migrations_info`, `execute_migrations`, `has_migrations_pending`.
- **Consola remota (SSH suelto):** `ssh_execute_command`, `ssh_upload_file`, `ssh_download_file`, `ssh_cancel_remote_job`.

```ts
import { invoke } from '@tauri-apps/api/core'
import type { CommandResponse } from '@/types/tauri-types'

const result = await invoke<CommandResponse<GeneratedPasskey>>('generate_passkey', { input })
if (result.success) {
	// result.data
}
```

Escrituras vía Drizzle: el `invoke` se usa solo para comandos Rust; para INSERT/UPDATE/DELETE sobre entidades se usa `db` (ver arriba).

### Consola remota (`commands/remote/` + `useRemoteCommand`)

Comandos SSH "sueltos" para la consola remota (`/dashboard/console`), con streaming por Channel:

- Backend: `ssh_execute_command`, `ssh_upload_file`, `ssh_download_file`, `ssh_cancel_remote_job` (ver `AGENTS.backend.md` § 5.1 «Consola remota»).
- Frontend: `useRemoteCommand` (`src/composables/useRemoteCommand.ts`) encapsula la creación del `Channel<RemoteConsoleEvent>` y el `invoke`. Expone:
  - Estado reactivo: `output`, `isRunning`, `lastExitCode`, `errorMessage`.
  - Acciones: `execute(input)`, `upload(input)`, `download(input)` (devuelven `CommandResponse<T> | null`; `null` = rechazo del invoke).
  - `cancel()` → `invoke('ssh_cancel_remote_job')` (sin args; best-effort, no espera respuesta del job).
  - `clear()` para resetear output/estado.
- Eventos del Channel (`RemoteConsoleEvent`): `output_chunk` (append a `output`), `finished` (guarda `exit_code`), `error` (guarda `message`).
- Componente presentacional: `RemoteConsole.vue` (`src/components/remote/`). Si recibe `hostId` como prop usa ese host fijo; si no, muestra `SelectHost` interno. El botón "Cancelar" (`ICONS.actions.stop`) aparece solo mientras `isRunning`.
- `success: true` no implica éxito del comando remoto: el `exit_code` real viaja en `data.exit_code` (0 = OK, != 0 = comando falló, -1 = desconocido). Los errores de transporte devuelven `success: false`.
- Página: `src/pages/dashboard/console.vue` (ruta `/dashboard/console`, name `dashboard-console`).

> Los catálogos de `projects`, `tasks`, `variables` y `deployments` y el runner universal de deployments (`run_deployment`, `ProgressEvent`) de versiones anteriores **ya no están en el código activo** (archivados en `.back` / `_archived.dist/`). No añadir referencias nuevas a `crud_*` ni a `run_deployment`.

---

### `@vueuse/integrations` (`useSortable`): importar SIEMPRE el submódulo directo

`@vueuse/integrations` es un paquete "barrel" que reexporta muchas integraciones (`useSortable`, `useAsyncValidator`, `useAxios`, `useQRCode`, ...), cada una con su propia dependencia opcional (`sortablejs`, `async-validator`, `axios`, `qrcode`...). Importar `import { useSortable } from '@vueuse/integrations'` obliga a Vite a resolver el barrel completo, incluidas dependencias que no tenemos instaladas (rompe en dev con `Could not resolve "async-validator"` aunque no se use `useAsyncValidator`).

**Siempre** importar el submódulo directo: `import { useSortable } from '@vueuse/integrations/useSortable'`. Y añadir `@vueuse/integrations` como dependencia explícita en `package.json` (antes solo estaba `@vueuse/core`, y `@vueuse/integrations` se resolvía por hoisting transitivo, lo cual es frágil).

Además, **siempre** pasar `watchElement: true` en las opciones cuando el contenedor esté dentro de un `v-if` que depende de datos asíncronos (ej. `v-if="localHosts.length"` con datos de un loader de `pinia-colada`). Por defecto `watchElement` es `false` y `useSortable` solo intenta enlazar Sortable.js **una vez** en `onMounted`; si en ese primer render el elemento aún no existe en el DOM (datos no cargados todavía), Sortable.js nunca se inicializa y el drag & drop queda muerto sin ningún error en consola. Con `watchElement: true`, `useSortable` monta un `watch` reactivo sobre el elemento y lo enlaza en cuanto aparece.

**No usar la API `{ start, stop, option }` que devuelve `useSortable()` para configurar `handle`/`onUpdate` después de la llamada.** La instancia real de Sortable.js se crea dentro de un `onMounted` interno (asíncrono respecto al `<script setup>`), así que si llamas a `option('handle', ...)` justo después de `useSortable()`, la instancia todavía no existe y la llamada no hace nada (se pierde en silencio, sin error). **Siempre** pasar `handle`, `animation`, `onUpdate`, etc. como tercer argumento (objeto de opciones) directamente en la llamada a `useSortable(el, list, { handle: '.handle', onUpdate: ... })`. Tampoco llamar a `stop()` manualmente en un `onMounted` propio del componente: si se registra después del `onMounted` interno de `useSortable` (que es lo normal, al llamarse después en el `<script setup>`), destruye la instancia justo después de crearla.

**`forceFallback: true` es OBLIGATORIO en Tauri.** Sortable.js usa por defecto la API nativa HTML5 Drag & Drop (`dragstart`/`dragover`/...), que **no funciona de forma fiable dentro de webviews embebidos** (WebView2 en Windows, WebKit en macOS/Linux vía Tauri; el mismo problema afecta a Electron). Síntoma: nada de código da error, pero arrastrar no hace absolutamente nada (el navegador del sistema operativo sí lo haría bien, la app empaquetada no). Solución: pasar siempre `forceFallback: true` en las opciones de `useSortable`, que hace que Sortable.js use eventos de ratón normales en vez de la API nativa.

## 6c. CRÍTICO: cualquier `data` de un loader de `pinia-colada` es un `shallowRef`

Cualquier loader creado con `defineColadaLoader` de `vue-router/experimental/pinia-colada` (que usa `@pinia/colada` por debajo) expone `data` como **`shallowRef`**, por diseño de la librería (rendimiento con datasets grandes). Esto tiene una consecuencia que hay que tener SIEMPRE presente en componentes que muten ese objeto (p.ej. la entidad cargada en una vista):

- **Mutar una propiedad anidada del objeto NO dispara reactividad.** Ejemplos de código que NO actualizan la vista, aunque el dato en memoria sí cambie: `obj.prop = x`, `obj.items = [...]`, `Object.assign(obj, patch)`. Ninguno lanza error: el dato queda correctamente actualizado en el objeto JS, pero Vue no se entera porque el objeto al que apunta `.value` no está envuelto en un Proxy reactivo.
- **Solo reasignar `.value` completo dispara reactividad**: `data.value = { ...data.value, prop: nuevo }`. Este es el patrón que hay que usar para ver el cambio reflejado sin recargar.
- **Alternativa más simple, pero más lenta**: usar el `reload` del propio loader (o `invalidate`/refetch de `pinia-colada`) tras la mutación. Correcto, pero dispara una consulta completa a la BD (con `isLoading` de por medio) en cada llamada — usar solo donde la frecuencia es baja.
- **Regla práctica:** después de crear/actualizar/borrar algo que afecte a un objeto ya cargado en un loader, o reasignar `.value` completo con spread usando los datos en memoria, o hacer refetch del loader. Nunca dejar solo una mutación anidada como única fuente de verdad para el render.

---

## 7. Loading Screen

La pantalla de carga se gestiona en `index.html`. Cuando Vue monta la aplicación, elimina el elemento splash — no hay un componente `Splashscreen` separado.

---

## 8. Formularios JSON-Schema (basado en `json-schema-library`)

Sistema de formularios que renderiza edición visual de documentos basados en un JSON Schema (p.ej. `compose.yaml` vía `ComposeJsonSchema.vue`, `composer.json`). El núcleo gira alrededor de **jsl** (`json-schema-library` v11) y es **agnóstico**: no importa `compose-spec.json` ni `composer-schema.json`. `JsonSchemaEditor.vue` es el editor genérico de documento (raíz con layout de objeto genérico); `ComposeJsonSchema.vue` y `ComposerJsonSchema.vue` son wrappers finos que le pasan schema + i18n + iconos (los únicos que importan los JSON de esquema).

### Utilidades (`src/utils/schema-form/*`)

- `jsl.ts`:
  - `compileRoot(schema)` → `{ root: SchemaNode, draft: string }`. La versión de draft se detecta sola (`draft-04`/`2020-12`, etc.).
  - `classifyNode(node)` → `{ kind, nullable, isUnion, isMap, variants? }`. Kinds: `string | number | integer | boolean | null | enum | array | object | map | union | any`. Semántica de `type` como array: `['<tipo>','null']` → tipo nullable; varios tipos sin `null` → union; varios con `null` → union + nullable; `'null'` solo → campo null.
  - `resolveNode(node)` → aplica `$ref` (`node.resolveRef()`) y fusiona `allOf` (`mergeNode`). **En jsl el `$ref` a nivel superior NO se resuelve solo**: hay que llamarlo (p.ej. `include.items`, `services` → service).
  - `isContainerNode(node)` → true si el nodo es un contenedor (`array`/`map`/`object`/`any`) o una unión con alguna variante contenedora (p.ej. `build` `['string','object']`); las uniones de solo simples (`boolean|string` en `attach`, `privileged`…) se consideran simples. Se usa para ordenar los hijos de un objeto.
  - `activeVariantIndex(node, data, path)` → índice de la variante activa de un oneOf/anyOf (reduce el nodo con `getNode('#', valor)` → `oneOfIndex`; fallback por tipo JS).
  - `preferredVariant(node)`, `variantDefault(node)` (vía `getData()`), `variantLabel(node)`.
- `paths.ts` → `getAt`/`setAt`/`deleteAt` por ruta de formulario `a.b[0]` y conversión `pathToPointer`/`pointerToPath`.
- `validate.ts` → `validateWithJsl(root, data, resolveMessage?)` → `{ ok, errors: Record<ruta, string[]> }`. Cada error mapea el JSON pointer → ruta de formulario y el código de jsl → clave i18n `form.schema_form.errors.<código>` (ver tabla en `validate.ts`). El resolver por defecto usa `useI18n()`; sin resolver se devuelve la clave.
- `normalize.ts` → sistema de **normalizadores por schema**. `SchemaNormalizer = (schema: Record<string, any>, pointer: string) => Record<string, any> | undefined` (transforma **un solo nodo** y recibe su JSON pointer, raíz `#`; `undefined` = sin cambios; los normalizadores con menos parámetros siguen siendo válidos). `booleanStringNormalizer` convierte las uniones exactas `boolean | string` (cualquier orden) en `boolean` (en compose el `string` solo existe para que ciertos parsers no fallen al leer `true`/`false` como texto). `normalizeSchema(schema, ...normalizers)` clona y recorre todo el esquema (`properties`, `patternProperties`, `$defs`, `definitions`, `oneOf`/`anyOf`/`allOf`/`prefixItems`, `items`, `additionalProperties`, `not`, `contains`) aplicando los normalizadores en orden a cada nodo (el pointer se escapa: `~`→`~0`, `/`→`~1`); **sin normalizadores devuelve el schema sin recorrerlo**. Cada editor elige los suyos: `ComposeJsonSchema.vue` → `normalizeSchema(composeSpec, booleanStringNormalizer, widgetsNormalizer(...))`; `ComposerJsonSchema.vue` → `normalizeSchema(composerSpec)` (sin normalizadores: su `abandoned` es `boolean|string` con el `string` como valor real, no se normaliza). Añadir un normalizador nuevo = una función de nodo, sin tocar el walker.
- `WIDGET_KEY = 'x-widget'` y `widgetsNormalizer(map: Record<pointer, nombre>)` en `normalize.ts`: marcan un nodo para renderizarlo con un widget concreto (`{ ...schema, 'x-widget': nombre }` solo si su pointer está en el mapa). jsl **ignora las claves `x-*`** (`SchemaNode.addKeywords`), así que el marcado no genera warnings. El nombre se resuelve contra el mapa `widgets` del formulario (núcleo agnóstico; los wrappers aportan los componentes: Compose → `ComposeImagePicker` para `#/$defs/service/properties/image`).

### Composable y componentes

- `useSchemaToForm(schema, options)` → `{ root, draft, formData, errors, validate, errorAt, get, set, remove, nodeAt(pointer), resolveTitle, resolveDescription, widgets }`. Los defaults iniciales salen de `root.getData()`. Opciones: `resolveTitle?`/`resolveDescription?`/`resolveMessage?`/`widgets?: Record<string, Component>` (mapa nombre de widget → componente para los nodos marcados con `x-widget`).
- `src/components/form/schema/*`:
  - `SchemaField.vue` — clasifica con `classifyNode` y despacha al componente adecuado; cualquier tipo nullable se rodea con `SchemaFieldNull`. Si el schema del nodo tiene `x-widget` (vía `WIDGET_KEY`) y `form.widgets[nombre]` existe, la rama escalar renderiza `<component :is="widget" v-model="model" />` en vez del input genérico. Los objetos delegan el cuerpo en `SchemaFieldObject` (la cabecera con label/help/remove/add queda aquí).
  - `SchemaFieldObject.vue` — render de los hijos de un objeto: **simples primero** (obligatorias delante de opcionales) y **contenedores** (`array`/`map`/`object`/uniones con variante contenedora) como **pestañas** (icono por kind + punto rojo/ámbar de error/warning). Cuando hay muchas simples opcionales (>10) se pliegan tras el botón "Mostrar campos": **inicialmente solo se ven las obligatorias** (en `service`, sin `required`, la sección simple queda plegada y lo primero visible son las pestañas: build, deploy, healthcheck…). Prop opcional `icon?: (name, node) => string | undefined`: resolver de icono por tab de contenedor; si no se provee usa `ICONS.schemaForm[kind]`. Así el núcleo sigue agnóstico y Compose conserva sus iconos (`ICONS.compose`).
  - `JsonSchemaEditor.vue` — editor genérico de documento (widget de diálogo): `defineModel<string|null>` (texto serializado en el formato elegido), `schema`, `title?`, `description?`, `formatOutput?: 'yaml' | 'json'` (default `'yaml'`; de él se infiere parseo `parseYaml`/`JSON.parse`, serialización `toYaml`/`JSON.stringify(data, null, 2)` y extensiones de import `.yaml,.yml`/`.json`), `importLabel?` (default `form.schema_form.import_file`), `resolveTitle?`/`resolveDescription?`/`resolveMessage?`, `icon?`, `widgets?: Record<string, Component>`. Internamente: `useSchemaToForm` + `provideSchemaFormContext`, sync model↔formData (los mismos watchers con `lastModel`/`syncingFromModel`/`nextTick`), alerts de error/warning, import de archivo, preview y badge de draft. La raíz se renderiza con `<SchemaFieldObject :node="form.root" path="" :icon="icon" />` → layout genérico (simples inline, contenedores como pestañas), sin hardcodeo de claves (`name`/`version` no se tratan aparte).
  - `ComposeJsonSchema.vue` / `ComposerJsonSchema.vue` — wrappers finos sobre `JsonSchemaEditor`: solo pasan `schema` (normalizado con `normalizeSchema` + sus normalizers), title/description y resolvers (Compose: `formatOutput="yaml"` + `form.compose_schema.*` + `icon = ICONS.compose[name]` + label de import específico + `widgetsNormalizer({'#/$defs/service/properties/image': 'compose-image'})` + `widgets={'compose-image': ComposeImagePicker}` → el campo `image` de cada servicio usa el picker de Docker Hub en vez de un string plano; Composer: `formatOutput="json"`, sin resolvers). Crear un editor nuevo = wrapper de configuración, no una copia.
  - `SchemaFieldNull.vue` — `USwitch` para activar/desactivar el valor `null` (activar → `set(path, null)`; desactivar → `remove(path)`).
  - `SchemaFieldUnion.vue` — `USelect` de variantes (`oneOf`/`anyOf`/type-array) + editor de la variante activa. **oneOf es exclusivo**: solo se edita el formato elegido.
  - `SchemaFieldArray.vue` — lista de items; si los items resueltos (`classifyNode(resolveNode(items))`) son una unión (`items.oneOf`, `$ref`→unión o `type` array) → `USelect` de formato del array (**array uniforme: solo UN formato**, todos los items con la misma variante, no se mezclan); default del item vía `variantDefault`.
  - `SchemaFieldMap.vue` — entradas con clave editable; el nodo de valor es `patternProperties[0]` → `additionalProperties` → `any`.
  - `SchemaFieldAny.vue` — textarea JSON.
  - `context.ts` — `useSchemaToFormContext()`/`provideSchemaFormContext()` para pasar el formulario a la profundidad.

### Gotchas del sistema

- **Defaults de `getData()`:** solo se incluyen propiedades `required` (con su `default` o el default del tipo: `0`, `""`, `false`…). Las propiedades opcionales con `default` **no** entran (así lo hace jsl).
- **i18n:** los mensajes de validación son claves `form.schema_form.errors.*` (nunca strings en español). Labels de variantes/títulos: `form.schema_form.*` y `form.compose_schema.*` (vía `resolveTitle`/`resolveDescription`).
- **No reinventar:** si un caso no se renderiza, resolver/compilar con las utilidades de `jsl.ts` antes de escribir un parser manual de `$ref`/`allOf`.
- **Testing:** `tests/{jsl,validate,schema-form,render,normalize}.test.ts` cubren clasificación, validación, defaults, render y normalizadores (incluido `widgetsNormalizer` + marcado `x-widget` sin warnings) sobre `compose-spec`/`composer-schema`.
