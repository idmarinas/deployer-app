# Plan — Normalizadores globales de JSON-Schema (por schema)

> Tarea del usuario (13 ago 2026): separar `normalizeBooleanString` en un sistema de normalizadores global para los JSON Schema, agregando normalizers según lo necesite cada schema.
> Estado: **COMPLETADA**.
> Este archivo hace de historial y registra todos los cambios hechos.

## 1. Problema

`normalizeBooleanString(schema)` es un único normalizador acoplado a compose: recorre el esquema y convierte `boolean|string` → `boolean`. No es extensible: si un schema necesita otro ajuste (o no necesita este), no hay forma de elegir normalizadores por schema. De hecho composer **no** debería usarlo: `abandoned` es `["boolean","string"]` donde el `string` es un valor semántico real (nombre/URL del paquete alternativo recomendado), así que normalizarlo a `boolean` perdería información.

## 2. Objetivo

- Un normalizador = transformación de **un solo nodo** (devuelve un nodo nuevo o `undefined` si no cambia nada).
- Un walker global (`normalizeSchema`) aplica la lista de normalizadores en orden a cada nodo del esquema y recursiona por las claves estándar (`properties`, `patternProperties`, `$defs`, `definitions`, `oneOf`/`anyOf`/`allOf`/`prefixItems`, `items`, `additionalProperties`, `not`, `contains`).
- Cada editor elige sus normalizadores: `ComposeEditor.vue` → `booleanStringNormalizer`; `ComposerEditor.vue` → ninguno (su `abandoned` conserva la unión). Añadir un normalizador nuevo = una función de nodo, sin tocar el walker.

## 3. API

```ts
type SchemaNormalizer = (schema: Record<string, any>) => Record<string, any> | undefined

function booleanStringNormalizer(schema): Record<string, any> | undefined
// boolean|string exacto (cualquier orden) → { ...schema, type: 'boolean' }; si no aplica, undefined.

function normalizeSchema(schema: JsonSchema, ...normalizers: SchemaNormalizer[]): JsonSchema
// Sin normalizadores devuelve el mismo schema (sin recorrerlo).
// Con normalizadores: clona y recorre; cada nodo pasa por los normalizadores en orden.
```

## 4. Archivos

- `src/utils/schema-form/normalize.ts` — reescrito (walker + `SchemaNormalizer` + `booleanStringNormalizer` + `normalizeSchema`). Se elimina `normalizeBooleanString`.
- `src/components/form/schema/ComposeEditor.vue` — `normalizeSchema(composeSpec, booleanStringNormalizer)`.
- `src/components/form/schema/ComposerEditor.vue` — `normalizeSchema(composerSpec)` (sin normalizadores).
- `tests/normalize.test.ts` — nueva API + composer `abandoned` conserva la unión.
- Docs: `AGENTS.frontend.md` §8, `AGENTS.todo.done.md`.

## 5. Verificación

- `bun test`, `bunx vue-tsc --noEmit`, `bun run build`.

## 6. Reglas

- Idioma español. Utilidad agnóstica (no importa compose/composer).
- Sin dependencias nuevas ni migraciones.
