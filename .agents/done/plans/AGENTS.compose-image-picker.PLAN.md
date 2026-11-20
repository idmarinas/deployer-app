# Plan — Widgets por normalizer: `ComposeImagePicker` para `service.image`

> Tarea del usuario (13 ago 2026): poner un normalizer para que, cuando detecte un `service.image`, use el selector `ComposeImagePicker` y no un string corriente.
> Estado: **COMPLETADA**.
> Este archivo hace de historial y registra todos los cambios hechos.

## 1. Problema

El campo `image` de cada servicio de compose se renderiza como un `UInput` de texto plano. Ya existe `ComposeImagePicker.vue` (selector de Docker Hub con búsqueda de imagen, versión y variante) que solo se usa en `ComposeServiceFields.vue`. Hay que hacer que el editor de schema use ese widget para `service.image`, sin acoplar el núcleo agnóstico del formulario a un componente de compose.

## 2. Solución

El sistema de normalizadores ya permite transformar nodos del schema por editor. Se extiende con un marcado de widgets:

1. El walker de `normalizeSchema` pasa ahora el **JSON pointer** (raíz `#`, escapado `~`→`~0`, `/`→`~1`) a cada normalizador.
2. `widgetsNormalizer(map)` marca un nodo con `x-widget: <nombre>` si su pointer está en el mapa.
3. jsl **ignora las claves `x-*`** en `SchemaNode.addKeywords` (`!key.startsWith("x-")`), así que el marcado no genera `unknown-keyword-warning`: no hay que tocar `compileRoot` ni registrar keywords.
4. El formulario lleva un mapa `widgets` (nombre → componente), agnóstico; `SchemaField` renderiza `<component :is="widget" v-model="model" />` cuando el nodo está marcado.
5. `ComposeEditor.vue` es el único sitio compose-específico: marca `#/$defs/service/properties/image` → `compose-image` y pasa `{'compose-image': ComposeImagePicker}` como widgets.

El marcado sobrevive a la resolución de `$ref`: el nodo `image` bajo `$defs.service` se compila con su schema (que incluye `x-widget`), y `services.<x>.image` llega a ese nodo vía `resolveNode`.

## 3. API

```ts
type SchemaNormalizer = (schema: Record<string, any>, pointer: string) => Record<string, any> | undefined

const WIDGET_KEY = 'x-widget'
function widgetsNormalizer(map: Record<pointer, nombre>): SchemaNormalizer
// devuelve { ...schema, 'x-widget': nombre } solo si pointer está en el mapa; si no, undefined.
```

`SchemaFormOptions.widgets?: Record<string, Component>` → expuesto en `SchemaFormInstance.widgets`.

## 4. Archivos

- `src/utils/schema-form/normalize.ts` — `SchemaNormalizer` con pointer; walker con seguimiento de pointer (escapando `~`/`/`); `WIDGET_KEY`; `widgetsNormalizer`.
- `src/composables/useSchemaToForm.ts` — opción + instancia `widgets`.
- `src/components/form/schema/JsonSchemaEditor.vue` — prop `widgets` → `useSchemaToForm`.
- `src/components/form/schema/SchemaField.vue` — `widget` computed desde `schema[WIDGET_KEY]` + `form.widgets[nombre]`; `<component :is="widget" v-model="model" />` antes del `UInput` de string.
- `src/components/form/schema/ComposeEditor.vue` — `widgetsNormalizer({'#/$defs/service/properties/image': 'compose-image'})` y `:widgets="{ 'compose-image': ComposeImagePicker }"`.
- `tests/normalize.test.ts` — tests de `widgetsNormalizer` (pointer coincidente/no, escapado, E2E compose con el marcado sobreviviendo a `$ref`, y `x-widget` sin warnings en jsl).
- Docs: `AGENTS.frontend.md` §8, `AGENTS.todo.done.md`.

## 5. Verificación

- `bun test` → 92/92.
- `bunx vue-tsc --noEmit` → limpio.
- `bun run build` → verde.

## 6. Reglas

- Idioma español. Núcleo agnóstico: solo `ComposeEditor.vue` importa `ComposeImagePicker` y el puntero de compose.
- Sin dependencias nuevas, sin i18n, sin migraciones.
