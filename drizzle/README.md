# Carpeta drizzle/

Esta carpeta contiene únicamente artefactos para `drizzle-kit introspect`
(generación automática del schema TypeScript a partir de la BD SQLite).

**No se usa para gestionar migraciones.** Las migraciones reales de la app
viven en `src-tauri/migrations/` y se gestionan con `sqlx` desde Rust.

## Contenido

- `dev.sqlite` — BD de desarrollo dedicada, con las migraciones sqlx aplicadas.
  No se sube al repositorio (ver `.gitignore`).
- `schema.ts` — generado automáticamente por `drizzle-kit introspect`. Se
  copia a `src/lib/schema.ts` automáticamente (ver más abajo); ahí es donde
  el resto de la app lo importa.
- `relations.ts` — generado automáticamente por `drizzle-kit introspect` a
  partir de las foreign keys del schema SQLite. Habilita el Relational
  Queries API (`db.query.*.findFirst/findMany`). También se copia a
  `src/lib/relations.ts` automáticamente.

## Cómo regenerar el schema tras un cambio de esquema

Un único comando hace todo el proceso (recrea la BD de dev, aplica
migraciones, introspecciona, y copia los archivos a `src/lib/`):

```bash
bun run dev:db:generate
```

Internamente ejecuta, en este orden:

1. `dev:db:create` — recrea `drizzle/dev.sqlite` desde cero.
2. `dev:db:migrate` — aplica todas las migraciones de `src-tauri/migrations/` (vía `sqlx migrate run`).
3. `dev:db:introspect` — genera `drizzle/schema.ts` y `drizzle/relations.ts`.
4. `dev:db:copy-schema` — copia ambos archivos a `src/lib/` (ver `scripts/copy-drizzle-schema.ts`).

**No hace falta copiar nada a mano.** Si solo quieres repetir un paso
suelto (por ejemplo, volver a copiar sin regenerar todo), cada paso también
está disponible por separado: `bun run dev:db:introspect`,
`bun run dev:db:copy-schema`, etc.

**No editar a mano** `drizzle/schema.ts`, `drizzle/relations.ts`,
`src/lib/schema.ts` ni `src/lib/relations.ts` — los cuatro se sobreescriben
en cada `bun run dev:db:generate`. El script de copia post-procesa las
columnas booleanas (reemplaza `numeric()` por `integer({ mode: 'boolean' })`)
para que Drizzle infiera los tipos correctos.
