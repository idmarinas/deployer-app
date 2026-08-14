# Plan — Campos `boolean | string` en el formulario JSON-Schema

> Tarea de `AGENTS.todo.md`: _Ajustes a ciertos campos_.
> Estado: **COMPLETADA** (13 ago 2026). Ver `## 7. Registro de progreso`.
> Este archivo hace de historial y registra todos los cambios hechos.

## 1. Objetivo

Los campos declarados como `boolean | string` en `compose-spec.json` **solo admiten un valor booleano**; el `string` existe únicamente para que ciertos parsers no fallen al interpretar `true`/`false` como string. Por tanto, en el formulario deben renderizarse **solo como booleano** (`USwitch`), nunca como una unión con variante de texto.

El usuario irá confirmando más casos más adelante; esta primera ronda cubre el caso exacto `boolean|string` (2 tipos).

## 2. Diagnóstico (verificado)

Búsqueda en `compose-spec.json` de `type` con `boolean` y `string`:

- **25 campos `["boolean","string"]` / `["string","boolean"]`** (caso a tratar). Ejemplos: `attach`, `init`, `oom_kill_disable`, `privileged`, `read_only`, `stdin_open`, `tty` (service); `build.no_cache/provenance/sbom/pull/privileged`; `healthcheck.disable`; `network.internal/enable_ipv4/enable_ipv6/attachable`; `depends_on.<svc>.restart`; `volumes.*.read_only`, `create_host_path`, `nocopy`; `service_hook.privileged`; `pre_start_hook.privileged/per_replica`; `env_file.*.required`.
- **7 campos con 3+ tipos (NO tocar en esta ronda)**: `external` de `network`/`volume`/`secret`/`config` (`["boolean","string","object"]`), `provider.options.*` (`["string","number","boolean"]`) y `list_or_dict` (`["string","number","boolean","null"]`). El usuario los confirmará aparte.
- Hoy `classifyNode` clasifica `["boolean","string"]` como **unión** → `SchemaFieldUnion` con `URadioGroup` (texto/sí-no) y el default de `getData()` es `""` (string, la variante preferida). Comportamiento incorrecto.
- `ComposeEditor.vue` es el único consumidor de `compose-spec.json` en `src/` (tests aparte).

## 3. Decisiones

- **Normalizar el esquema**, no tocar el núcleo de render: una utilidad genérica `normalizeBooleanString(schema)` (en `src/utils/schema-form/`, **agnóstica**, no importa compose) recorre el JSON Schema y convierte `type: ['boolean','string']` (cualquier orden, exactamente 2 tipos) en `type: 'boolean'`. `ComposeEditor.vue` la aplica al compilar.
- Con el esquema ya normalizado, jsl hace el resto de forma coherente: **render** (`classifyNode` → `boolean` → `USwitch`), **defaults** (`getData()` → `false` en vez de `""`) y **validación** (un string como `"true"` deja de ser válido — correcto, el valor semántico es booleano).
- No se toca `classifyNode` ni el núcleo: los esquemas genéricos con `boolean|string` semántico siguen siendo uniones. La utilidad es reutilizable para futuros casos confirmados por el usuario.
- Recursión completa: `properties`, `patternProperties`, `$defs`, `definitions`, `oneOf`/`anyOf`/`allOf`, `items` (schema o array), `prefixItems`, `additionalProperties` (object), `not`, `contains`.
- Sin claves i18n nuevas, sin migraciones, sin dependencias.

## 4. Implementación

### 4.1 `src/utils/schema-form/normalize.ts` (NUEVO)

```ts
import type { JsonSchema } from 'json-schema-library'

function normalize(node: JsonSchema): JsonSchema {
	if (Array.isArray(node)) return node.map(normalize)
	if (!node || typeof node !== 'object') return node

	const out: JsonSchema = { ...node }
	if (Array.isArray(out.type) && out.type.length === 2 && out.type.includes('boolean') && out.type.includes('string')) {
		out.type = 'boolean'
	}
	// recursión: properties/patternProperties/$defs/definitions (mapas),
	// oneOf/anyOf/allOf/prefixItems (arrays), items/additionalProperties/not/contains (esquemas)
	return out
}

export function normalizeBooleanString(schema: JsonSchema): JsonSchema {
	return normalize(schema)
}
```

### 4.2 `src/components/form/schema/ComposeEditor.vue`

```ts
import { normalizeBooleanString } from '@/utils/schema-form/normalize'
const composeJson: JsonSchema = normalizeBooleanString(composeSpec as JsonSchema)
```

### 4.3 Tests — `tests/normalize.test.ts` (NUEVO)

- `['boolean','string']` y `['string','boolean']` → `'boolean'`; `type: 'string'` intacto.
- Uniones de 3+ tipos NO se tocan (`['boolean','string','object']`, `['string','number','boolean']`).
- Recursión en `properties`, `oneOf`, `$defs`, `items`.
- Con `compose-spec.json` real: `attach`/`privileged`/`read_only` → kind `boolean` (no unión); `healthcheck.properties.disable` → `'boolean'`; `external` de `network` → sigue unión (`['boolean','string','object']`).

## 5. Verificación

- `bun test` (todos verdes).
- `bun run i18n:types` (no debería cambiar nada, pero se regenera).
- `bunx vue-tsc --noEmit` y `bun run build`.

## 6. Reglas / restricciones

- Idioma: español.
- No tocar autogenerados ni `node_modules/`.
- Núcleo agnóstico: `normalize.ts` no importa `compose-spec.json`/`composer-schema.json`.
- Al terminar: mover la tarea a `AGENTS.todo.done.md` (sección de tareas vacía) y actualizar `AGENTS.frontend.md` §8.

## 7. Registro de progreso

### Implementación (13 ago 2026) — COMPLETADA

- `src/utils/schema-form/normalize.ts` (nuevo): `normalizeBooleanString`.
- `ComposeEditor.vue`: compila el esquema normalizado.
- `tests/normalize.test.ts` (nuevo): 25 campos `boolean|string` → boolean; 3+ tipos conservados.
- Verificación: `bun test` OK, `bun run i18n:types` OK, `bunx vue-tsc --noEmit` limpio, `bun run build` verde.
- Docs: `AGENTS.frontend.md` §8 actualizado; tarea movida a `AGENTS.todo.done.md` (referencia este plan).
