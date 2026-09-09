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

- **Orquestación SSH/SFTP** para consola remota, test de conexión, check de sistema/métricas y actualizaciones de hosts.
- **Cifrado/descifrado** transparente de campos sensibles (`hosts.password`, `passkeys.key_content`/`passphrase`) con claves AES gestionadas en el **vault de Stronghold** (`src/drizzle/lib/stronghold.ts` + Web Crypto; Rust abre el vault solo para leer y descifrar credenciales SSH).
- **Generación de claves SSH**, **test de conexión** y **gestión de hosts**.
- **Inicialización y gestión de la BD** (crear/abrir/validar archivo SQLite, ejecutar migraciones).
- El **acceso a datos (lecturas y escrituras)** lo hace el frontend con **Drizzle en modo proxy** (vía `query_raw`), que cifra/descifra/enmascara los campos declarados como `encryptedText(...)` en `src/drizzle/lib/schema-types.ts` usando las claves del vault (`src/drizzle/lib/stronghold.ts`); `query_raw` solo ejecuta SQL. Los comandos Rust dedicados solo atienden lógica de backend que Drizzle no puede cubrir (SSH/SFTP, cripto de claves, vault Stronghold, gestión/inicialización de BD).

## Reglas

- **Idioma:** siempre español.
- **Ignorar y no modificar:** `node_modules/`, `vendor/`, `var/`, `dist/` (salida de build) y el **historial personal**: archivos `.back` y todo archivo/carpeta con extensión `.dist` (p.ej. `_archived.dist/`). No incluirlos en búsquedas ni lecturas salvo que se pidan explícitamente como referencia; nunca modificarlos.
- **Archivos autogenerados (no editar):** `drizzle/` (completo), `src/drizzle/schema.ts`, `src/drizzle/relations.ts`, `typed-locale.d.ts`, `auto-imports.d.ts`, `components.d.ts`, `src/route-map.d.ts`, `src-tauri/src/tables.rs`.
- **`drizzle/migrations/`** — no borrar; Drizzle Kit lo usa para calcular diffs entre esquemas.
- **`src-tauri/migrations/`** — archivos planos `.sql` generados por `drizzle:generate`; sqlx los embebe en el binario.
- **Antes de añadir dependencia**, verificar `package.json` y `src-tauri/Cargo.toml`.
- **Antes de crear un comando Rust nuevo:** comprobar si la lógica puede cubrirse con Drizzle (vía `query_raw`). Los comandos Rust dedicados solo deben existir para lógica de backend que Drizzle no puede atender (SSH/SFTP, cripto de claves, vault Stronghold, gestión/inicialización de BD).
- **Migraciones SQL:** Drizzle Kit genera subdirectorios (`<timestamp>_<nombre>/migration.sql`) en `drizzle/migrations/` (no tocar). `sqlx::migrate!()` solo acepta archivos `.sql` planos en `src-tauri/migrations/`. `bun run drizzle:generate` hace `drizzle-kit generate` **y** aplana automáticamente el SQL a `src-tauri/migrations/` (equivalente a lo que antes se llamaba `drizzle:migrate`). sqlx extrae la versión del nombre del archivo (i64) y la descripción del resto.

## Acceso a datos (Drizzle vs comandos Rust)

| Situación | Solución |
| --- | --- |
| SELECT, sin descifrado | Drizzle (`src/drizzle/drizzle.ts`) — el proxy enmascara los valores `ENC:` → `BLANK_VALUE` |
| SELECT con descifrado explícito | Drizzle + `withDecryption(true, fn)` — el proxy descifra con las claves del vault |
| INSERT/UPDATE/DELETE | Drizzle (`src/drizzle/drizzle.ts`) — el proxy cifra los campos `encryptedText(...)` |
| Lógica de backend (SSH/SFTP, cripto de claves, vault Stronghold, gestión de BD) | Comando Rust dedicado |

`query_raw` (Rust) solo ejecuta el SQL generado por el proxy y devuelve `columns` + `rows`: ni cifra ni enmascara (eso lo hace el frontend con `src/drizzle/lib/stronghold.ts`). No hay comandos Rust `crud_*` por entidad.

## Comandos

```bash
bun run tauri:dev               # Dev server (Vite + Tauri, con @tauri scripts)
bun run tauri build             # Producción
bun run dev                     # i18n:types → vite
bun run build                   # vue-tsc --noEmit → vite build (NO ejecuta i18n:types)
bun run i18n:types             # Regenera typed-locale.d.ts
bun run drizzle:generate       # drizzle-kit generate + aplana a src-tauri/migrations/ (--name <nombre> opcional)
bun run drizzle:flatten        # Solo aplana las migraciones a src-tauri/migrations/ (para sqlx)
bun run tables:generate        # Regenera src-tauri/src/tables.rs (constantes de nombres de tablas)
```

> Nota: no existen scripts `dev:db:generate` ni `drizzle:migrate`. `drizzle:generate` ya hace generate + flatten en un solo paso (por eso es el equivalente a lo que antes se llamaba `drizzle:migrate`).

## Gotchas

- **Pinia Colada** expone `data` como `shallowRef`. Mutar propiedades anidadas NO dispara reactividad. Solo reasignar `.value` completo.
- **`tauri_plugin_single_instance`** debe ser el primer plugin registrado en `lib.rs`.
- **Schema Drizzle:** se edita la migración SQL (`drizzle/migrations/`), luego `bun run drizzle:generate` (generate + flatten). Nunca editar los archivos `.ts` de schema a mano.
- **i18n:** backend devuelve claves i18n (nunca strings en español). Mensajes en `src/locales/es/`. Tipos autogenerados vía `bun run i18n:types`.
- **Drag & drop (Tauri):** Sortable.js requiere `forceFallback: true` (HTML5 nativo no funciona en webviews). Contenedores condicionales requieren `watchElement: true`.
- **Vite ignora `src-tauri/`** en el watch (configurado en `vite.config.ts`). Los cambios en Rust requieren rebuild explícito de Tauri.
- **Vault Stronghold:** el frontend es el **único escritor** del vault (plugin `tauri_plugin_stronghold`); Rust lo abre solo para **leer** (`StrongholdVault::open`) y nunca debe escribir claves desde Rust. Claves versionadas `encrypt:{tabla}.{col}:{version}`; valor en BD `ENC:{version}:<base64>`. Detalles en `AGENTS.backend.md` §4.
- **Formularios JSON-Schema:** sistema basado en `json-schema-library` (jsl) en `src/utils/schema-form/*` + `src/components/form/schema/*` + `useSchemaToForm`. Núcleo **agnóstico** (`JsonSchemaEditor.vue`, `SchemaField*`); los wrappers `ComposeJsonSchema.vue`/`ComposerJsonSchema.vue` quedaron retirados (importaban los JSON de `@/schemas/`, eliminados del proyecto). Detalles en `AGENTS.frontend.md` §8.

## Guías detalladas

- Backend (Rust/BD/cifrado/SSH/comandos): [`AGENTS.backend.md`](./AGENTS.backend.md)
- Frontend (Vue/temas/i18n/queries/componentes): [`AGENTS.frontend.md`](./AGENTS.frontend.md)
