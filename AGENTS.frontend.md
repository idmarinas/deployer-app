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
├── components/          <- Componentes reutilizables de UI
├── loaders/           <- Loaders de datos (defineColadaLoader de pinia-colada), organizados por dominio
├── pages/               <- Vistas de la aplicación
└── utils/               <- Funciones puras sin reactividad de Vue

theme/                   <- Temas personalizados de componentes Nuxt UI
├── index.ts             <- Barrel de re-exports
├── alert.ts
├── badge.ts
├── button.ts
├── card.ts
├── checkbox.ts
├── contextMenu.ts
├── dashboardNavbar.ts
├── dashboardSidebar.ts
├── dropdownMenu.ts
├── input.ts
├── modal.ts
├── navigationMenu.ts
├── progress.ts
├── select.ts
├── separator.ts
├── switch.ts
├── table.ts
├── tabs.ts
├── textarea.ts
├── toast.ts
└── tooltip.ts
```

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
    select: theme.select,
    separator: theme.separator,
    switch: theme.switchTheme,   // ← alias: "switch" es palabra reservada en JS
    table: theme.table,
    tabs: theme.tabs,
    textarea: theme.textarea,
    toast: theme.toast,
    tooltip: theme.tooltip,
    dashboardNavbar: theme.dashboardNavbar,
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
- **`/loaders`**: Loaders de datos creados con `defineColadaLoader` de `vue-router/experimental/pinia-colada`. Cada loader exporta una función (ej. `useProjectById`) que se usa en el `<script setup>` de la página. Los loaders son **lazy** por defecto y exponen `data`, `isLoading`, `error`.

### Composables de datos (`useQuery.ts`)

- **Lecturas de datos**: los loaders en `src/loaders/` usan `defineColadaLoader` de `pinia-colada` y se consumen directamente en las páginas (ej. `useProjectById()`). No hay barrel intermedio.
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
- Los **tipos** de las entidades (ej. `ProjectRow`, `HostRow`) se importan desde los loaders o desde `@/tauri-types` (tipos auto-generados por `ts-rs`).
- **Ninguna escritura (CRUD) vive en un loader.** Los `invoke('crud_create_*' | 'crud_update_*' | 'crud_delete_*' | 'set_*', ...)` se llaman siempre directamente en el sitio de uso (página, composable de página, o `useTableColumns.ts` para las acciones de tabla) — nunca a través de un wrapper intermedio. Si aparece una tabla clave-valor o de ajustes en bloque, seguir el patrón de `invoke` directo.
### Acceso a la base de datos

- Todas las escrituras van por comandos Rust CRUD (`invoke('crud_*')`).
- Las lecturas sin cifrado van por Drizzle (`src/lib/db.ts` vía `invoke('query_raw')`).
- Las lecturas con cifrado van por comandos Rust (`invoke('crud_get_*' | 'crud_list_*')`).
- No existe acceso directo a SQLite desde el frontend — todo pasa por los comandos Tauri.

---

## 4b. Sistema de iconos centralizado (`src/utils/icons.ts`)

Todos los iconos de la app (Tabler vía Nuxt UI) están centralizados en `src/utils/icons.ts`. **No hardcodear `'i-tabler-...'` como string literal en componentes/composables nuevos** — importar siempre desde aquí.

```ts
import { ICONS, getModuleIcon, getModuleSwitchIcons, toIconify } from '@/utils/icons'
```

### `MODULE_ICONS` / `getModuleIcon(moduleName, variant?, isIconify?)`

Un set `{ plural, singular, off }` por cada módulo (`hosts`, `projects`, `deployments`, `variables`, `passkeys`, `tasks`):

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

Las tablas de `pages/dashboard/{hosts,projects,passkeys}/index.vue` (columnas de acciones, badges de auth_type, iconos de fecha en filas expandidas) y las páginas de error `[...path].vue` de los 6 módulos (`hosts`, `projects`, `passkeys`, `tasks`, `variables`, `deployments`) ya usan `ICONS`/`getModuleIcon`. No queda ningún `i-tabler-...` hardcodeado conocido fuera de archivos no tocados aún (revisar al editar cualquier archivo nuevo que use iconos).

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
- `typed-locale.d.ts` es un archivo **autogenerado** (está en `.gitignore`) — nunca editarlo a mano. Se regenera automáticamente en `bun run dev` y `bun run build` (ambos scripts ejecutan `bun run i18n:types` antes de arrancar Vite/`vue-tsc`); también se puede regenerar manualmente con `bun run i18n:types`.
- Gracias a la augmentation global, `t('common.active')`, `useI18n().t(...)` y `$t(...)` en plantillas quedan autocompletados y validados en toda la app sin tipar cada `useI18n()` manualmente.
- Al añadir un archivo de mensajes nuevo en `es/`, no hace falta tocar `typed-locale.d.ts` — se regenera solo en el siguiente `dev`/`build`/`i18n:types`. El idioma `en` no tiene su propio schema: solo `es` se usa como referencia de tipos (igual que es la referencia para `warnMissingKeys` en runtime).

---

## 6. Llamadas a comandos Tauri

### Patrón estándar (CRUD)

```ts
import { invoke } from '@tauri-apps/api/core'

const result = await invoke<CommandResponse<T>>('crud_get_project', { id: 1 })
if (result.success) {
	// result.data
}
```

### Patrón con Channel (runner de deployments)

```ts
import { Channel, invoke } from '@tauri-apps/api/core'
import type { ProgressEvent } from '@/tauri-types'

const channel = new Channel<ProgressEvent>()
channel.onmessage = event => {
	// deployment_started | task_pending | task_started |
	// output_chunk | task_retrying | task_finished |
	// task_skipped | deployment_finished | fatal_error
}

await invoke('run_deployment', { input: { deployment_id: 123 }, channel })
```

### Eventos del runner

| Evento                | Campos clave                                                           |
| --------------------- | ---------------------------------------------------------------------- |
| `deployment_started`  | `deployment_id`, `total_tasks`                                         |
| `task_pending`        | `execution_id`, `task_name`, `order`                                   |
| `task_started`        | `execution_id`, `task_name`                                            |
| `output_chunk`        | `execution_id`, `chunk`                                                |
| `task_retrying`       | `execution_id`, `attempt`, `max_attempts`, `delay_secs`                |
| `task_finished`       | `execution_id`, `task_name`, `status`, `exit_code`, `duration_seconds` |
| `task_skipped`        | `execution_id`, `task_name`, `reason`                                  |
| `deployment_finished` | `deployment_id`, `status`, `duration_seconds`                          |
| `fatal_error`         | `message`                                                              |

### Consola remota (`commands/remote/` + `useRemoteCommand`)

Comandos SSH "sueltos" para la consola remota (`/dashboard/console`), con streaming por Channel:

- Backend: `ssh_execute_command`, `ssh_upload_file`, `ssh_download_file`, `ssh_cancel_remote_job` (ver `AGENTS.backend.md` § "Comandos SSH sueltos").
- Frontend: `useRemoteCommand` (`src/composables/useRemoteCommand.ts`) encapsula la creación del `Channel<RemoteConsoleEvent>` y el `invoke`. Expone:
  - Estado reactivo: `output`, `isRunning`, `lastExitCode`, `errorMessage`.
  - Acciones: `execute(input)`, `upload(input)`, `download(input)` (devuelven `CommandResponse<T> | null`; `null` = rechazo del invoke).
  - `cancel()` → `invoke('ssh_cancel_remote_job')` (sin args; best-effort, no espera respuesta del job).
  - `clear()` para resetear output/estado.
- Eventos del Channel (`RemoteConsoleEvent`): `output_chunk` (append a `output`), `finished` (guarda `exit_code`), `error` (guarda `message`).
- Componente presentacional: `RemoteConsole.vue` (`src/components/remote/`). Si recibe `hostId` como prop usa ese host fijo; si no, muestra `SelectHost` interno. El botón "Cancelar" (`ICONS.actions.stop`) aparece solo mientras `isRunning`.
- `success: true` no implica éxito del comando remoto: el `exit_code` real viaja en `data.exit_code` (0 = OK, != 0 = comando falló, -1 = desconocido). Los errores de transporte devuelven `success: false`.
- Página: `src/pages/dashboard/console.vue` (ruta `/dashboard/console`, name `dashboard-console`).

---

### Tabs de relaciones N:M (ej. `ProjectTabHosts.vue`)

Para relaciones tipo `project_hosts` (N:M con datos propios: `deploy_order`, `enabled`), la tab **no** depende del `isEditMode` global de la pantalla — alta, orden, activar/desactivar y baja son acciones siempre disponibles con guardado inmediato por acción (no hay un modo "edición" separado):

- Los datos de la relación ya vienen anidados en la entidad padre (`project.project_hosts`, cargados por Drizzle en `useProjectQuery`), no hace falta query aparte.
- El catálogo de la entidad relacionada (ej. lista de hosts para el selector de alta) se resuelve con los loaders `useXSelectPopulate` ya existentes (ej. `useHostSelectPopulate`).
- Alta/baja/actualización llaman a `crud_create_*` / `crud_delete_*` / `crud_update_*` directamente y mutan el array local (`project.value.project_hosts`) en el mismo `then`, sin depender de invalidar caché de `pinia-colada` para refrescar la UI (más inmediato, evita refetch innecesario).
- `ToggleEnabled.vue` se reutiliza para el campo `enabled` de la relación; como invalida una key de caché fija (`['projects','list']`) pensada para el toggle de proyectos, en este contexto se ignora ese efecto y se escucha su evento `@updated` para mutar el estado local en su lugar.

### Catálogo de Tasks (`pages/dashboard/tasks/`)

Sigue exactamente el mismo patrón CRUD que `hosts` (`useTaskSchema`, `loaders/tasks.ts`, `TaskForm.vue`, `index/add/[id].edit.vue`, toolbar via `useToolbarContentCreate`/`Edit`), con una particularidad a tener en cuenta siempre que se toque:

- La entidad `Task` expone el campo `type: TaskType`, pero `CreateTaskInput`/`UpdateTaskInput` (y por tanto el schema Zod y `TaskForm.vue`) usan la clave `task_type`. Al cargar una task existente en `[id].edit.vue` hay que remapear `type` → `task_type` en el `state` (`const { type, ...rest } = task; state.value = { ...rest, task_type: type }`). Al enviar el formulario no hace falta remapeo inverso, porque los comandos ya esperan `task_type`.
- El campo `command` de la task solo es obligatorio para `task_type` `command`/`script` (validado con `.refine()` en `useTaskSchema`); para `upload_file`/`download_file` el `command` no se usa — esa configuración (rutas origen/destino) vive en `project_tasks.config` (ver `TaskConfig`/`FileTransferConfig`), porque depende de cada proyecto, no de la task global.
- `is_global` se fija siempre a `true` al crear desde este catálogo (no se expone en `TaskForm.vue`); si en el futuro se permiten tasks no globales (propias de un proyecto), habrá que revisar este punto.
- Iconos por `task_type` centralizados en `ICONS.taskType` (`utils/icons.ts`).

### `ProjectTabTasks.vue`: asignación de tasks con ajustes avanzados por asignación

Implementado siguiendo **exactamente** el mismo patrón que `ProjectTabHosts.vue`: sin copia local (`localTasks`), sin `isEditMode`, y toda mutación reasigna `project.value` completo con spread (nunca `reloadProject()` ni mutación en profundidad). El dato de cada task asignada viene embebido vía Drizzle Relational Query, igual que `host` en `project_hosts`:

- `useProjectQuery().find()` incluye `project_tasks: { with: { task: { columns: {...} } } }`; el tipo `ProjectTaskRow = ProjectTask & { task: Partial<Task> }` vive en `composables/queries/projects.ts` junto a `ProjectHostRow`.
- Alta: `crud_create_project_task` + `findProjectTaskById(id)` (análogo a `findProjectHostById`) para traer la fila recién creada ya con `task` embebido, luego `project.value = { ...project.value, project_tasks: [...] }`.
- Baja: `filter` + reasignación completa.
- Orden (drag & drop): idéntico a Hosts — `splice` en el propio array de `project.value.project_tasks`, recalcular `order_execution`, `invoke` por cada item que cambió, y **al final** `project.value = { ...project.value, project_tasks: reordered }`.
- Toggle `enabled`: igual que Hosts, inline en el `@updated` de `ToggleEnabled`, construyendo un array nuevo con el item sustituido y reasignando `project.value` completo (nunca mutar `projectTask.enabled` directamente).
- Panel de "ajustes avanzados" (botón `ICONS.app.settings`): plegable con `on_failure`, `condition`, overrides de `local_working_dir`/`remote_working_dir`/`retry_count`/`retry_delay`, y (solo si `projectTask.task.type` es `upload_file`/`download_file`) una sección de transferencia de archivos que edita `TaskConfig::UploadFile/DownloadFile` (`FileTransferConfig { paths: PathMapping[], overwrite }`, ver `AGENTS.backend.md`):
  - Checkbox `overwrite` a nivel de toda la config.
  - Lista repetible de `paths` (botón "Añadir ruta"): cada fila es un `PathMapping` (`src`, `dest`, `recursive`, `exclude` como input de texto con patrones separados por coma, `chmod`). Al editar, `exclude` se guarda internamente como string separado por comas y se convierte a `string[]` (filtrando vacíos) solo al serializar en `saveSettings`.
  - `chmod` deshabilitado si la task es `download_file` (no aplica, solo tiene efecto en el lado remoto tras subir); `exclude` deshabilitado si `recursive` es false (no aplica a un archivo suelto).
  - Selector de carpeta (icono `ICONS.actions.folder`) junto a `src` en `upload_file` (lado local) y junto a `dest` en `download_file` (lado local), usando `@tauri-apps/plugin-dialog`.
  - Al guardar, se filtran filas con `src`/`dest` vacíos antes de serializar a JSON.
- Al guardar el panel completo, se sustituye el item en el array (`project.value.project_tasks.map(...)`) y se reasigna `project.value` completo — no `Object.assign` sobre el objeto existente.
- **Por qué no `reloadProject()` aquí:** aunque es la alternativa "más simple" descrita en §7c, dispara una consulta completa a la BD (con `isLoading` de por medio) por cada toggle/edición puntual, lo cual se percibía como si la pantalla "recargara" al activar/desactivar una task — algo que Hosts nunca hacía porque siempre reasignaba `project.value` con los datos que ya tenía en memoria. Usar `reloadProject()` solo para casos donde de verdad hace falta releer todo desde BD (ej. tras una migración de datos compleja), no como sustituto por defecto de razonar la reasignación.

### `task_dependencies` (`TaskDependencies.vue`, dentro de `tasks/[id].edit.vue`)

Vive en la edición de la Task del catálogo, no en la tab de proyecto, porque las dependencias son entre tasks globales (no entre asignaciones `project_tasks`). Particularidades:

- La **lectura** es un `SELECT` directo vía Drizzle (`query_raw`), porque `task_dependencies` no tiene datos cifrados ni comando `crud_list_*` dedicado; las **mutaciones** (alta/baja/cambio de `dependency_type`) sí van por `invoke` a `crud_create_task_dependency` / `crud_update_task_dependency` / `crud_delete_task_dependency`.
- `UpdateTaskDependencyInput` solo permite cambiar `dependency_type`; para cambiar la task de la que se depende hay que borrar y crear de nuevo (no hay endpoint de "mover").
- El selector de "añadir dependencia" excluye la propia task (`taskId`) y las tasks de las que ya depende, usando el catálogo de `useTaskSelectPopulate`.

### `ProjectTabVariables.vue`

A diferencia de Hosts/Tasks, `project_variables` no tiene catálogo que asignar: la variable pertenece directamente al proyecto (CRUD simple 1:N, sin tabla de relación). Mismo principio que las demás tabs: no depende de `isEditMode` global, alta/edición/baja siempre disponibles con guardado inmediato y mutación local del array.

- Edición por fila con toggle vista/edición local (patrón similar a `ProjectTabInfo`, pero por item de una lista en vez de para toda la entidad).
- `is_secret`: el valor llega ya en texto plano desde `crud_get_project` (Rust descifra al leer), pero en la UI se enmascara por defecto (`••••••••`) con un botón de "ojo" para revelar/ocultar client-side — el cifrado real en BD lo gestiona `crud_update_project_variable` según el flag `is_secret`.
- Cada variable tiene `name` (visual) y `slug` (para interpolación `{{slug}}`). El slug es único por proyecto. La vista muestra `slug` como texto principal y `name` como paréntesis.

### `@vueuse/integrations` (`useSortable`): importar SIEMPRE el submódulo directo

`@vueuse/integrations` es un paquete "barrel" que reexporta muchas integraciones (`useSortable`, `useAsyncValidator`, `useAxios`, `useQRCode`, ...), cada una con su propia dependencia opcional (`sortablejs`, `async-validator`, `axios`, `qrcode`...). Importar `import { useSortable } from '@vueuse/integrations'` obliga a Vite a resolver el barrel completo, incluidas dependencias que no tenemos instaladas (rompe en dev con `Could not resolve "async-validator"` aunque no se use `useAsyncValidator`).

**Siempre** importar el submódulo directo: `import { useSortable } from '@vueuse/integrations/useSortable'`. Y añadir `@vueuse/integrations` como dependencia explícita en `package.json` (antes solo estaba `@vueuse/core`, y `@vueuse/integrations` se resolvía por hoisting transitivo, lo cual es frágil).

Además, **siempre** pasar `watchElement: true` en las opciones cuando el contenedor esté dentro de un `v-if` que depende de datos asíncronos (ej. `v-if="localHosts.length"` con datos de un loader de `pinia-colada`). Por defecto `watchElement` es `false` y `useSortable` solo intenta enlazar Sortable.js **una vez** en `onMounted`; si en ese primer render el elemento aún no existe en el DOM (datos no cargados todavía), Sortable.js nunca se inicializa y el drag & drop queda muerto sin ningún error en consola. Con `watchElement: true`, `useSortable` monta un `watch` reactivo sobre el elemento y lo enlaza en cuanto aparece.

**No usar la API `{ start, stop, option }` que devuelve `useSortable()` para configurar `handle`/`onUpdate` después de la llamada.** La instancia real de Sortable.js se crea dentro de un `onMounted` interno (asíncrono respecto al `<script setup>`), así que si llamas a `option('handle', ...)` justo después de `useSortable()`, la instancia todavía no existe y la llamada no hace nada (se pierde en silencio, sin error). **Siempre** pasar `handle`, `animation`, `onUpdate`, etc. como tercer argumento (objeto de opciones) directamente en la llamada a `useSortable(el, list, { handle: '.handle', onUpdate: ... })`. Tampoco llamar a `stop()` manualmente en un `onMounted` propio del componente: si se registra después del `onMounted` interno de `useSortable` (que es lo normal, al llamarse después en el `<script setup>`), destruye la instancia justo después de crearla.

**`forceFallback: true` es OBLIGATORIO en Tauri.** Sortable.js usa por defecto la API nativa HTML5 Drag & Drop (`dragstart`/`dragover`/...), que **no funciona de forma fiable dentro de webviews embebidos** (WebView2 en Windows, WebKit en macOS/Linux vía Tauri; el mismo problema afecta a Electron). Síntoma: nada de código da error, pero arrastrar no hace absolutamente nada (el navegador del sistema operativo sí lo haría bien, la app empaquetada no). Solución: pasar siempre `forceFallback: true` en las opciones de `useSortable`, que hace que Sortable.js use eventos de ratón normales en vez de la API nativa.

## 6c. CRÍTICO: `project` (y cualquier `data` de un loader de `pinia-colada`) es un `shallowRef`

`useProjectById()` (como cualquier loader creado con `defineColadaLoader` de `vue-router/experimental/pinia-colada`, que usa `@pinia/colada` por debajo) expone `data` como **`shallowRef`**, por diseño de la librería (rendimiento con datasets grandes). Esto tiene una consecuencia que hay que tener SIEMPRE presente en cualquier componente que reciba `project` (vía `inject('project')`):

- **Mutar una propiedad anidada del objeto NO dispara reactividad.** Ejemplos de código que NO actualizan la vista, aunque el dato en memoria sí cambie: `project.value.project_hosts = [...]`, `project.value.project_hosts[i].enabled = x`, `Object.assign(project.value, patch)`, `projectTask.enabled = value` (si `projectTask` es un elemento leído directamente de `project.value.project_tasks`, sin copia local). Ninguno de estos lanza error: el dato queda correctamente actualizado en el objeto JS, pero Vue no se entera porque el objeto al que apunta `.value` no está envuelto en un Proxy reactivo (solo el propio `.value` lo está).
- **Solo reasignar `.value` completo dispara reactividad**: `project.value = { ...project.value, project_hosts: nuevoArray }`. Este es el patrón que hay que usar siempre que se necesite ver el cambio reflejado inmediatamente sin recargar.
- **Alternativa más simple, pero más lenta**: `(view).vue` hace `provide('reloadProject', reload)` (el `reload` del propio loader). Cualquier tab/componente puede inyectarlo (`inject<(() => Promise<unknown>) | undefined>('reloadProject')`) y llamarlo (`await reloadProject?.()`) tras un `invoke` exitoso, en vez de razonar la reasignación manual. Correcto, pero dispara una consulta completa a la BD (con `isLoading` de por medio) en cada llamada — usar solo donde la frecuencia de uso es baja (ej. el submit del formulario completo en `ProjectTabInfo.vue`) o donde no hay una forma sencilla de construir el objeto actualizado en memoria. **Nunca** usarlo para acciones frecuentes/instantáneas (toggles, drag&drop) porque el usuario percibe el `isLoading` como si la pantalla "recargara" — ver el caso real documentado en `ProjectTabTasks.vue` más abajo, que se migró de `reloadProject()` a reasignación manual por este motivo.
- **Patrón preferido para tabs de relaciones (Hosts, Tasks):** reasignar `project.value` completo con spread en cada mutación, usando los datos que ya tenemos en memoria + lo que devuelve el propio `invoke` (o un `findProjectXById` de `useProjectQuery` para traer la fila recién creada con sus relaciones embebidas). Más código que llamar a `reloadProject()`, pero instantáneo y sin round-trip a BD.
- **Regla práctica:** después de cualquier `invoke` que cree/actualice/borre algo dentro de `project` (hosts, tasks, variables, campos propios), o (a) reasignar `project.value` completo con spread, o (b) llamar a `reloadProject()`. Nunca dejar solo una mutación anidada como única fuente de verdad para el render.

---

## 7. Loading Screen

La pantalla de carga se gestiona en `index.html`. Cuando Vue monta la aplicación, elimina el elemento splash — no hay un componente `Splashscreen` separado.

---

## 8. Formularios JSON-Schema (basado en `json-schema-library`)

Sistema de formularios que renderiza edición visual de documentos basados en un JSON Schema (p.ej. `compose.yaml` vía `ComposeEditor.vue`, `composer.json`). El núcleo gira alrededor de **jsl** (`json-schema-library` v11) y es **agnóstico**: no importa `compose-spec.json` ni `composer-schema.json`. `JsonSchemaEditor.vue` es el editor genérico de documento (raíz con layout de objeto genérico); `ComposeEditor.vue` y `ComposerEditor.vue` son wrappers finos que le pasan schema + i18n + iconos (los únicos que importan los JSON de esquema).

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
- `normalize.ts` → sistema de **normalizadores por schema**. `SchemaNormalizer = (schema: Record<string, any>, pointer: string) => Record<string, any> | undefined` (transforma **un solo nodo** y recibe su JSON pointer, raíz `#`; `undefined` = sin cambios; los normalizadores con menos parámetros siguen siendo válidos). `booleanStringNormalizer` convierte las uniones exactas `boolean | string` (cualquier orden) en `boolean` (en compose el `string` solo existe para que ciertos parsers no fallen al leer `true`/`false` como texto). `normalizeSchema(schema, ...normalizers)` clona y recorre todo el esquema (`properties`, `patternProperties`, `$defs`, `definitions`, `oneOf`/`anyOf`/`allOf`/`prefixItems`, `items`, `additionalProperties`, `not`, `contains`) aplicando los normalizadores en orden a cada nodo (el pointer se escapa: `~`→`~0`, `/`→`~1`); **sin normalizadores devuelve el schema sin recorrerlo**. Cada editor elige los suyos: `ComposeEditor.vue` → `normalizeSchema(composeSpec, booleanStringNormalizer, widgetsNormalizer(...))`; `ComposerEditor.vue` → `normalizeSchema(composerSpec)` (sin normalizadores: su `abandoned` es `boolean|string` con el `string` como valor real, no se normaliza). Añadir un normalizador nuevo = una función de nodo, sin tocar el walker.
- `WIDGET_KEY = 'x-widget'` y `widgetsNormalizer(map: Record<pointer, nombre>)` en `normalize.ts`: marcan un nodo para renderizarlo con un widget concreto (`{ ...schema, 'x-widget': nombre }` solo si su pointer está en el mapa). jsl **ignora las claves `x-*`** (`SchemaNode.addKeywords`), así que el marcado no genera warnings. El nombre se resuelve contra el mapa `widgets` del formulario (núcleo agnóstico; los wrappers aportan los componentes: Compose → `ComposeImagePicker` para `#/$defs/service/properties/image`).

### Composable y componentes

- `useSchemaForm(schema, options)` → `{ root, draft, formData, errors, validate, errorAt, get, set, remove, nodeAt(pointer), resolveTitle, resolveDescription, widgets }`. Los defaults iniciales salen de `root.getData()`. Opciones: `resolveTitle?`/`resolveDescription?`/`resolveMessage?`/`widgets?: Record<string, Component>` (mapa nombre de widget → componente para los nodos marcados con `x-widget`).
- `src/components/form/schema/*`:
  - `SchemaField.vue` — clasifica con `classifyNode` y despacha al componente adecuado; cualquier tipo nullable se rodea con `SchemaFieldNull`. Si el schema del nodo tiene `x-widget` (vía `WIDGET_KEY`) y `form.widgets[nombre]` existe, la rama escalar renderiza `<component :is="widget" v-model="model" />` en vez del input genérico. Los objetos delegan el cuerpo en `SchemaFieldObject` (la cabecera con label/help/remove/add queda aquí).
  - `SchemaFieldObject.vue` — render de los hijos de un objeto: **simples primero** (obligatorias delante de opcionales) y **contenedores** (`array`/`map`/`object`/uniones con variante contenedora) como **pestañas** (icono por kind + punto rojo/ámbar de error/warning). Cuando hay muchas simples opcionales (>10) se pliegan tras el botón "Mostrar campos": **inicialmente solo se ven las obligatorias** (en `service`, sin `required`, la sección simple queda plegada y lo primero visible son las pestañas: build, deploy, healthcheck…). Prop opcional `icon?: (name, node) => string | undefined`: resolver de icono por tab de contenedor; si no se provee usa `ICONS.schemaForm[kind]`. Así el núcleo sigue agnóstico y Compose conserva sus iconos (`ICONS.compose`).
  - `JsonSchemaEditor.vue` — editor genérico de documento (widget de diálogo): `defineModel<string|null>` (texto serializado en el formato elegido), `schema`, `title?`, `description?`, `formatOutput?: 'yaml' | 'json'` (default `'yaml'`; de él se infiere parseo `parseYaml`/`JSON.parse`, serialización `toYaml`/`JSON.stringify(data, null, 2)` y extensiones de import `.yaml,.yml`/`.json`), `importLabel?` (default `form.schema_form.import_file`), `resolveTitle?`/`resolveDescription?`/`resolveMessage?`, `icon?`, `widgets?: Record<string, Component>`. Internamente: `useSchemaForm` + `provideSchemaFormContext`, sync model↔formData (los mismos watchers con `lastModel`/`syncingFromModel`/`nextTick`), alerts de error/warning, import de archivo, preview y badge de draft. La raíz se renderiza con `<SchemaFieldObject :node="form.root" path="" :icon="icon" />` → layout genérico (simples inline, contenedores como pestañas), sin hardcodeo de claves (`name`/`version` no se tratan aparte).
  - `ComposeEditor.vue` / `ComposerEditor.vue` — wrappers finos sobre `JsonSchemaEditor`: solo pasan `schema` (normalizado con `normalizeSchema` + sus normalizers), title/description y resolvers (Compose: `formatOutput="yaml"` + `form.compose_schema.*` + `icon = ICONS.compose[name]` + label de import específico + `widgetsNormalizer({'#/$defs/service/properties/image': 'compose-image'})` + `widgets={'compose-image': ComposeImagePicker}` → el campo `image` de cada servicio usa el picker de Docker Hub en vez de un string plano; Composer: `formatOutput="json"`, sin resolvers). Crear un editor nuevo = wrapper de configuración, no una copia.
  - `SchemaFieldNull.vue` — `USwitch` para activar/desactivar el valor `null` (activar → `set(path, null)`; desactivar → `remove(path)`).
  - `SchemaFieldUnion.vue` — `USelect` de variantes (`oneOf`/`anyOf`/type-array) + editor de la variante activa. **oneOf es exclusivo**: solo se edita el formato elegido.
  - `SchemaFieldArray.vue` — lista de items; si los items resueltos (`classifyNode(resolveNode(items))`) son una unión (`items.oneOf`, `$ref`→unión o `type` array) → `USelect` de formato del array (**array uniforme: solo UN formato**, todos los items con la misma variante, no se mezclan); default del item vía `variantDefault`.
  - `SchemaFieldMap.vue` — entradas con clave editable; el nodo de valor es `patternProperties[0]` → `additionalProperties` → `any`.
  - `SchemaFieldAny.vue` — textarea JSON.
  - `context.ts` — `useSchemaFormContext()`/`provideSchemaFormContext()` para pasar el formulario a la profundidad.

### Gotchas del sistema

- **Defaults de `getData()`:** solo se incluyen propiedades `required` (con su `default` o el default del tipo: `0`, `""`, `false`…). Las propiedades opcionales con `default` **no** entran (así lo hace jsl).
- **i18n:** los mensajes de validación son claves `form.schema_form.errors.*` (nunca strings en español). Labels de variantes/títulos: `form.schema_form.*` y `form.compose_schema.*` (vía `resolveTitle`/`resolveDescription`).
- **No reinventar:** si un caso no se renderiza, resolver/compilar con las utilidades de `jsl.ts` antes de escribir un parser manual de `$ref`/`allOf`.
- **Testing:** `tests/{jsl,validate,schema-form,render,normalize}.test.ts` cubren clasificación, validación, defaults, render y normalizadores (incluido `widgetsNormalizer` + marcado `x-widget` sin warnings) sobre `compose-spec`/`composer-schema`.
