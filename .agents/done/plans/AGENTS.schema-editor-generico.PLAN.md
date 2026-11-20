# Plan — Editor JSON-Schema genérico (agnosticismo del layout raíz)

> Detección del usuario (13 ago 2026) probando con `src/components/form/schema/ComposerEditor.vue`.
> Estado: **COMPLETADA**.
> Este archivo hace de historial y registra todos los cambios hechos.

## 1. Problema

`ComposeEditor.vue` (y la copia de prueba `ComposerEditor.vue`) hardcodean el layout de la raíz del documento:

1. `name` y `version` se extraen **explícitamente** a una sección superior (`nameEntry`/`versionEntry`).
2. **Todo** el resto de propiedades de la raíz se renderiza como pestañas, incluso las **simples**.

Con `composer.json` esto se nota: campos simples (`description`, `type`, `license`, `homepage`…) aparecen como pestañas y `name`/`version` fueran sacadas aparte. El sistema no es agnóstico.

El layout correcto ya existe y es genérico: `SchemaFieldObject.vue` (de la tarea "Un poco de orden") ordena los hijos de cualquier objeto → **simples inline primero** (obligatorias delante de opcionales) y **contenedores como pestañas**. Para compose, `name` y `version` son simples → quedarían inline automáticamente; los contenedores (`include`/`services`/`networks`…) como tabs.

## 2. Objetivo

- El editor de documentos usa el layout genérico de objeto (`SchemaFieldObject`) para la raíz. Sin hardcodeo de `name`/`version` ni "todo-en-tabs".
- Extraer la lógica compartida de los dos editores (sync model↔formData, alerts, import, preview YAML) a un componente genérico **`JsonSchemaEditor.vue`**, de modo que crear un editor nuevo sea un wrapper fino de configuración (schema + i18n + iconos), no una copia de ~270 líneas.
- `ComposeEditor.vue` y `ComposerEditor.vue` quedan como wrappers finos.

## 3. Decisiones

- `JsonSchemaEditor.vue` (nuevo, en `src/components/form/schema/`):
  - Props: `schema: JsonSchema`, `title?`, `description?`, `importLabel?` (default `form.schema_form.import_compose`), `importAccept?` (default `.yaml,.yml`), `resolveTitle?`, `resolveDescription?`, `resolveMessage?`, `icon?` (resolver de icono para tabs de contenedores de la raíz).
  - Contiene: `defineModel<string|null>`, `useSchemaToForm` + `provideSchemaFormContext`, watchers de sync model↔formData, alerts de error/warning, import de archivo, preview YAML, badge de draft.
  - Render de la raíz: `<SchemaFieldObject :node="form.root" path="" :icon="icon" />`.
- `SchemaFieldObject.vue`: nuevo prop opcional `icon?: (name, node) => string | undefined` para las tabs de contenedores; si no se provee, usa los iconos por kind de `ICONS.schemaForm`. Así Compose conserva sus iconos (`ICONS.compose`) sin que el núcleo deje de ser agnóstico.
- `ComposeEditor.vue`: queda como wrapper → `JsonSchemaEditor` con `composeJson = normalizeBooleanString(composeSpec)`, `resolveTitle`/`resolveDescription` de `form.compose_schema.*` e `icon` = `ICONS.compose[name]`. Se elimina todo el layout hardcodeado.
- `ComposerEditor.vue` (prueba del usuario): queda como wrapper fino con `composer-schema.json`; `importAccept: '.json'`. Demuestra el agnosticismo (sin resolvers ni claves Compose).
- Bonus: los labels de la raíz de compose pasan de `title` del esquema (inglés) a las claves localizadas de `form.compose_schema.properties.*` (igual que `SchemaFieldObject.labelOf`), una mejora visible.

## 4. Implementación

1. `SchemaFieldObject.vue`: prop `icon`; `tabIcon` usa `props.icon?.()` antes de `ICONS.schemaForm`.
2. `JsonSchemaEditor.vue` (nuevo): mover lógica de ComposeEditor (watchers, alerts, import, preview, header con draft badge).
3. `ComposeEditor.vue`: reescribir como wrapper fino.
4. `ComposerEditor.vue`: reescribir como wrapper fino (test agnóstico).
5. Verificación: `bun test`, `bun run i18n:types`, `bunx vue-tsc --noEmit`, `bun run build`.

## 5. Verificación

- `bun test` todo verde.
- `bunx vue-tsc --noEmit` y `bun run build`.
- Runtime: compose raíz muestra `name`/`version` inline y los contenedores como tabs con iconos de compose y labels localizados.

## 6. Reglas / restricciones

- Idioma español. Núcleo agnóstico (sin imports de compose/composer).
- Sin migraciones ni dependencias nuevas.
- Sin claves i18n nuevas (se reutilizan las existentes).

## 7. Registro de progreso

### Implementación (13 ago 2026) — COMPLETADA

- `SchemaFieldObject.vue`: prop opcional `icon`.
- `JsonSchemaEditor.vue` (nuevo): editor genérico (sync, alerts, import, preview, root vía `SchemaFieldObject`).
- `ComposeEditor.vue` y `ComposerEditor.vue`: wrappers finos.
- Verificación: `bun test` OK, `bun run i18n:types` OK, `vue-tsc --noEmit` limpio, `bun run build` verde.
- Docs: `AGENTS.frontend.md` §8 actualizado.
