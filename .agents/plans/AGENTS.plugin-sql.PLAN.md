# Plan: Sustituir `query_raw` por `tauri-plugin-sql`

## Estado

**Planificando** — aún se está ajustando el plan; no se puede ejecutar.

---

## Instrucciones dadas (verbatim)

> "Pregunta, es totalmente necesaria el query_raw, pudiendo usar el plugin de tauri-sql?"
>
> "Ok, pues entonces hay que limpiar el comando de lo que NO se usa."
>
> "Crea un plan de implementación siguiendo las instrucciones de agents.todo.md para sustituir el comando query_raw por el plugin tauri-sql. Crea el plan con todos los problemas que encuentras para sustituirlo."

Contexto aportado por el agente (análisis previo):
- `query_raw` solo lo usa el frontend (proxy Drizzle en `src/lib/db.ts`).
- La mayoría de comandos Rust (SSH, sync, compose, cache docker, migraciones, validación) usan el pool sqlx directamente y **seguirían necesitándolo** aunque se quite `query_raw`.
- La BD es dinámica (se elige/valida en tiempo de ejecución; ruta en el store `app_config.json`), lo que choca con el modelo fijo de `tauri-plugin-sql`.

---

## Objetivo

Sustituir el comando Rust `query_raw` por el plugin oficial `tauri-plugin-sql` (`@tauri-apps/plugin-sql` en JS), de modo que el proxy de Drizzle deje de pasar por un comando Tauri propio para ejecutar SQL y lo haga directamente a través del plugin. El objetivo final es eliminar el comando `query_raw` de `query_raw.rs` y de `lib.rs`.

**Nota / alcance real:** el plugin SQL **solo sustituye la vía "frontend → BD"**. Los comandos de backend Rust (`open_pool`, `configured_sqlite_options`) que hacen SSH/sync/compose/cache docker/migraciones/validación **no se tocan** y siguen usando sqlx. Este plan **no elimina sqlx ni `open_pool`**; solo elimina el comando Tauri `query_raw` y adapta el proxy Drizzle para usar el plugin.

---

## Contexto técnico actual

### Cómo funciona hoy

1. El frontend (`src/lib/db.ts`) crea un proxy de Drizzle SQLite (`drizzle(...)` con `sqlite-proxy`).
2. El callback del proxy: detecta campos cifrados del schema → cifra/enmascara con Stronghold (Web Crypto) → `invoke('query_raw', { sql, params })`.
3. `query_raw` (Rust): `open_pool(app)` → `bind_params` → `fetch_all` → devuelve `{ columns, rows }`.
4. El proxy post-procesa `rows` (descifrar/enmascarar) usando `columns` para resolver índices (y el campo condicional), y devuelve `{ rows }` a Drizzle.

### Dependencias del formato `{ columns, rows }`

- El proxy necesita **los nombres de columna en orden** para mapear posición→columna al descifrar/enmascarar campos cifrados en un SELECT arbitrario (`SELECT *`, JOINs, proyecciones parciales).
- El plugin SQL (`db.select`) devuelve **array de objetos** `[{ col: value }]` (las claves del objeto son los nombres de columna en orden). El proxy Drizzle espera `{ rows: [ [v0, v1, ...] ] }` (arrays posicionales). **Hay que adaptar la conversión.**

---

## Problemas encontrados para la sustitución

Estos son los bloqueos y riesgos que he identificado investigando el código y el plugin:

### P1 — Placeholders de SQLite incompatibles (`?` vs `$1`)
- `query_raw` usa `sqlx::query(sql)` con `.bind(...)`; **sqlx SQLite acepta `?`** (y también `$n`).
- El plugin `tauri-plugin-sql` usa sqlx por debajo, **pero para SQLite requiere la sintaxis `$1, $2, ...`** (no `?`): "sqlite and postgres use the `$#` syntax when substituting query data".
- **Drizzle (`sqlite-proxy`) genera SQL con `?`** por defecto. Por tanto, el SQL que hoy pasa por `query_raw` con `?` **fallaría** en el plugin.
- Posibles soluciones:
  - **a)** Convertir `?` → `$n` en el proxy antes de llamar al plugin (frágil: hay que respetar `?` dentro de literales/apóstrofos/comentarios, y `??` de SQLite para LIKE/Escape).
  - **b)** Configurar el pool/`SqliteConnectOptions` no cambia el dialecto de bindings del plugin (el binding `$n` es del plugin, no configurable desde SQLite).
  - **c)** Reemplazar el generador de placeholders de Drizzle (no trivial).
  - **→ Riesgo ALTO.** Es el problema principal a resolver/validar con un spike antes de decidir.

### P2 — Formato de retorno y el `method` de Drizzle
- Hoy el comando devuelve `{ columns, rows }` y el proxy devuelve a Drizzle `{ rows: rows[0] ?? [] }` (para `get`) u `{ rows }` (para `all`/`run`/`values`).
- Con el plugin:
  - `db.select(sql)` devuelve `T[]` (array de objetos). Hay que convertirlo a arrays posicionales (usando `Object.keys` de la primera fila como orden de columnas) y devolver `{ rows }`. Los **`values`/`get`/`all`** de Drizzle necesitan su forma concreta.
  - `db.execute(sql)` devuelve `{ rowsAffected, lastInsertId }`, no filas. Drizzle `run` necesita saber filas afectadas/lastInsertId; y las operaciones con `RETURNING` (que necesita filas) **no las cubre `execute`** — hay que decidir si se siguen usando `RETURNING` (vía `select`) o se cambia el enfoque (p. ej. INSERT sin RETURNING + `lastInsertId`).
- **→ Riesgo MEDIO-ALTO** por el retrabajo del proxy y la semántica de escrituras con `RETURNING`.

### P3 — BD dinámica en tiempo de ejecución
- La app **no tiene una BD fija**: permite crear/abrir/validar un archivo `.sqlite` elegido en tiempo de ejecución, cuya ruta se persiste en el store (`app_config.json`, key `database_path`) y se obtiene con `get_database_path_internal`.
- `query_raw` resuelve la ruta en cada llamada (`open_pool`). El plugin SQL se diseña con BD conectada vía `Database.load('sqlite:...')` (la ruta es **relativa a `BaseDirectory::App`** o absoluta).
- Solución viable: `Database.load()` **en runtime** con la ruta absoluta del store (una vez resuelta), y mantener la instancia. Pero hay que:
  - Gestionar el ciclo de vida (abrir al iniciar la BD, cerrar al cambiar de BD / salir).
  - Coordinar la **misma** ruta entre el store (frontend decide) y el plugin.
  - No duplicar lógica con los comandos de inicialización (`create_database_file`, `validate_database_sqlite`, `execute_migrations`, `initialize_database`) que usan `open_pool`.
- **→ Riesgo MEDIO** de duplicación y de desync entre la BD del plugin y la del backend Rust.

### P4 — Migraciones: dos sistemas en conflicto
- El proyecto usa `sqlx::migrate!()` en Rust sobre las migraciones planas en `src-tauri/migrations/`.
- El plugin SQL ejecuta **sus propias migraciones** (de `src-tauri/migrations` también, si se configuran) al `load()`.
- Si se mantiene `execute_migrations` (Rust) y además el plugin corre migraciones al conectarse, se podrían **duplicar aplicaciones**. Hay que elegir **una sola vía**:
  - Opción A: las migraciones las sigue ejecutando Rust (`execute_migrations`), y el plugin se conecta **sin** `preload`/migraciones (desactivar su sistema).
  - Opción B: el plugin ejecuta las migraciones y se elimina la parte Rust — pero eso rompería/duplicaría con los demás comandos Rust que asumen el esquema ya migrado.
- **→ Riesgo MEDIO.** Recomendación inicial: **Opción A** (el plugin solo ejecuta; las migraciones las gestiona Rust), porque el backend Rust depende del esquema ya migrado.

### P5 — Doble vía de acceso a la BD (plugin + open_pool)
- Si el frontend usa el plugin y el backend Rust sigue usando `open_pool`, **hay dos pools al mismo archivo**.
- Con SQLite esto es viable (múltiples conexiones a un archivo), pero:
  - Hay que asegurar `PRAGMA foreign_keys` en ambas (el plugin y `open_pool` aplican `.foreign_keys(true)`).
  - Posibles **bloqueos/locks** si ambos escriben (SQLite `SQLITE_BUSY`); el plugin tiene su propio pool con su timeout.
  - Los **auto-increment** y transacciones hay que comprobarlos.
- **→ Riesgo MEDIO** de locks y de inconsistencias si no se comparte tino de escritura.

### P6 — Permisos / capabilities
- Hay que añadir el permiso del plugin a `src-tauri/capabilities/default.json`:
  - `sql:default` (incluye `allow-close`, `allow-load`, `allow-select`) + `sql:allow-execute` para escrituras.
- **→ Riesgo BAJO** (solo configuración), pero obligatorio o falla todo.

### P7 — No elimina el pool Rust ni simplifica el backend
- El beneficio principal de quitar `query_raw` es quitar un comando Tauri propio y unificar el acceso de lectura/escritura SQL del frontend bajo el plugin oficial.
- **Contra**: se añade una **segunda** tecnología de acceso (plugin) sobre el sqlx ya existente; el backend no se simplifica (open_pool sigue); la complejidad neta puede ser mayor. Además hay que mantener el cifrado/descifrado de Stronghold en el proxy (no cambia con el plugin).
- **→ Decisión de producto**: si el objetivo es "quitar sqlx del frontend", el plugin lo logra; si el objetivo es "simplificar", **no se simplifica** (solo se cambia la fachada de `query_raw` por el plugin manteniendo igual el cifrado y doblando el acceso).

### P8 — `columns` que ya no vendría como antes
- Hoy `query_raw` devuelve `columns` y `rows` por separado, y el proxy los usa. Con el plugin, las columnas se infieren de `Object.keys` de las filas devueltas (presentes en cada objeto). Hay que **reescribir** `decryptRow`/`maskEncryptedFields` para operar sobre objetos (o convertir a arrays posicionales usando las claves).
- **→ Riesgo MEDIO** (retrabajo del proxy, ya detectado en P2).

---

## Estructura del plan (fases)

> El plan NO se ejecuta hasta que quede **Planificando → Pendiente** (lo decide el usuario).
> Orden sugerido: primero un **spike (Fase 0)** para despejar P1 (placeholders) y P2 (formato), que son los que pueden invalidar el enfoque.

### Fase 0 — Spike / validación de viabilidad (bloqueantes)
1. Crear una app de prueba mínima (o usar un ejemplo) que:
   - Registre `tauri-plugin-sql` con `sql:default` + `sql:allow-execute`.
   - `Database.load('sqlite:<ruta>.db')`.
   - Ejecute `db.select('SELECT * FROM deployer_hosts WHERE name = $1', ['x'])` y `db.execute('INSERT ... VALUES ($1, $2)', [...])`.
2. **Verificar P1**: convertir un SQL real de Drizzle (con `?`) a `$n` y comprobar si el plugin lo acepta; decidir la estrategia de conversión de placeholders.
3. **Verificar P2**: forma de `select`/`execute` y cómo adaptar `{ rows }` para el proxy de Drizzle (arrays posicionales + orden de columnas).
4. **Resultado** de la Fase 0: documento de decisión (viable / no viable) y diseño de conversión de placeholders. **Si no es viable, se detiene el plan** (Pendiente/Bloqueado) y se documenta por qué.

### Fase 1 — Añadir dependencias y configurar el plugin
1. Añadir `tauri-plugin-sql = "2"` (features `sqlite`) en `src-tauri/Cargo.toml`.
2. Añadir `@tauri-apps/plugin-sql: "~2"` en `package.json`; `bun install`.
3. Registrar el plugin en `src-tauri/src/lib.rs` (antes o después del store; verificar orden con `generate_handler`).
4. Añadir permisos en `src-tauri/capabilities/default.json`: `sql:default`, `sql:allow-execute`.

### Fase 2 — Módulo de conexión (BD dinámica)
1. Crear helper JS de gestión de instancia del plugin SQL (singleton): `loadDatabase(path)` que resuelva la ruta dinámica del store y haga `Database.load(...)`, con cache y `close()` al cambiar de BD.
2. Decidir/implementar qué pasa al **crear/validar/cambiar** la BD (los comandos Rust de inicialización siguen encargándose; el plugin se (re)carga al cambiar de ruta).
3. Gestionar `PRAGMA foreign_keys=ON` tras conectar (si el plugin no lo aplica por defecto).

### Fase 3 — Adaptar el proxy Drizzle (`src/lib/db.ts`)
1. Sustituir `invoke('query_raw', ...)` por `db.select(...)` / `db.execute(...)` del plugin.
2. **Conversión de placeholders** `?` → `$n` (según decisión de la Fase 0). Mantener el strip de sentinel/cifrado y el descifrado/enmascaramiento de Stronghold intactos (no dependen del medio de ejecución).
3. Adaptar el retorno:
   - SELECT: convertir objetos → arrays posicionales usando las claves de la primera fila como orden, y devolver `{ rows }`.
   - `get`/`all`/`values`: según el `method` de Drizzle.
   - `run` y operaciones con `RETURNING`: decidir entre `execute` (rowsAffected/lastInsertId) o `select` para RETURNING.
4. Mantener `{ columns, rows }` interno (derivado de `Object.keys`) para `decryptRow`/`maskEncryptedFields`.

### Fase 4 — Eliminar el comando `query_raw`
1. Borrar el comando `query_raw` de `src-tauri/src/commands/database/query_raw.rs`.
2. Eliminar su registro del `generate_handler!` en `lib.rs`.
3. Limpiar `bind_params` / `rows_to_values` / `row_column_names` / `decode_column_value` de `commands/database/helpers.rs` **solo si** dejan de usarse en el resto del crate (verificar que ningún otro comando los use).
4. Eliminar dependencias de `open_pool` **solo de `query_raw`** (el resto de comandos los mantienen).
5. Revisar i18n: quitar/ignorar claves `query_raw_*` de `src/locales/es/tauri.ts` si ya no se emiten.

### Fase 5 — Verificación
1. `cargo check` (y `cargo check --release`) sin errores ni warnings.
2. `vue-tsc --noEmit` sin errores nuevos (los 14 pre-existentes de TreeFiles/compose/files siguen siendo no relacionados).
3. Verificación funcional E2E con `bun run tauri:dev`:
   - Crear/abrir/validar BD dinámica.
   - Migraciones aplicadas (una sola vez, decidir vía P4).
   - CRUD de hosts con `password` cifrada → verificar `ENC:` en SQLite.
   - Listado descifrado / enmascarado correcto (columnas bien mapeadas).
   - SSH conectando (backend Rust sige descifrando con Stronghold) — comprobar que ambos acceden a la misma BD.
   - Rotación + scan/re-encrypt del panel de Seguridad.
4. Actualizar `AGENTS.md`/`AGENTS.frontend.md`/`AGENTS.backend.md` según los cambios reales.

---

## Archivos afectados (referencia)

| Archivo | Cambio previsto |
|---|---|
| `src-tauri/Cargo.toml` | Añadir `tauri-plugin-sql` (feature `sqlite`) |
| `src-tauri/src/lib.rs` | Registrar plugin SQL; eliminar `query_raw` del handler |
| `src-tauri/src/commands/database/query_raw.rs` | Eliminar comando |
| `src-tauri/src/commands/database/helpers.rs` | Posible limpieza si dejan de usarse |
| `src-tauri/capabilities/default.json` | Añadir `sql:default`, `sql:allow-execute` |
| `package.json` | Añadir `@tauri-apps/plugin-sql` |
| `src/lib/db.ts` | Usar plugin SQL; conversión de placeholders; adaptar retorno |
| `src/lib/stronghold-crypto.ts` | (sin cambios esperados) |
| `src/locales/es/tauri.ts` | Limpiar claves `query_raw_*` si procede |

---

## Riesgos / decisiones pendientes

1. **Placeholders `?` vs `$1` (P1)** — bloqueante; resuelto en Fase 0.
2. **`RETURNING` en escrituras (P2)** — decidir si sigue usándose (vía `select`) o se sustituye por `lastInsertId`/Drizzle sin RETURNING.
3. **Migraciones (P4)** — una sola vía (recomendado: Rust ejecuta migraciones; plugin solo ejecuta).
4. **Doble pool (P5)** — aceptar y verificar locks; o considerar que el plugin podía **compartir** la ruta solo para lecturas/escrituras del frontend.
5. **BD dinámica (P3)** — gestión del ciclo de vida del `Database` del plugin frente a crear/cambiar BD.
6. **Valor neto (P7)** — evaluar si el cambio simplifica o solo cambia de fachada, dado que el backend Rust y el cifrado Stronghold se mantienen.
