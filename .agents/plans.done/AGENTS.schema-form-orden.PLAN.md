# Plan — Un poco de orden en el formulario JSON-Schema

> Tarea de `AGENTS.todo.md`: _Un poco de orden_.
> Estado: **COMPLETADA** (13 ago 2026). Ver `## 7. Registro de progreso`.
> Este archivo hace de historial y registra todos los cambios hechos.

## 1. Objetivo

Organizar el render de **objetos con muchas propiedades** en el sistema de formularios JSON-Schema (`src/components/form/schema/*`). El ejemplo de partida es `service` (la entrada de `services` en un compose), que tiene **93 propiedades** y hoy se muestra como una rejilla de 2 columnas con un colapsable "Mostrar campos".

Requisitos literales de `AGENTS.todo.md`:

1. Hay secciones inmensas (propiedades con propiedades). Poner orden.
2. Partir del ejemplo de `services`:
   1. Tiene muchas propiedades dentro → **inicialmente solo se muestran las obligatorias**.
   2. Orden: **las propiedades simples siempre primero** y luego las de tipo **array|object en forma de pestañas** (igual que `include`, `services`, `networks` en la raíz).

## 2. Diagnóstico (verificado)

- `service` (`$defs.service`) tiene 93 propiedades, **ninguna obligatoria** (`required: undefined`). Clasificación actual:
  - Simples (string/number/integer/boolean/enum, incluidas uniones de simples como `boolean|string` en `attach`, `init`, `privileged`…): ~50.
  - Contenedores (array, object, map y uniones con variante contenedor como `build` string|object, `depends_on`): ~40.
- `SchemaField.vue` (líneas 184-208) renderiza los hijos de un objeto en una rejilla `md:grid-cols-2`, plegando todo si `children.length > 10` (`OBJECT_COLLAPSE_THRESHOLD`) con `UCollapsible` + botón `show_fields`.
- El patrón de pestañas ya existe en `ComposeEditor.vue` (raíz: `include`/`services`/`networks`… con botones + punto de error/warning) y en `SchemaFieldMap.vue` (entradas de un mapa de objetos). Se reutiliza el primero para las pestañas anidadas.
- `SchemaField.vue` ya dispone de helpers para las pestañas: `resolveTitle`, error/warning por ruta (`form.errorAt`/`warningAt`), `pretty()`, y el despacho de errores. Las pestañas anidadas necesitan el mismo patrón de punto rojo/ámbar.

## 3. Decisiones

- **Clasificación simple vs contenedor** (nueva utilidad `isContainerNode(node)` en `src/utils/schema-form/jsl.ts`):
  - **Simple**: `string | number | integer | boolean | enum | null`, y uniones cuyas variantes son todas simples (p.ej. `boolean|string` → simple).
  - **Contenedor**: `array | object | map | any`, y uniones con **alguna** variante contenedor (p.ej. `build` `['string','object']` → contenedor → pestaña).
- **Orden dentro de un objeto**: (1) simples **obligatorias** primero, (2) simples opcionales, (3) contenedores como **pestañas**. Las opcionales simples se plegarán tras "Mostrar campos" solo cuando sean muchas (mismo umbral de 10). Para `service` (0 obligatorias, ~50 opcionales) la sección simple queda plegada y lo primero visible son las pestañas.
- **Nuevo componente `SchemaFieldObject.vue`**: encapsula la parte de "hijos de un objeto" (rejilla simple + colapsable opcional + pestañas de contenedores). `SchemaField.vue` conserva la cabecera (label/help/remove/add) y delega el cuerpo en este componente. El núcleo sigue agnóstico (sin imports de compose).
- **Iconos por kind** para las pestañas anidadas: se añade un grupo `ICONS.schemaForm` en `src/utils/icons.ts` (object/map/array/union/any) — no hardcodear `i-tabler-*` en componentes (regla §4b de `AGENTS.frontend.md`).
- **Etiquetas de pestaña**: `resolveTitle(path, schema)` → `title` → `pretty(name)` (igual que hoy en cabeceras).

## 4. Implementación

### 4.1 `src/utils/schema-form/jsl.ts` — `isContainerNode`

```ts
export function isContainerNode(node: SchemaNode): boolean {
	const cls = classifyNode(resolveNode(node))
	if (cls.kind === 'union' && cls.variants && cls.variants.length > 0) {
		return cls.variants.some((v) => isContainerNode(v))
	}
	return cls.kind === 'array' || cls.kind === 'map' || cls.kind === 'object' || cls.kind === 'any'
}
```

### 4.2 `src/components/form/schema/SchemaFieldObject.vue` (NUEVO)

Props: `{ node: SchemaNode; path: string }`. Render:

1. Hijos (`node.properties` + `node.required`) separados en `simpleChildren` / `containerChildren` vía `isContainerNode`.
2. Simples: rejilla con **obligatorias primero** (siempre visibles) y **opcionales después**, estas en `UCollapsible` (botón `show_fields`) si `opcional.length > 10`, si no, rejilla directa.
3. Contenedores: botones-pestaña (icono kind + label + punto rojo/ámbar de error/warning, prioridad al error) + contenido de la pestaña activa (`<SchemaField :node :path :required />`). `active` se resetea al cambiar el conjunto de pestañas.

### 4.3 `src/components/form/schema/SchemaField.vue`

Sustituir el bloque `cls.kind === 'object'` (rejilla + UCollapsible) por `<SchemaFieldObject :node="node" :path="path" />`. Eliminar `OBJECT_COLLAPSE_THRESHOLD`, `children`, `childPath` (pasan a `SchemaFieldObject`).

### 4.4 `src/utils/icons.ts`

Nuevo grupo:

```ts
schemaForm: {
	object: 'i-tabler-box',
	map: 'i-tabler-map',
	array: 'i-tabler-list',
	union: 'i-tabler-toggle-left',
	any: 'i-tabler-code',
},
```

### 4.5 Tests — `tests/jsl.test.ts`

Bloque `isContainerNode` sobre `service` real de `compose-spec.json` (build → true, devices → true, healthcheck → true, environment → true; attach → false, image → false).

## 5. Verificación

- `bun test` (todos verdes).
- `bun run i18n:types` (no hay claves nuevas, pero se regenera el schema de tipos).
- `bunx vue-tsc --noEmit` (strict) y, si hace falta, `bun run build`.
- Comprobación manual con el compose de ejemplo (servicio con muchos campos: la sección simple plegada y contenedores como pestañas).

## 6. Reglas / restricciones

- Idioma: español.
- No tocar autogenerados (`drizzle/`, `src/lib/schema.ts`, `typed-locale.d.ts`, `auto-imports.d.ts`, `components.d.ts`, `src/route-map.d.ts`).
- Sin migraciones SQL ni dependencias nuevas.
- Núcleo agnóstico: `SchemaFieldObject.vue` no importa `compose-spec.json` ni `composer-schema.json`.
- Al terminar: mover la tarea a `AGENTS.todo.done.md` y dejar vacía la sección de tareas (regla 2 de `AGENTS.todo.md`); actualizar `AGENTS.frontend.md` §8 y `AGENTS.md` si procede.

## 7. Registro de progreso

### Implementación (13 ago 2026) — COMPLETADA

- `jsl.ts`: nueva `isContainerNode(node)`.
- `icons.ts`: grupo `ICONS.schemaForm`.
- Nuevo `SchemaFieldObject.vue`: simples primero (obligatorias delante de opcionales; opcionales plegadas tras "Mostrar campos" si >10) + contenedores como pestañas con icono por kind y punto de error/warning.
- `SchemaField.vue`: delega objetos en `SchemaFieldObject`; eliminados `OBJECT_COLLAPSE_THRESHOLD`/`children`/`childPath`.
- `tests/jsl.test.ts`: bloque `isContainerNode` (79/79 verdes). Nota verificada: `root.getNode('/services', {})` reduce a `properties["missing-key"]` (propiedad sintética de jsl para el patrón del mapa); la entrada real se obtiene con `resolveNode(properties['missing-key'])` → 93 propiedades.
- Verificación: `bun test` 79/79 OK, `bun run i18n:types` OK, `bunx vue-tsc --noEmit` limpio, `bun run build` verde.
- Docs: `AGENTS.frontend.md` §8 actualizado; tarea movida a `AGENTS.todo.done.md` (referencia este plan); `AGENTS.todo.md` con la sección de tareas vacía.
