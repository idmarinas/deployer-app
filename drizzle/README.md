# Carpeta drizzle/

Esta carpeta contiene únicamente artefactos para `drizzle-kit introspect`
(generación automática del schema TypeScript a partir de la BD SQLite).

**No se usa para gestionar migraciones.** Las migraciones reales de la app
viven en `src-tauri/migrations/` y se gestionan con `sqlx` desde Rust.

## Contenido

- `dev.sqlite` — BD de desarrollo dedicada, con las migraciones sqlx aplicadas.
  No se sube al repositorio (ver `.gitignore`).
- `schema.ts` — generado automáticamente por `drizzle-kit introspect`. Sí se
  sube al repositorio; es la fuente de tipos para el query builder de Drizzle
  en el frontend (`src/lib/db.ts`).

## Cómo regenerar el schema tras un cambio de esquema

1. Asegúrate de tener `drizzle/dev.sqlite` con las migraciones sqlx más
   recientes aplicadas. Si no existe, créalo desde cero:

   ```bash
   bun run dev:db:generate
   ```

2. Revisa el `schema.ts` generado en esta carpeta, cópialo o ajústalo en
   `src/lib/schema.ts` si es necesario, y haz commit de ambos cambios
   (la migración sqlx y el schema Drizzle).
