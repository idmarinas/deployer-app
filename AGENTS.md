# DeployerApp — Guía para Agentes

Esta guía contiene las reglas comunes del proyecto. Para detalles específicos, lee:

- Backend (Rust/Tauri): [`AGENTS.backend.md`](./AGENTS.backend.md)
- Frontend (Vue/TypeScript): [`AGENTS.frontend.md`](./AGENTS.frontend.md)
- Documentación (`docs/content/`): [`AGENTS.docs.md`](./AGENTS.docs.md)

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Vue 3 + TypeScript + Nuxt UI v4 (librería, no meta-framework) |
| Enrutamiento | `src/pages/` → unplugin-vue-router (genera `src/route-map.d.ts`) |
| Estilos | Tailwind CSS v4 |
| Estado servidor | `@pinia/colada` (no es un store de Pinia) |
| Backend | Rust + Tauri 2 |
| Plugins de Tauri | `dialog`, `fs`, `opener`, `positioner`, `store`, `stronghold`, `window-state` (JS y Rust); `single-instance` (Rust) |
| Base de datos | SQLite vía sqlx; migraciones en `src-tauri/migrations/` |
| Acceso a datos | Drizzle ORM en modo proxy → comando `query_raw` |
| Gestor | Bun |
| Vite | Puerto fijo 1420 (`strictPort`) |

## Principio: frontend primero

Tauri ejecuta el código de la interfaz en un webview. Ese entorno tiene limitaciones que determinan qué va en Rust:

- **No abre conexiones TCP**, así que SSH y SFTP solo son posibles desde Rust.
- **No accede a SQLite directamente**. Todas las lecturas y escrituras pasan por Drizzle y `query_raw`.
- **El sistema de archivos, los diálogos, el store y Stronghold** solo funcionan a través de plugins, y sus permisos se controlan en `src-tauri/capabilities/default.json`.
- **El keychain del SO** solo es accesible desde Rust (crate `keyring`).

Antes de implementar una funcionalidad nueva, comprueba en este orden:

1. **Plugin oficial o de la comunidad de Tauri.** Busca en el catálogo de plugins de Tauri (https://v2.tauri.app/plugin/) si alguno ya cubre la funcionalidad. Si existe, no la reimplementes. Antes de usarlo, verifica que sea compatible con Tauri 2, que esté mantenido y qué permisos exige en `capabilities/default.json`. Si descartas un plugin existente, anota el motivo en la sección del plan o diseño correspondiente.
2. **Plugin de Tauri usable desde JavaScript** que ya esté instalado. Mira la tabla de Stack y los permisos de `capabilities/default.json`.
3. **Drizzle vía `query_raw`** para cualquier operación de base de datos.
4. **Comando Rust nuevo.** Solo si lo anterior no sirve, por ejemplo para SSH/SFTP, cripto de claves o gestión de la BD.

## Reglas globales

- **Idioma:** español.
- **Ignorar y no modificar:** `node_modules/`, `vendor/`, `var/`, `dist/`, archivos `.back` y cualquier archivo o carpeta con extensión `.dist`. No incluirlos en búsquedas ni lecturas salvo petición explícita.
- **Archivos autogenerados (no editar a mano):** `migrations/` (completo), `src/drizzle/schema.ts`, `src/drizzle/relations.ts`, `typed-locale.d.ts`, `auto-imports.d.ts`, `components.d.ts`, `src/route-map.d.ts`, `src/types/tauri-types.d.ts`, `src-tauri/src/tables.rs`.
- **Esquema de BD:** la fuente son las entidades de `src/drizzle/entities/`. Tras editarlas, ejecuta `bun run drizzle:generate`, que genera las migraciones y las aplana en `src-tauri/migrations/`. No borres `migrations/`: Drizzle Kit la usa para calcular diffs.
- **Dependencias nuevas:** antes de añadir una, revisa `package.json` y `src-tauri/Cargo.toml`.
- **Componentes de página:** van en `src/components/pages/<pagina>/`, con la misma estructura que `src/pages/`. Detalles en `AGENTS.frontend.md`.

## Comandos

```bash
bun run tauri:dev            # Dev server (Vite + Tauri)
bun run tauri build          # Producción
bun run dev                  # i18n:types → vite
bun run build                # vue-tsc --noEmit → vite build (no ejecuta i18n:types)
bun run i18n:types           # Regenera typed-locale.d.ts
bun run drizzle:generate     # drizzle-kit generate + aplanado a src-tauri/migrations/ (--name <nombre> opcional)
bun run drizzle:flatten      # Solo aplana las migraciones para sqlx
bun run tables:generate      # Regenera src-tauri/src/tables.rs
```

No existen `dev:db:generate` ni `drizzle:migrate`. `drizzle:generate` hace generate y flatten en un solo paso.

## Flujo de planes

> Particularidades del proyecto para la skill `plan-workflow`.

- **Idioma:** español.
- **Guías a leer antes de empezar:** `AGENTS.md`, `AGENTS.backend.md`, `AGENTS.frontend.md`, `AGENTS.docs.md`.
- **Verificación (la ejecuta el usuario, salvo petición expresa):** `bun run i18n:types`, `bunx vue-tsc --noEmit`, `bun run build`; `cargo check` si se toca Rust. `bun test` no es criterio de aceptación mientras la suite siga sin repararse.
- **Reglas del proyecto en planes:** migraciones según "Reglas globales"; ignorar `.back` y `.dist`.
- **Documentación a actualizar si cambia algo:** `AGENTS*.md` y `docs/content/`.
- **Plugins de Tauri:** antes de diseñar o planificar una funcionalidad nueva, buscar en el catálogo oficial si existe un plugin que la cubra (ver "Principio: frontend primero", punto 1).
