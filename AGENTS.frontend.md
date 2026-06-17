# Guía de Frontend - DeployerApp

> Guía específica para tareas de **Vue / TypeScript**. Lee también [AGENTS.md](./AGENTS.md) para las reglas comunes.

---

## 1. Estructura del Frontend

```
src/
├── assets/
│   └── css/
│       └── main.css     <- Fuentes + paleta + tokens semánticos + utilidades PCB
├── components/          <- Componentes reutilizables de UI
├── composables/         <- Lógica reactiva reutilizable de Vue
│   └── queries/         <- Composables de acceso a datos, organizados por dominio
├── constants/           <- Constantes globales
│   └── dbTables.ts      <- Nombres de tablas SQLite (DB_TABLES)
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

> **Clave:** al estar mapeado en `ui.colors`, Nuxt UI genera automáticamente las variantes claro/oscuro de cada color. **Por eso los archivos de tema NUNCA deben hardcodear hexadecimales** — siempre clases semánticas (`primary-500`, `neutral-300`...) o tokens `--ui-*`.

### Tokens semánticos Nuxt UI (`--ui-*`)

En `main.css` se declaran en `:root` (modo claro) y se sobreescriben en `.dark` (modo oscuro):
- `--ui-primary`, `--ui-secondary`, `--ui-success`, `--ui-info`, `--ui-warning`, `--ui-error`
- `--ui-bg`, `--ui-bg-elevated`, `--ui-bg-accented`, `--ui-bg-inverted`
- `--ui-border`, `--ui-border-accented`, `--ui-border-inverted`
- `--ui-text`, `--ui-text-dimmed`, `--ui-text-muted`, `--ui-text-toned`, `--ui-text-highlighted`, `--ui-text-inverted`
- `--ui-radius`

Uso en theme files vía sintaxis arbitraria de Tailwind: `bg-(--ui-bg-elevated)`, `text-(--ui-text-dimmed)`, `border-(--ui-border)`.

También existen variables propias del sistema PCB (`--pcb-trace`, `--pcb-trace-glow`, `--pcb-pad`, `--pcb-board`, `--pcb-silk`), con valores distintos en claro/oscuro, usadas por las utilidades de `main.css`.

### Tipografía

- **Inter** (texto general de la UI) — variable, libre, Google Fonts.
- **JetBrains Mono** (`font-pcb`) — para badges, labels técnicos, tooltips, valores numéricos, separadores con etiqueta. Da el aspecto de "etiqueta de componente electrónico".

Ambas se importan en `main.css` vía `@import url('https://fonts.googleapis.com/...')`. Si se necesita self-host (sin conexión a internet en build), descargar los `.woff2` de [Google Fonts](https://fonts.google.com/specimen/Inter) y [JetBrains Mono](https://www.jetbrains.com/lp/mono/) (ambas de uso libre) y servirlas localmente.

### Utilidades CSS reutilizables (definidas en `main.css`)

| Clase | Uso |
|---|---|
| `.pcb-clip-br` | Esquina inferior-derecha recortada — inputs, botones |
| `.pcb-clip-badge` / `.pcb-clip-badge-alt` | Esquinas opuestas recortadas — badges tipo chip SMD |
| `.pcb-clip-card` | Las 4 esquinas recortadas — cards, modals |
| `.pcb-clip-hex` | Hexágono achatado — indicadores de estado |
| `.pcb-trace-top` / `.pcb-trace-bottom` | Línea de traza energizada en borde sup/inf (requiere `relative`) |
| `.pcb-trace-left` | Indicador lateral tipo traza activa (alerts, toasts, nav activo) |
| `.pcb-corners` | Nodos circulares en las esquinas (requiere `relative`) — cards, modals |
| `.pcb-pad` | Pad de soldadura circular inline — separadores, indicadores |
| `.pcb-animate-pulse` | Pulso de energía en hover — botones solid |
| `.pcb-animate-flow` | Flujo de gradiente — barras de progreso |
| `.pcb-animate-blink` | Parpadeo tipo LED — badges de error/alerta |
| `.font-pcb` | Aplica JetBrains Mono |

**No duplicar estas utilidades dentro de archivos de tema individuales** — siempre reutilizar las de `main.css` para mantener consistencia y un único punto de mantenimiento.

### Registro de temas en vite.config.ts

**Todos** los componentes con tema personalizado deben registrarse en el objeto `ui` del plugin en `vite.config.ts`. Las claves son camelCase del nombre del componente Nuxt UI:

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
    switch: theme.switchTheme,   // ← alias porque "switch" es palabra reservada en JS
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

> **Nota:** `switch` es palabra reservada. El export de `theme/index.ts` lo aliasa como `switchTheme`, y en `vite.config.ts` se registra como `switch: theme.switchTheme`.

### Concepto visual por componente

| Componente | Tratamiento PCB |
|---|---|
| `button` | Esquina inf-derecha recortada, pulso de energía en hover (solid) |
| `badge` | Esquinas opuestas recortadas tipo chip SMD, fuente mono, mayúsculas |
| `input` / `textarea` / `select` | Esquina inf-izquierda recortada, traza activa (glow) en focus |
| `checkbox` | Pad de soldadura cuadrado, degradado de marca al marcar |
| `switch` | Track como pista de circuito, thumb como pad deslizante |
| `card` / `modal` | 4 esquinas recortadas + nodos en esquinas (`pcb-corners`), traza en header/footer |
| `tabs` | Indicador activo como puente conductor deslizante |
| `progress` | Pista con anillo sutil, relleno con flujo de energía animado |
| `separator` | Línea de traza con degradado, label en mono con pads |
| `tooltip` | Panel tipo "readout" técnico, fuente mono |
| `alert` / `toast` | Traza lateral izquierda energizada (`pcb-trace-left`) |
| `navigationMenu` | Item activo con traza lateral izquierda |
| `dashboardNavbar` / `dashboardSidebar` | Traza energizada en separación de header/footer |
| `table` | Cabecera sticky, nodo PCB en primera columna, filas iluminadas en hover |
| `dropdownMenu` / `contextMenu` | Panel readout, item resaltado con borde-traza izquierdo |

### Estructura de un archivo de tema

```ts
// theme/miComponente.ts
export default {
  slots: {
    root: 'clases-base ...',
    // ...demás slots del componente
  },
  compoundVariants: [
    { color: 'primary', variant: 'solid', class: { root: '...' } },
    // ...
  ],
}
```

- Usar siempre clases Tailwind semánticas (`primary-*`, `secondary-*`, `neutral-*`...) o tokens `bg-(--ui-*)` — nunca hexadecimales ni `neutral-950` hardcodeado (rompe el modo claro).
- Los efectos de glow se logran con `shadow-[0_0_Xpx_rgba(...)]`.
- Reutilizar las utilidades `.pcb-*` de `main.css` en lugar de redefinir clip-paths o pseudo-elementos en cada theme file.

---

## 3. Convenciones de Desarrollo

### Composables vs Utilidades

- **`/composables`**: Solo para lógica que usa reactividad de Vue (`ref`, `computed`, `onMounted`, etc.).
- **`/utils`**: Para funciones puras sin reactividad. Si una función no necesita Vue, va aquí.

### Composables de datos (`useQuery.ts`)

- `useQuery.ts` es un barrel file que re-exporta desde archivos de dominio en `src/composables/queries/`.
- Los métodos de escritura tienen dos variantes:
  - Variante segura: devuelve `null` en caso de error.
  - Variante `OrThrow`: lanza excepción — **siempre usada dentro de `transaction()`**.

### Acceso a la base de datos

- El acceso directo a SQLite (vía `tauri-plugin-sql`) solo es válido para tablas **sin campos cifrados**.
- Las tablas con campos sensibles (`hosts`, `passkeys`) deben usar los comandos Tauri CRUD.

### Constantes de tablas

Los nombres de tablas están centralizados en `src/constants/dbTables.ts`:

```ts
export const DB_TABLES = {
  DEPLOYER_SETTINGS: 'deployer_settings',
  // ...
} as const
```

Nunca escribir el nombre de una tabla como string literal fuera de este archivo.

---

## 4. Toolbar

El contenido de la toolbar se gestiona con el composable `useToolbarContent.ts`:

- `useToolbarContentCreate` — para vistas de creación.
- `useToolbarContentEdit` — para vistas de edición.
- Los botones extra usan el patrón `vnode: () => VNode` (factory) con posiciones nombradas (`ExtraButtonPosition`).

> **Importante:** `vnode` debe ser siempre una función factory `() => VNode`, nunca un VNode estático. Los VNodes estáticos congelan los valores reactivos en el momento de creación.

---

## 5. Tipos TypeScript generados

Los tipos del backend se generan automáticamente mediante `ts-rs` en `tauri-types.d.ts`. No editar ese archivo manualmente — se regenera con cada `cargo build`.

---

## 6. Internacionalización (i18n)

- Se usa `vue-i18n`.
- Los mensajes de error del backend llegan como claves i18n con parámetros `HashMap<String, String>`.
- El backend es agnóstico al idioma — nunca devuelve strings en español directamente.

---

## 7. Llamadas a comandos Tauri

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
channel.onmessage = (event) => {
  // Procesar evento según event.event:
  // deployment_started | task_pending | task_started |
  // output_chunk | task_retrying | task_finished |
  // task_skipped | deployment_finished | fatal_error
}

await invoke('run_deployment', {
  input: { deployment_id: 123 },
  channel
})
```

### Eventos del runner

| Evento | Campos clave |
|--------|-------------|
| `deployment_started` | `deployment_id`, `total_tasks` |
| `task_pending` | `execution_id`, `task_name`, `order` |
| `task_started` | `execution_id`, `task_name` |
| `output_chunk` | `execution_id`, `chunk` |
| `task_retrying` | `execution_id`, `attempt`, `max_attempts`, `delay_secs` |
| `task_finished` | `execution_id`, `task_name`, `status`, `exit_code`, `duration_seconds` |
| `task_skipped` | `execution_id`, `task_name`, `reason` |
| `deployment_finished` | `deployment_id`, `status`, `duration_seconds` |
| `fatal_error` | `message` |

---

## 8. Loading Screen

La pantalla de carga se gestiona en `index.html`. Cuando Vue monta la aplicación, elimina el elemento splash — no hay un componente `Splashscreen` separado.
