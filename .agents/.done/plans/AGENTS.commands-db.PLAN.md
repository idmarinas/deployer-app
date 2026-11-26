# Plan: Comandos guardados en BD (lista de comandos reutilizables)

**Estado: COMPLETADO** — el usuario da este plan por completado (10 nov 2026). Verificación final: filtro `enabled` aplicado en `runCommand()` y errores i18n (`utils.commands.errors.not_found` / `disabled`) en lugar del string en español hardcodeado; `bun run build` verde.

## Resumen

Evolucionar el sistema de nodos (fase 1, plan `AGENTS.universal-remote`) para que las definiciones de los comandos **vivan en la BD** en lugar de en archivos TypeScript hardcodeados. La BD pasa a ser la **fuente única** en runtime: los comandos se listan, crean, editan, deshabilitan y borran desde la app (UI de gestión), y `runCommand()` lee la definición desde `deployer_commands` antes de ejecutarla por SSH.

El mecanismo TS (tipos, parsers, runner) se mantiene: solo cambia **de dónde se obtiene la definición del comando** (DB → memoria).

> **Naming:** el concepto se llama **`commands`** (no `remote_commands` ni `nodes`). La tabla es `deployer_commands`, el const de Drizzle es `commands` y la carpeta de utils es `commands/`.

---

## Instrucciones dadas

> Me parece, que va a ser mejor, que los nodos esten en la BD, evitar que esa código de la APP, de esta forma se pueden personalizar de forma sencilla.
>
> Da por completado el plan de crear este sistema y crea otro nuevo, para adaptarlo a un sistema guardado y mantenido en BD.
>
> La idea, es que sean una lista de comandos que se pueden reutilizar.
>
> ¿Es correcto llamarlo nodes? — **No, `commands` encaja mejor.**
>
> Ya está creada la entidad, he cambiado el nombre de remote_commands a commands, son comandos que se pueden ejecutar en un servidor, el remote sobra. (no es necesario generar la migración).

---

## Decisiones

| Decisión | Elección | Razón |
| --- | --- | --- |
| Nombre del módulo | **`commands`** (sin `remote`) | El `remote` sobra: son comandos que se ejecutan en un servidor |
| Fuente de definiciones | Tabla `deployer_commands` (SQLite vía Drizzle proxy) | Lista reutilizable, editable sin tocar código ni recompilar |
| Entidad | `src/drizzle/entities/commands.ts` **ya creada** (const `commands`) | Creada por el usuario; no regenerar migración |
| Lectura en runtime | `runner.ts` consulta la BD (Drizzle) antes de ejecutar | La BD es la única fuente; no hay definiciones TS en runtime |
| Tipos de parser | Se reutilizan los de `types.ts` (`json`, `line-based`, `regex`, `raw`), serializados como JSON en columna `parser` | Sin duplicar lógica; el valor en BD es el `OutputParser` completo |
| `resultSchema` (zod) | **No se guarda en BD** | Zod no es serializable; el tipado de consumo se hace con el genérico en el caller (p.ej. `runCommand<SystemMetricsResult>`) |
| Identificador | Columna `key` (PK, TEXT), p.ej. `system-metrics` | Permite referencias estables desde el código (`(view).vue`) sin depender de un id numérico |
| Habilitar/deshabilitar | Columna `enabled` | Desactivar un comando sin borrarlo |
| Comandos Rust | **Ninguno nuevo** | Es CRUD + SELECT de una tabla con el patrón Drizzle proxy existente |
| Gestión | Nueva sección de UI (listado + add/edit + prueba) | "Personalizar de forma sencilla" y "lista reutilizable" |

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (TypeScript)                      │
│                                                              │
│  ┌───────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │  UI gestión    │   │  Runner      │   │  Parsers         │ │
│  │  (list/add/    │──▶│ runCommand() │──▶│  (json, line,    │ │
│  │  edit/test)    │   │  lee de BD   │   │   regex, raw)    │ │
│  └───────────────┘   └──────┬───────┘   └──────────────────┘ │
│                             │ Drizzle (query_raw)             │
│                             ▼                                │
│                   ┌───────────────────┐                      │
│                   │ deployer_commands │ ← fuente única       │
│                   │                   │   (CRUD del usuario) │
│                   └───────────────────┘                      │
└─────────────────────────┬────────────────────────────────────┘
                          │ invoke('ssh_execute_command')
                          ▼
┌──────────────────────────────────────────────────────────────┐
│          Backend (Rust) — sin cambios                        │
│  ssh_execute_command → ejecuta el comando en el servidor     │
└──────────────────────────────────────────────────────────────┘
```

---

## Estructura de la tabla (`deployer_commands`)

> Ya creada en `src/drizzle/entities/commands.ts`. No hay que generar migración todavía.

| Columna | Tipo Drizzle | Notas |
| --- | --- | --- |
| `key` | `text` NOT NULL (PK) | Identificador estable (p.ej. `system-metrics`); es la clave primaria |
| `name` | `text` UNIQUE NOT NULL | Nombre legible |
| `description` | `description` helper (`text JSON` `$type<JSONContent>`) | Patrón del proyecto (columna `description`) |
| `command` | `text` NOT NULL | Comando bash a ejecutar en el servidor |
| `parser` | `text JSON` `$type<OutputParser>()` NOT NULL DEFAULT `{"type":"raw"}` | Config del parser completa |
| `timeout` | `integer` NOT NULL DEFAULT `300` | Timeout en segundos (`null` = default de `ssh_execute_command`) |
| `enabled` | `enabled` helper (`integer boolean`) | Deshabilitado ⇒ no se puede ejecutar |
| `created_at` / `updated_at` / `deleted_at` | `timestamps` | Patrón del proyecto |

No hay campos cifrados: los comandos no son credenciales.

---

## Flujos

### Ejecutar un comando (`runner.ts`)

```
runCommand('system-metrics', hostId)
  → SELECT deployer_commands WHERE key = 'system-metrics' AND enabled = 1 AND deleted_at IS NULL
  → si no existe / deshabilitado → throw (clave i18n)
  → mapear fila → CommandDefinition { id: row.key, ... }
  → executeCommand (igual que ahora): Channel + ssh_execute_command → parseOutput
```

### Gestión en UI

- Listado: cards/table con nombre, `key`, tipo de parser, `enabled`, acciones (editar, probar, borrar).
- Add/Edit: formulario con `key`, `name`, `description`, `command` (textarea), parser (selector json/line-based/regex/raw + campos según tipo), `timeout`, `enabled`.
- Probar: modal con selector de host → `runCommand(cmd.key, hostId)` → muestra salida cruda + parseada.
- Borrar: soft-delete (`deleted_at`), deshabilitar sin borrar.

---

## Cambios necesarios

### Archivos a crear

| Archivo | Propósito |
| --- | --- |
| `src/loaders/commands.ts` | Loaders colada: `useCommandsListAll`, `useCommandByKey` |
| `src/composables/queries/commands.ts` | CRUD Drizzle con notifier (patrón `queries/hosts.ts`) |
| `src/pages/dashboard/commands.vue` | Layout del panel (patrón `hosts.vue`) |
| `src/pages/dashboard/commands/index.vue` | Listado de comandos |
| `src/pages/dashboard/commands/add.vue` | Alta de comando |
| `src/pages/dashboard/commands/[key]/edit.vue` | Edición de comando |
| `src/components/commands/CommandForm.vue` | Formulario compartido add/edit |
| `src/components/commands/CommandTestDialog.vue` | Diálogo "probar en un host" |

### Archivos a modificar

| Archivo | Cambio |
| --- | --- |
| `src/drizzle/entities/commands.ts` | **Ya creada** (const `commands`) — sin cambios |
| `src/utils/remote-nodes/` → `src/utils/commands/` | Renombrar carpeta: `types.ts`, `parsers.ts`, `runner.ts`, `registry.ts`, `nodes/` |
| `src/utils/commands/runner.ts` | `runNode` → `runCommand`: consulta BD, valida `enabled`, ejecuta |
| `src/utils/commands/registry.ts` | Eliminado o simplificado (DB reemplaza el registro estático) |
| `src/utils/commands/nodes/*.ts` | Definiciones que pasan a la BD (consolidadas como filas de `deployer_commands`) |
| `src/drizzle/schema.ts` | Añadir `export { commands } from './entities/commands'` |
| `src/composables/useNavigationMenu.ts` | Añadir la entrada al menú / búsqueda (si procede) |
| `src/locales/es/…` y espejo `en` | i18n del módulo (sección nuevo + notificaciones) |
| `src/pages/dashboard/hosts/[id]/(view).vue` | Cambiar import de `runNode` → `runCommand` y el `key` del comando |

### Migración SQL

- **La genera el usuario** cuando todo esté completo: `bun run drizzle:generate --name commands` (crea la tabla) y `bun run tables:generate` (regenera `tables.rs` con `TABLE_COMMANDS`). No es tarea del plan.

---

## Fases de implementación

| # | Fase | Contenido |
| --- | --- | --- |
| 1 | Entidad | **Hecha** — `entities/commands.ts` (const `commands`, tabla `deployer_commands`). Pendiente: export en `schema.ts` |
| 2 | Runner desde BD | Renombrar `remote-nodes/` → `commands/`, `runCommand` lee de `deployer_commands`; `(view).vue` compila y funciona |
| 3 | CRUD + loaders | `queries/commands.ts`, `loaders/commands.ts` |
| 4 | UI de gestión | panel, listado, add/edit, formulario, diálogo de prueba |
| 5 | i18n + menú + verificación | claves es/en, navegación, `bun run build` |

> Orden recomendado de ejecución: 1 → 2 → 3 → 4 → 5. La fase 2 verifica que `(view).vue` (único consumidor actual) siga funcionando con la BD como fuente. La **migración SQL** final (`drizzle:generate` + `tables:generate`) la ejecuta el usuario cuando todo esté completo.

---

## Notas importantes

- **Fuente única en BD**: en runtime no debe quedar ninguna definición hardcodeada activa en `commands/nodes/*.ts`; las definiciones se consolidan como filas de `deployer_commands`.
- **Zod no entra en la BD**: `output` se tipa con el genérico al consumir (`runCommand<SystemMetricsResult>`). Si más adelante se quiere validación, se extiende `parser` sin cambiar la tabla.
- **Paridad de claves**: al añadir claves en `src/locales/es/` crear espejo en `en/` (regla AGENTS.frontend §5).
- **Menú/búsqueda**: si se añade al arranque del menú, respetar `useNavigationMenu.ts` (computed, traducción en runtime).
- **Soft-delete**: respetar `deleted_at` en los SELECT de loaders/queries (patrón del proyecto).
- **No añadir dependencias**: `SortableJS`, `zod`, `yaml` ya están; sin dependencias nuevas.