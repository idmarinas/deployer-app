# DeployerApp — Guía para Agentes

## Stack (verificado)

| Capa | Tecnología |
| ------ | ----------- |
| Frontend | Vue 3 + TS + Nuxt UI v4 (librería, no meta-framework) |
| Enrutamiento | `src/pages/` → unplugin-vue-router (genera `src/route-map.d.ts`) |
| Estilos | Tailwind CSS v4 |
| Estado servidor | `@pinia/colada` — **no** Pinia store |
| Backend | Rust + Tauri 2 |
| BD | SQLite via sqlx; migraciones en `src-tauri/migrations/` |
| Lecturas ad-hoc | Drizzle ORM (modo proxy) → comando `query_raw` |
| Gestor | Bun |
| TS | `~6.0.3` — strict, `noUnusedLocals`, `noUnusedParameters` |
| Vite | `^8.1.3` — puerto fijo **1420** (strictPort) |

## Propósito del Backend

- **Escrituras** (INSERT/UPDATE/DELETE) y operaciones transaccionales.
- **Cifrado/descifrado** transparente de campos sensibles (`hosts`, `passkeys`).
- **Orquestación SSH/SFTP** para ejecución remota de despliegues.
- **Generación de claves SSH** y **test de conexión**.
- **Lecturas SELECT** solo cuando hay cifrado que descifrar o lógica de backend que Drizzle no puede atender; para el resto de SELECTs, el frontend usa Drizzle (vía `query_raw`), que ofrece tipado estático y flexibilidad sin necesidad de comandos Rust dedicados.

## Reglas

- **Idioma:** siempre español.
- **Ignorar y no modificar:** `node_modules/`, `vendor/`, `var/`, `dist/` (salida de build) y el **historial personal**: archivos `.back` y todo archivo/carpeta con extensión `.dist` (p.ej. `_archived.dist/`). No incluirlos en búsquedas ni lecturas salvo que se pidan explícitamente como referencia; nunca modificarlos.
- **Archivos autogenerados (no editar):** `drizzle/` (completo, excepto `README.md`), `src/lib/schema.ts`, `typed-locale.d.ts`, `auto-imports.d.ts`, `components.d.ts`, `src/route-map.d.ts`.
- **`drizzle/migrations/`** — no borrar; Drizzle Kit lo usa para calcular diffs entre esquemas.
- **`src-tauri/migrations/`** — archivos planos `.sql` generados por `drizzle:flatten`; sqlx los embebe en el binario.
- **`src/constants/dbTables.ts`** está obsoleto (`.unused`). No importarlo.
- **Antes de añadir dependencia**, verificar `package.json` y `src-tauri/Cargo.toml`.
- **Antes de crear comando `crud_get_*`/`crud_list_*`:** si la tabla no tiene campos cifrados, usar Drizzle.
- **Migraciones SQL:** Drizzle Kit genera subdirectorios (`<timestamp>_<nombre>/migration.sql`) en `drizzle/migrations/` (no tocar). `sqlx::migrate!()` solo acepta archivos `.sql` planos en `src-tauri/migrations/`. Tras `drizzle-kit generate`, ejecutar `bun run drizzle:flatten` para copiar el SQL a un archivo plano. sqlx extrae la versión del nombre del archivo (i64) y la descripción del resto.

## Lecturas Drizzle vs comandos Rust

| Situación | Solución |
| --- | --- |
| SELECT, sin cifrados | Drizzle (`src/lib/db.ts`) |
| SELECT con cifrados a descifrar | Comando Rust (usa `open_crypto_context`) |
| INSERT/UPDATE/DELETE | Comando Rust CRUD |

`query_raw` solo acepta `SELECT`; nunca escribe ni descifra.

## Comandos

```bash
bun run tauri dev              # Dev server (Vite + Tauri)
bun run tauri build            # Producción
bun run dev                    # i18n:types → vite
bun run build                  # i18n:types → vue-tsc --noEmit → vite build
bun run i18n:types             # Regenera typed-locale.d.ts
bun run dev:db:generate        # Regenera schema Drizzle (create → migrate → introspect → copy)
bun run drizzle:generate       # Genera migración en drizzle/migrations/ (--name <nombre> opcional)
bun run drizzle:flatten        # Aplana migraciones a src-tauri/migrations/ (para sqlx)
bun run drizzle:migrate        # generate + flatten (--name <nombre> opcional)
```

## Gotchas

- **Pinia Colada** expone `data` como `shallowRef`. Mutar propiedades anidadas NO dispara reactividad. Solo reasignar `.value` completo.
- **`tauri_plugin_single_instance`** debe ser el primer plugin registrado en `lib.rs`.
- **Schema Drizzle:** se edita la migración SQL (`drizzle/migrations/`), luego `bun run drizzle:flatten`. Nunca editar los archivos `.ts` de schema a mano.
- **i18n:** backend devuelve claves i18n (nunca strings en español). Mensajes en `src/locales/es/`. Tipos autogenerados vía `bun run i18n:types`.
- **Drag & drop (Tauri):** Sortable.js requiere `forceFallback: true` (HTML5 nativo no funciona en webviews). Contenedores condicionales requieren `watchElement: true`.
- **Vite ignora `src-tauri/`** en el watch (configurado en `vite.config.ts`). Los cambios en Rust requieren rebuild explícito de Tauri.
- **Formularios JSON-Schema:** sistema basado en `json-schema-library` (jsl) en `src/utils/schema-form/*` + `src/components/form/schema/*` + `useSchemaToForm`. Núcleo **agnóstico** (solo `ComposeEditor.vue` importa Compose). Detalles en `AGENTS.frontend.md` §8.

## Guías detalladas

- Backend (Rust/BD/cifrado/CRUD/runner/SSH): [`AGENTS.backend.md`](./AGENTS.backend.md)
- Frontend (Vue/temas/i18n/queries/componentes): [`AGENTS.frontend.md`](./AGENTS.frontend.md)
