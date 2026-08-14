# Plan — `JsonSchemaEditor`: formato de salida configurable (`formatOutput`)

> Tarea del usuario (13 ago 2026): el editor asume que el formato de salida es YAML, pero `composer.json` es JSON y `compose.yaml` es YAML. Con un único dato (`formatOutput`) se pueden inferir el parseo/serialización, las extensiones de import y la vista previa.
> Estado: **COMPLETADA**.
> Este archivo hace de historial y registra todos los cambios hechos.

## 1. Problema

`JsonSchemaEditor.vue` parsea/serializa siempre con `parseYaml`/`toYaml`. La prop `importAccept` solo controlaba las extensiones del `<input type="file">`, desacoplada del formato real. `ComposerEditor.vue` pasaba `import-accept=".json"` pero el modelo emitía YAML (bug latente).

## 2. Objetivo

- Nueva prop `formatOutput?: 'yaml' | 'json'` (default `'yaml'`), que reemplaza a `importAccept` y de la que se infiere todo:
  - parseo: `parseYaml` / `JSON.parse`.
  - serialización: `toYaml` / `JSON.stringify(data, null, 2)`.
  - extensiones de import: `.yaml,.yml` / `.json`.
  - vista previa del `UCard`.
- `ComposerEditor.vue` → `format-output="json"` (fix real). `ComposeEditor.vue` → `format-output="yaml"` explícito.
- Vista previa: título literal `Preview` (no traducible; componente de desarrollo).
- Label de import por defecto genérico: `form.schema_form.import_file` ('Importar archivo'); Compose conserva 'Importar compose.yaml' vía `importLabel`.

## 3. Cambios

- `src/components/form/schema/JsonSchemaEditor.vue`:
  - Props: − `importAccept`, + `formatOutput?: 'yaml' | 'json'` (default `'yaml'`).
  - Helpers: `importAccept` (computed), `parseDocument(text)`, `serializeDocument(data)`.
  - Reemplazos: 2× `parseYaml` → `parseDocument` (watcher de model + `handleImport`); 3× `toYaml` → `serializeDocument` (watcher de formData, preview, `lastModel`).
  - Preview: variable `yaml` → `preview`; título del card literal `Preview`.
  - Default `importLabel` → `t('form.schema_form.import_file')`.
- `src/components/form/schema/ComposeEditor.vue`: `format-output="yaml"` + `:import-label="t('form.schema_form.import_compose')"`.
- `src/components/form/schema/ComposerEditor.vue`: `import-accept=".json"` → `format-output="json"`.
- `src/locales/es/form/schema_form.ts`: + `import_file`, `import_not_object` → texto agnóstico, − `yaml_preview`.

## 4. Verificación

- `bun run i18n:types` (regenera `typed-locale.d.ts`), `bun test`, `bunx vue-tsc --noEmit`, `bun run build`.

## 5. Reglas

- Idioma español. Sin dependencias nuevas ni tests que referencien al editor.
