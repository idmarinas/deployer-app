# Guía de Frontend - DeployerApp

> Guía específica para tareas de **Vue / TypeScript**. Lee también [AGENTS.md](./AGENTS.md) para las reglas comunes.

---

## 1. Estructura del Frontend

```
src/
├── components/          <- Componentes reutilizables de UI
├── composables/         <- Lógica reactiva reutilizable de Vue
│   └── queries/         <- Composables de acceso a datos, organizados por dominio
├── constants/           <- Constantes globales
│   └── dbTables.ts      <- Nombres de tablas SQLite (DB_TABLES)
├── pages/               <- Vistas de la aplicación
└── utils/               <- Funciones puras sin reactividad de Vue
```

---

## 2. Convenciones de Desarrollo

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

## 3. Toolbar

El contenido de la toolbar se gestiona con el composable `useToolbarContent.ts`:

- `useToolbarContentCreate` — para vistas de creación.
- `useToolbarContentEdit` — para vistas de edición.
- Los botones extra usan el patrón `vnode: () => VNode` (factory) con posiciones nombradas (`ExtraButtonPosition`).

> **Importante:** `vnode` debe ser siempre una función factory `() => VNode`, nunca un VNode estático. Los VNodes estáticos congelan los valores reactivos en el momento de creación.

---

## 4. Tipos TypeScript generados

Los tipos del backend se generan automáticamente mediante `ts-rs` en `tauri-types.d.ts`. No editar ese archivo manualmente — se regenera con cada `cargo build`.

---

## 5. Internacionalización (i18n)

- Se usa `vue-i18n`.
- Los mensajes de error del backend llegan como claves i18n con parámetros `HashMap<String, String>`.
- El backend es agnóstico al idioma — nunca devuelve strings en español directamente.

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

## 7. Loading Screen

La pantalla de carga se gestiona en `index.html`. Cuando Vue monta la aplicación, elimina el elemento splash — no hay un componente `Splashscreen` separado.
