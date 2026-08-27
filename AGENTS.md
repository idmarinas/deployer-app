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
| Acceso a datos | Drizzle ORM (modo proxy) → comando `query_raw` |
| Gestor | Bun |
| TS | `~6.0.3` — strict, `noUnusedLocals`, `noUnusedParameters` |
| Vite | `^8.2.2` — puerto fijo **1420** (strictPort) |

## Propósito del Backend

- **Orquestación SSH/SFTP** para ejecución remota de despliegues (runner de Docker Compose remoto) y consola remota.
- **Cifrado/descifrado** transparente de campos sensibles (`hosts`, `passkeys`) a nivel de base de datos.
- **Generación de claves SSH**, **test de conexión** y **gestión de hosts/caché Docker Hub**.
- **Inicialización y gestión de la BD** (crear/abrir/validar archivo SQLite, ejecutar migraciones).
- El **acceso a datos (lecturas y escrituras)** lo hace el frontend con **Drizzle en modo proxy** (vía `query_raw`), que cifra/descifra/enmascara automáticamente los campos declarados como `encryptedText(...)` en `src/lib/schema-types.ts`. Los comandos Rust dedicados solo atienden lógica de backend que Drizzle no puede cubrir (SSH/SFTP, cripto de claves, caché de Docker Hub, gestión/inicialización de BD).

## Reglas

- **Idioma:** siempre español.
- **Ignorar y no modificar:** `node_modules/`, `vendor/`, `var/`, `dist/` (salida de build) y el **historial personal**: archivos `.back` y todo archivo/carpeta con extensión `.dist` (p.ej. `_archived.dist/`). No incluirlos en búsquedas ni lecturas salvo que se pidan explícitamente como referencia; nunca modificarlos.
- **Archivos autogenerados (no editar):** `drizzle/` (completo), `src/lib/schema.ts`, `src/lib/relations.ts`, `typed-locale.d.ts`, `auto-imports.d.ts`, `components.d.ts`, `src/route-map.d.ts`.
- **`drizzle/migrations/`** — no borrar; Drizzle Kit lo usa para calcular diffs entre esquemas.
- **`src-tauri/migrations/`** — archivos planos `.sql` generados por `drizzle:generate`; sqlx los embebe en el binario.
- **Antes de añadir dependencia**, verificar `package.json` y `src-tauri/Cargo.toml`.
- **Antes de crear un comando Rust nuevo:** comprobar si la lógica puede cubrirse con Drizzle (vía `query_raw`). Los comandos Rust dedicados solo deben existir para lógica de backend que Drizzle no puede atender (SSH/SFTP, cripto de claves, caché Docker Hub, gestión/inicialización de BD).
- **Migraciones SQL:** Drizzle Kit genera subdirectorios (`<timestamp>_<nombre>/migration.sql`) en `drizzle/migrations/` (no tocar). `sqlx::migrate!()` solo acepta archivos `.sql` planos en `src-tauri/migrations/`. `bun run drizzle:generate` hace `drizzle-kit generate` **y** aplana automáticamente el SQL a `src-tauri/migrations/` (equivalente a lo que antes se llamaba `drizzle:migrate`). sqlx extrae la versión del nombre del archivo (i64) y la descripción del resto.

## Acceso a datos (Drizzle vs comandos Rust)

| Situación | Solución |
| --- | --- |
| SELECT, sin descifrado | Drizzle (`src/lib/db.ts`) → `query_raw` con `mask_fields` |
| SELECT con descifrado explícito | Drizzle + `withDecryption(true, fn)` → `query_raw` con `decrypt_fields` |
| INSERT/UPDATE/DELETE | Drizzle (`src/lib/db.ts`) → `query_raw` con `is_write` + `encryptMask` |
| Lógica de backend (SSH/SFTP, cripto de claves, caché Docker Hub, gestión de BD) | Comando Rust dedicado |

`query_raw` acepta lectura y escritura; cifra/descifra/enmascara los campos que el frontend declara como cifrados. No hay comandos Rust `crud_*` por entidad.

## Comandos

```bash
bun run tauri:dev               # Dev server (Vite + Tauri, con @tauri scripts)
bun run tauri build             # Producción
bun run dev                     # i18n:types → vite
bun run build                   # vue-tsc --noEmit → vite build (NO ejecuta i18n:types)
bun run i18n:types             # Regenera typed-locale.d.ts
bun run drizzle:generate       # drizzle-kit generate + aplana a src-tauri/migrations/ (--name <nombre> opcional)
bun run drizzle:flatten        # Solo aplana las migraciones a src-tauri/migrations/ (para sqlx)
```

> Nota: no existen scripts `dev:db:generate` ni `drizzle:migrate`. `drizzle:generate` ya hace generate + flatten en un solo paso (por eso es el equivalente a lo que antes se llamaba `drizzle:migrate`).

## Gotchas

- **Pinia Colada** expone `data` como `shallowRef`. Mutar propiedades anidadas NO dispara reactividad. Solo reasignar `.value` completo.
- **`tauri_plugin_single_instance`** debe ser el primer plugin registrado en `lib.rs`.
- **Schema Drizzle:** se edita la migración SQL (`drizzle/migrations/`), luego `bun run drizzle:generate` (generate + flatten). Nunca editar los archivos `.ts` de schema a mano.
- **i18n:** backend devuelve claves i18n (nunca strings en español). Mensajes en `src/locales/es/`. Tipos autogenerados vía `bun run i18n:types`.
- **Drag & drop (Tauri):** Sortable.js requiere `forceFallback: true` (HTML5 nativo no funciona en webviews). Contenedores condicionales requieren `watchElement: true`.
- **Vite ignora `src-tauri/`** en el watch (configurado en `vite.config.ts`). Los cambios en Rust requieren rebuild explícito de Tauri.
- **Formularios JSON-Schema:** sistema basado en `json-schema-library` (jsl) en `src/utils/schema-form/*` + `src/components/form/schema/*` + `useSchemaToForm`. Núcleo **agnóstico** (solo `ComposeJsonSchema.vue` importa Compose). Detalles en `AGENTS.frontend.md` §8.

## Guías detalladas

- Backend (Rust/BD/cifrado/SSH/comandos): [`AGENTS.backend.md`](./AGENTS.backend.md)
- Frontend (Vue/temas/i18n/queries/componentes): [`AGENTS.frontend.md`](./AGENTS.frontend.md)
