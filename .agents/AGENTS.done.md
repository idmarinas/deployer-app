# Tareas completadas por el AGENTE

> Este archivo es solo como historial para las tareas que ya se han completado.

## Tareas completadas (27 ago 2026 — revisión de los archivos AGENTS)

**Nota del usuario en `AGENTS.todo.md`**: _Revisión de los archivos AGENTS.md, AGENTS.frontend.md y AGENTS.backend.md. Hay que buscar inconsistencias de lo que dice el AGENTS con el estado real del proyecto._ Plan y detalle en `AGENTS.agentes-revision.PLAN.md`.

1. **`AGENTS.md`**: tabla Stack actualizada (`vite ^8.2.2`, `build` sin `i18n:types`); "Comandos" reescrita (sin `dev:db:generate` ni `drizzle:migrate`; `drizzle:generate` = generate + flatten); "Propósito del Backend" y "Acceso a datos" actualizados a Drizzle proxy para lecturas **y** escrituras vía `query_raw` (`is_write`, cifrado/descifrado/enmascarado); reglas y gotchas ajustados (sin `src/constants/dbTables.ts`, `docker_composes` → `docker_compose`, nombres reales del JSON-Schema).
2. **`AGENTS.frontend.md`**: §1 árbol de `src/` ampliado; §1 `theme/` añade `dashboardPanel.ts` y `radioGroup.ts`; §4b iconos = 8 módulos + migración solo con páginas reales; §5 i18n nota de `build`; §6 reescrito (catálogos projects/tasks/variables/deployments y runner universal marcados como **archivados** `.back`/`_archived.dist/`; se conservan consola remota, `ToggleEnabled.vue`, `countWhere`/`shared.ts`, esquema hosts); §8 nombres reales `ComposeJsonSchema.vue`/`ComposerJsonSchema.vue`.
3. **`AGENTS.backend.md`** (reescrito): §1 estructura real del crate (`commands/{cache/docker, database, hosts, passkeys, projects/docker/compose, remote}`, `crypto/`, `ssh/`, `helpers.rs`, `patch.rs`, `response.rs`); §2 las 7 tablas reales + caché Docker Hub; §3 entidades Drizzle (`encryptedText(...)`, timestamps `$onUpdate`, `deleted_at`); §4 cifrado con configuración en frontend; §5 operaciones Docker Compose + §5.1 consola remota; §6 `query_raw` real (lecturas Y escrituras); §7 sin `deployer-macros`, añadido `ts-rs`.
4. **Revisión final**: coherencia cruzada verificada entre los 3 documentos; sin restos de `run_deployment`/`ProgressEvent`/`DbEntity`/`deployer-macros` como sistemas activos.

**Resultado:** Solo cambios de documentación (no se tocó código ni migraciones). Verificado por grep que no quedan referencias a sistemas archivados como activos.

---

## Tareas completadas (25 ago 2026 — migración SQL de Rust a Drizzle)

**Nota del usuario en `AGENTS.todo.md`**: _Trasladar la lógica de SQL (select, insert, update, delete) de Rust a Drizzle, manteniendo el cifrado/descifrado en Rust (Opción D Híbrido)._ Plan y detalle en `AGENTS.migrate-to-drizzle.PLAN.md`.

**Resultado:** Ver plan para detalle completo de cambios.

---

## Tareas completadas (16 ago 2026 - mensajes informativos del selector de archivos TreeFiles)

**Nota del usuario en `AGENTS.todo.md`**: _Mensajes informativos según la combinación de capacidades (Editar/Subir/Crear) y si hay archivos o no. La alerta de compose faltante debe sustituir el placeholder. Vista previa de solo lectura cuando canEdit = false._ Plan y detalle en `AGENTS.tree-files-select-hint.PLAN.md`.

1. **i18n** (`src/locales/es/form/files.ts`): eliminado `select_hint`; añadida sección `hint.*` con 12 claves de la matriz (8 × hay/sin archivos, con mensajes compartidos en "sin archivos").
2. **`FileContentEditor.vue`**: nueva prop `readonly?: boolean` → pasa `readonly` al `UTextarea`.
3. **`TreeFiles.vue`**: computed `selectHintKey` (matriz E/U/C × archivos); placeholder sustituible con slot `#empty`; vista previa de solo lectura (`FileContentEditor` con `readonly`) cuando `canEdit = false`.
4. **`ComposeMissingAlert.vue`** (nuevo): `UAlert` de `compose_missing`/`compose_missing_hint`.
5. **`ComposeTreeFilesUpload.vue`**: eliminada alerta inferior; añadido slot `#empty` (`ComposeMissingAlert` si `canCreateFile && !hasMainCompose`, `<p>` si no) y `ComposeMissingAlert` en slot `#editor`.

**Resultado:** `bun run i18n:types` OK, `bunx vue-tsc --noEmit` limpio, `bun run build` verde.

---

## Tareas completadas (14 ago 2026 - simplificar la lib de archivos docker-compose)

**Nota del usuario en `AGENTS.todo.md`**: _Proposito de las funciones... las únicas que las interpreto como que son exclusivas de docker compose son: isMainComposeFile y isSecondaryComposeFile... en su mayoria solo es necesario el nombre del archivo, el cual está disponible en la fila del archivo._ Plan y detalle en `AGENTS.docker-compose-files-lib.PLAN.md`.

1. **`src/lib/files.ts`** (genérica): nuevas `isComposeFile(name)` (reconoce `compose.yaml`/`compose.yml`/`docker-compose.yaml`/`docker-compose.yml`) e `isEnvFile(name)` (`.env`, `*.env`, `.env.*`) — reciben el **nombre** del archivo (basename), no el `file_path`.
2. **`src/lib/docker-compose/files.ts`** reducida a lo exclusivo de compose: `isMainComposeFile`/`isSecondaryComposeFile` siguen recibiendo `file_path` (necesitan saber si el archivo está en la raíz o en subcarpeta) y delegan el chequeo de nombre en `isComposeFile` genérica.
3. **Callers**: `ComposeTreeFilesUpload.vue` usa `entry.name`/`item.label` en vez de `file_path` para `isComposeFile`/`isEnvFile`; `add.vue` usa `f.name` (eliminado el alias `isComposeFilePath`). `index.vue`/`edit.vue` sin cambios (solo `isMainComposeFile(f.file_path)`).

**Archivos modificados:**
- `src/lib/files.ts`, `src/lib/docker-compose/files.ts`
- `src/components/form/inputs/docker-compose/ComposeTreeFilesUpload.vue`
- `src/pages/dashboard/docker_composes/add.vue`
- `AGENTS.docker-compose-files-lib.PLAN.md` (→ plans.done), `AGENTS.todo.md`

**Resultado:** `bunx vue-tsc --noEmit` limpio, `bun run build` verde (17.5s). Sin cambios de BD, Rust ni i18n.

---

## Tareas completadas (14 ago 2026 - componentes de archivos (TreeFiles) agnósticos y reutilizables)

**Nota del usuario**: _El componente ComposeTreeFilesUpload junto con DockerComposeTreeFilePicker ¿se pueden hacer agnosticos? más reutilizable, para otras partes. Donde se necesiten guardar y editar archivos. La estructura base de la tabla (y lo que el TreeFilePicker maneja) sean iguales para todos._ Plan y detalle en `AGENTS.tree-files-agnostico.PLAN.md`.

1. **Migración SQL** (`0001_initial_schema.up.sql`, en sitio, sin bump de versión): `deployer_docker_compose_files` con `module_id` (FK del compose, CASCADE) en vez de `docker_compose_id`+`metadata`; columnas base nuevas `name`, `mime_type`, `size`, `last_modified`, `webkit_relative_path`, `icon`; índices `idx_module_id`, `idx_file_path`, `idx_name`. `down.sql` sin cambios (solo `DROP TABLE`). `bun run dev:db:generate` regenera `src/lib/schema.ts`/`relations.ts`.
2. **Backend Rust** (`commands/docker/compose/`): `files_types.rs` con `DockerComposeFile`/`ComposeFileInput`/`SyncDockerComposeFilesInput` (usa `module_id` + columnas nuevas; eliminados los inputs legacy); `files_commands.rs` reducido a `sync_docker_compose_files` (INSERT/UPDATE/DELETE/SELECT por `module_id`); `mod.rs` y `lib.rs` sin comandos muertos; `operations.rs` con `load_compose_files` por `module_id`. **Nota**: los bindings de `src/types/tauri-types.d.ts` se regeneran con `cargo test export_bindings` (ts-rs v12 genera tests via proc-macro; `cargo check`/`build` NO los regeneran).
3. **`src/lib/files.ts`** (nueva, agnóstica): `ManagedFile`, `TreeFilesConfig`, tipos de nodo (`ManagedTreeNode`), `getUploadRelativePath`, `detectBinary`, `isBinaryMimeType`, `getFileIcon`, `isImageEntry`/`getImageMimeType`, `buildManagedFile`, `byteSize`, `buildTree`, `collectFolderKeys`. **Defaults globales del picker** (no exclusivos de compose): `MAX_FILE_SIZE` (256 KB), `EXCLUDED_EXTENSIONS` y `IGNORED_DIRS`; `TreeFilePicker` los usa cuando `config` no los define. **`src/lib/docker-compose/files.ts`** reducida a lo específico de compose (`isComposeFile`, `isMainComposeFile`, `isSecondaryComposeFile`, `isEnvFilePath`).
4. **Componentes genéricos**:
   - `src/components/form/files/TreeFilePicker.vue` (← `DockerComposeTreeFilePicker.vue`): props `existingPaths`, `config?: TreeFilesConfig`; emite `files-selected: ManagedFile[]`; review dialog genérico.
   - `src/components/form/files/TreeFiles.vue` (← `ComposeTreeFilesUpload.vue`): props `class?`, `modelValue: ManagedFile[]`, `config?`, `canUpload?`, `canEdit?`, `canCreateFile?`, `isProtectedFile?`, `onBeforeCreate?`; slots `#actions`, `#tree-badges`, `#badges`/`#editor` (selección). Editar texto recalcula `size` (bytes). Crear archivo desde carpeta con ruta correcta (folder + nombre), fix del bug de `createFolder` inerte.
   - `src/components/form/files/FileContentEditor.vue` (nuevo): editor genérico imagen / alerta binario / textarea.
   - `src/components/view/TreeFilesViewer.vue` genérica: props `items`, `onCreateFile(fileName, folder)`, `canCreateFile?`; slots `#actions`, `#badges`; vacío `form.files.empty`.
   - `src/components/overlay/forms/ReviewFilesDialog.vue` (← `ReviewComposeFilesDialog.vue`): sin acción `'compose'`, `ignoredDirs?` por prop.
   - `useDialog.ts`: `useReviewFilesDialog` (opciones `items`/`existingPaths`/`ignoredDirs?`).
   - `CreateFileDialog.vue` con i18n genérica `form.files.*`.
5. **Wrapper compose** `src/components/form/inputs/docker-compose/ComposeTreeFilesUpload.vue` (wrapper fino sobre `TreeFiles`): `#actions` (crear compose.yaml), `#tree-badges`/`#badges` (principal/secundario/compose_label/imagen/binario/.env), `#editor` (`FileEditComposeEditor`/`FileEditEnvEditor`/`FileContentEditor`), alerta `compose_missing` gated por `canCreateFile`, `isProtectedFile = isMainComposeFile`, `onBeforeCreate` bloquea crear compose.yaml por el diálogo. `DockerComposeForm.vue` con `files: ManagedFile[]`. Eliminado `DockerComposeTreeFilePicker.vue`.
6. **Páginas**: `add.vue`/`edit.vue` construyen `ComposeFileInput[]` con las columnas nuevas y llaman `sync_docker_compose_files` con `module_id`; `(view).vue` usa el wrapper en modo solo ver (`can-upload`/`can-edit`/`can-create-file` a `false`), eliminando el render manual con `parseFileMetadata`/`getFileIcon(metadata)`. Loaders `docker_composes.ts` con SELECT de `module_id` + columnas nuevas.
7. **i18n**: `src/locales/es/form/files.ts` nueva (sección genérica `form.files.*`); `form/docker_composes.ts` reducida a lo específico; `overlays.ts` sin `action_compose`. `bun run i18n:types` regenera `typed-locale.d.ts`.

**Archivos modificados:**
- `src-tauri/migrations/0001_initial_schema.up.sql`, `src-tauri/src/commands/docker/compose/{files_types,files_commands,mod}.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/docker/compose/operations.rs`
- `src/lib/files.ts` (nuevo), `src/lib/docker-compose/files.ts`
- `src/components/form/files/{TreeFilePicker,TreeFiles,FileContentEditor}.vue` (nuevos), `src/components/view/TreeFilesViewer.vue`, `src/components/overlay/forms/{ReviewFilesDialog.vue nuevo, CreateFileDialog.vue}`, `src/composables/useDialog.ts`
- `src/components/form/inputs/docker-compose/ComposeTreeFilesUpload.vue` (reescrito), `src/components/form/DockerComposeForm.vue`; eliminado `src/components/form/inputs/docker-compose/DockerComposeTreeFilePicker.vue`
- `src/loaders/docker_composes.ts`, `src/pages/dashboard/docker_composes/{add.vue,[id]/edit.vue,[id]/(view).vue}`
- `src/locales/es/form/files.ts` (nuevo), `src/locales/es/form/docker_composes.ts`, `src/locales/es/overlays.ts`
- `AGENTS.tree-files-agnostico.PLAN.md` (→ plans.done), `AGENTS.todo.md`

**Resultado:** `bun run i18n:types` OK, `bunx vue-tsc --noEmit` limpio, `bun run build` verde, `components.d.ts` regenerado (sin referencias a componentes eliminados), `cargo test export_bindings` regeneró `tauri-types.d.ts`.

---

## Tareas completadas (13 ago 2026 - separar componentes del editor antiguo de compose: extensión `.back`)

**Nota del usuario**: _Hay que separar los componentes del antiguo editor del compose del nuevo; a los componentes del antiguo editor (y que no se usen) agregarles la extensión `.back`._ Plan y detalle en `AGENTS.compose-old-editor-back.PLAN.md`.

1. Renombrados a `*.vue.back` los **9 componentes huérfanos** del editor visual antiguo en `src/components/form/inputs/docker-compose/`: `ComposeTopLevelSection`, `ComposeServicesSection`, `ComposeServiceFields`, `ComposePortEditor`, `ComposeVolumeMountEditor`, `ComposeEnvironmentEditor`, `ComposeLabelsEditor`, `ComposeHealthcheckFields`, `ComposeDeployFields`.
   - Cadena muerta: `ComposeTopLevelSection`/`ComposeServicesSection` sin uso en `src/`; `ComposeServiceFields` solo lo usaba `ComposeServicesSection`; los 6 editores de campos solo los usaba `ComposeServiceFields`. Ningún test los referenciaba.
   - Al no terminar en `.vue`, unplugin-vue-components deja de escanearlos → desaparecen del auto-import y de `components.d.ts` sin romper nada.
2. **Se quedan (en uso):** `ComposeImagePicker.vue` (lo usa el nuevo `ComposeEditor.vue`), `DockerComposeTreeFilePicker.vue` + `ComposeTreeFilesUpload.vue` (flujo add/edit vía `DockerComposeForm.vue`).
3. **No tocado:** `_archived.dist/` (prohibido por AGENTS; ahí queda la copia del editor antiguo completo como referencia) ni las libs de `src/lib/docker-compose/`.

**Archivos modificados:**
- 9 renames en `src/components/form/inputs/docker-compose/`
- `AGENTS.compose-old-editor-back.PLAN.md`, `AGENTS.todo.done.md`

**Resultado:** grep sin referencias vivas en `src/`; `bun test` 92/92 OK; `bunx vue-tsc --noEmit` limpio; `bun run build` verde con `components.d.ts` regenerado (quedan `ComposeImagePicker`, `ComposeTreeFilesUpload`, `DockerComposeTreeFilePicker`).

---

## Tareas completadas (13 ago 2026 - widgets por normalizer: ComposeImagePicker para service.image)

**Nota del usuario**: _En `src/components/form/inputs/docker-compose` hay un componente que podemos usar para este nuevo formato: `ComposeImagePicker`. Podríamos poner un normalizer para que, cuando detecte un `service.image`, use ese selector y no un string corriente._ Plan y detalle en `AGENTS.compose-image-picker.PLAN.md`.

1. **`src/utils/schema-form/normalize.ts`**: `SchemaNormalizer` pasa a `(schema, pointer) => ...` (retrocompatible: funciones de 1 parámetro siguen valiendo) y el walker de `normalizeSchema` ahora recorre con seguimiento del **JSON pointer** (raíz `#`, escapando `~`→`~0` y `/`→`~1` en properties/patternProperties/$defs/definitions y `/<idx>` en arrays). Nuevos:
   - `WIDGET_KEY = 'x-widget'` — clave de marcado de widget. jsl **ignora las claves `x-*`** (`SchemaNode.addKeywords`: `!key.startsWith("x-")`), por lo que no genera `unknown-keyword-warning` ni hace falta registrar keywords en `compileRoot`.
   - `widgetsNormalizer(map: Record<pointer, nombre>)` — marca `{ ...schema, 'x-widget': nombre }` solo si el pointer del nodo está en el mapa; `undefined` si no.
2. **`src/composables/useSchemaToForm.ts`**: opción `widgets?: Record<string, Component>` en `SchemaFormOptions` y expuesta en `SchemaFormInstance.widgets` (núcleo agnóstico: solo guarda el mapa).
3. **`src/components/form/schema/JsonSchemaEditor.vue`**: prop `widgets?: Record<string, Component>` → `useSchemaToForm`.
4. **`src/components/form/schema/SchemaField.vue`**: `widget` computed leyendo `schema[WIDGET_KEY]` → `form.widgets[nombre]`; en la rama escalar, `<component v-if="widget" :is="widget" v-model="model" />` antes del `UInput` de string.
5. **`src/components/form/schema/ComposeEditor.vue`** (único sitio compose-específico): `widgetsNormalizer({ '#/$defs/service/properties/image': 'compose-image' })` y `:widgets="{ 'compose-image': ComposeImagePicker }"`. El marcado sobrevive a la resolución de `$ref`: `services.<x>.image` llega al nodo `image` de `$defs.service` con su `x-widget`.
6. **`tests/normalize.test.ts`** (+4 tests): pointer coincidente/no coincidente, escapado `~`/`/`, E2E compose (`service.image` → kind string con `x-widget='compose-image'` tras `$ref`) y `x-widget` sin warnings en jsl.

**Archivos modificados:**
- `src/utils/schema-form/normalize.ts`
- `src/composables/useSchemaToForm.ts`
- `src/components/form/schema/JsonSchemaEditor.vue`
- `src/components/form/schema/SchemaField.vue`
- `src/components/form/schema/ComposeEditor.vue`
- `tests/normalize.test.ts`
- `AGENTS.compose-image-picker.PLAN.md`, `AGENTS.todo.done.md`, `AGENTS.frontend.md` §8

**Resultado:** `bun test` 92/92 OK, `bunx vue-tsc --noEmit` limpio, `bun run build` verde.

---

## Tareas completadas (13 ago 2026 - formato de salida configurable en JsonSchemaEditor)

**Nota del usuario**: _Le veo un fallo a `JsonSchemaEditor.vue`: asume que el formato de salida es yaml, pero composer.json es json y compose sí es yaml. Crea un prop (o el mismo importAccept...) pero ese importAccept se podría sustituir por un formatOutput, haciendo que inicialmente solo acepte yaml y json; si se pone yaml ya se sabe que las extensiones admitidas son .yaml/.yml. Es decir, con un único dato podemos inferir varias cosas._ Plan y detalle en `AGENTS.schema-editor-format.PLAN.md`.

1. **`JsonSchemaEditor.vue`**: eliminada la prop `importAccept`; nueva `formatOutput?: 'yaml' | 'json'` (default `'yaml'`). De ella se infiere todo:
   - `parseDocument(text)` → `parseYaml` / `JSON.parse`.
   - `serializeDocument(data)` → `toYaml` / `JSON.stringify(data, null, 2)`.
   - `importAccept` (computed) → `.yaml,.yml` / `.json` (para el `<input type="file">`).
   - Vista previa: variable `yaml` → `preview`, con título del card literal `Preview` (no traducible; componente de desarrollo que luego se quitará).
   - Default de `importLabel` → `form.schema_form.import_file` ('Importar archivo').
2. **`ComposeEditor.vue`**: `format-output="yaml"` (explícito) + `:import-label="t('form.schema_form.import_compose')"` (conserva 'Importar compose.yaml').
3. **`ComposerEditor.vue`**: `import-accept=".json"` → `format-output="json"`. **Fix real**: antes el modelo emitía YAML aunque aceptase JSON; ahora parsea/serializa JSON.
4. **i18n** (`src/locales/es/form/schema_form.ts`): + `import_file`, `import_not_object` → 'El archivo no contiene un objeto válido' (formato-agnóstico), − `yaml_preview` (sin uso). `typed-locale.d.ts` regenerado con `bun run i18n:types`.

**Archivos modificados:**
- `src/components/form/schema/JsonSchemaEditor.vue`
- `src/components/form/schema/ComposeEditor.vue`
- `src/components/form/schema/ComposerEditor.vue`
- `src/locales/es/form/schema_form.ts`
- `AGENTS.schema-editor-format.PLAN.md`, `AGENTS.todo.done.md`, `AGENTS.frontend.md` §8

**Resultado:** `bun run i18n:types` OK, `bun test` 88/88 OK, `bunx vue-tsc --noEmit` limpio, `bun run build` verde.

---

## Tareas completadas (13 ago 2026 - normalizadores globales de JSON-Schema por schema)

**Nota del usuario**: _Hay que separar el `normalizeBooleanString`, es decir, crear un normalizer global para los schema-json, y agregarle normalizers según se necesite para el schema. Por ejemplo, el de compose necesita el de booleanString, pero el de composer puede que no, y pueden crearse nuevos que se vayan añadiendo._ Plan y detalle en `AGENTS.normalizer-global.PLAN.md`.

1. **`src/utils/schema-form/normalize.ts`** (reescrito): se elimina `normalizeBooleanString` y se sustituye por:
   - `SchemaNormalizer = (schema) => Record<string, any> | undefined` — un normalizador transforma **un solo nodo** (nodo nuevo o `undefined` si no aplica). Añadir un normalizador nuevo = una función de nodo, sin tocar el walker.
   - `booleanStringNormalizer` — `boolean|string` exacto (cualquier orden) → `{ ...schema, type: 'boolean' }`; uniones de 3+ tipos y tipos simples → `undefined`.
   - `normalizeSchema(schema, ...normalizers)` — walker global que clona y recorre las claves estándar (`properties`, `patternProperties`, `$defs`, `definitions`, `oneOf`/`anyOf`/`allOf`/`prefixItems`, `items`, `additionalProperties`, `not`, `contains`), aplicando los normalizadores en orden a cada nodo. **Sin normalizadores devuelve el schema sin recorrerlo** (sin coste).
2. **`ComposeEditor.vue`**: `normalizeSchema(composeSpec, booleanStringNormalizer)` (único consumidor del normalizador).
3. **`ComposerEditor.vue`**: `normalizeSchema(composerSpec)` — **sin** normalizadores. Es un fix real: `abandoned` es `["boolean","string"]` donde el `string` es un valor semántico (nombre/URL del paquete alternativo recomendado); normalizarlo a `boolean` perdería información.
4. **`tests/normalize.test.ts`** (reescrito): normalizer devuelve nodo transformado/`undefined`, `normalizeSchema` sin normalizadores → passthrough (misma referencia), varios normalizadores en orden, no muta el original, compose (attach/privileged/read_only → boolean, `network.external` union conservada) y composer `abandoned` conserva la unión.

**Archivos modificados:**
- `src/utils/schema-form/normalize.ts`
- `src/components/form/schema/ComposeEditor.vue`
- `src/components/form/schema/ComposerEditor.vue`
- `tests/normalize.test.ts`
- `AGENTS.normalizer-global.PLAN.md`, `AGENTS.todo.done.md`, `AGENTS.frontend.md` §8

**Resultado:** `bun test` 88/88 OK, `bunx vue-tsc --noEmit` limpio, `bun run build` verde (17.4s).

---

## Tareas completadas (13 ago 2026 - editor JSON-Schema genérico, layout raíz agnóstico)

**Detección del usuario**: `ComposeEditor.vue` (y su copia de prueba `ComposerEditor.vue` para `composer.json`) hardcodeaban el layout de la raíz: `name`/`version` sacadas a una sección superior y **todo** el resto como pestañas, incluso campos simples. Con `composer.json` se nota: campos simples (`description`, `type`…) aparecen como pestañas. Plan y detalle en `AGENTS.schema-editor-generico.PLAN.md`.

1. **`src/components/form/schema/JsonSchemaEditor.vue`** (nuevo): editor genérico de documento JSON-Schema. Props: `schema: JsonSchema`, `title?`, `description?`, `importLabel?` (default `form.schema_form.import_compose`), `importAccept?` (default `.yaml,.yml`), `resolveTitle?`, `resolveDescription?`, `resolveMessage?`, `icon?` (resolver de icono por tab). Contiene `defineModel<string|null>`, `useSchemaToForm` + `provideSchemaFormContext`, sync model↔formData, alerts de error/warning, import de archivo, preview YAML y badge de draft. La raíz se renderiza con `<SchemaFieldObject :node="form.root" path="" :icon="icon" />` → layout genérico de objeto: **simples inline primero, contenedores como pestañas** (sin hardcodeo de `name`/`version` ni "todo-en-tabs").
2. **`SchemaFieldObject.vue`**: nuevo prop opcional `icon?: (name, node) => string | undefined`; `tabIcon` usa `props.icon?.()` antes de `ICONS.schemaForm`. El núcleo sigue sin importar compose/composer.
3. **`ComposeEditor.vue`**: reescrito como wrapper fino → `JsonSchemaEditor` con `composeJson = normalizeBooleanString(composeSpec)`, `resolveTitle`/`resolveDescription` de `form.compose_schema.*` e `icon = ICONS.compose[name]`. Eliminado todo el layout hardcodeado.
4. **`ComposerEditor.vue`** (prueba de agnosticismo): reescrito como wrapper fino con `composer-schema.json` + `normalizeBooleanString`, `importAccept: '.json'`, sin resolvers ni iconos de Compose.
5. Bonus: los labels de la raíz de compose pasan de `title` del esquema (inglés) a las claves localizadas `form.compose_schema.properties.*` (igual que `SchemaFieldObject.labelOf`).

**Archivos modificados:**
- `src/components/form/schema/JsonSchemaEditor.vue` (nuevo)
- `src/components/form/schema/SchemaFieldObject.vue`
- `src/components/form/schema/ComposeEditor.vue`
- `src/components/form/schema/ComposerEditor.vue`
- `AGENTS.schema-editor-generico.PLAN.md`, `AGENTS.todo.done.md`, `AGENTS.frontend.md` §8

**Resultado:** `bun test` 84/84 OK, `bunx vue-tsc --noEmit` limpio, `bun run build` verde (17.8s). Sin claves i18n nuevas (se reutilizan las existentes).

---

## Tareas completadas (13 ago 2026 - ajustes a ciertos campos: boolean|string)

**Nota del usuario en `AGENTS.todo.md`**: _Los campos `boolean | string` realmente solo admiten un valor booleano; el `string` es para que ciertos parsers no fallen al ver un `true`/`false` como string. Hay que cambiar este comportamiento en este caso._ Plan y detalle en `AGENTS.campos-boolean-string.PLAN.md`.

1. **`src/utils/schema-form/normalize.ts`** (nuevo): `normalizeBooleanString(schema)` convierte las uniones exactas `['boolean','string']` (cualquier orden, 2 tipos) en `type: 'boolean'`, con recursión completa (`properties`, `patternProperties`, `$defs`, `definitions`, `oneOf`/`anyOf`/`allOf`/`prefixItems`, `items`, `additionalProperties`, `not`, `contains`). Utilidad **agnóstica** (no importa compose). Las uniones de 3+ tipos (`external`, `provider.options.*`, `list_or_dict`) se dejan intactas para confirmar aparte.
2. **`ComposeEditor.vue`**: compila el esquema normalizado (`normalizeBooleanString(composeSpec)`). Efecto coherente en render (USwitch), defaults (`getData()` → `false` en vez de `""`) y validación (un string `"true"` deja de ser válido).
3. **`tests/normalize.test.ts`** (nuevo): orden de los 2 tipos, no toca tipos simples ni uniones de 3+ tipos, recursión anidada, y con `compose-spec.json` real: `attach`/`privileged`/`read_only` → kind `boolean`; `healthcheck.properties.disable` → `boolean`; `network.external` → sigue unión.

**Archivos modificados:**
- `src/utils/schema-form/normalize.ts` (nuevo)
- `src/components/form/schema/ComposeEditor.vue`
- `tests/normalize.test.ts` (nuevo)
- `AGENTS.campos-boolean-string.PLAN.md`, `AGENTS.todo.done.md`, `AGENTS.todo.md`, `AGENTS.frontend.md` §8

**Resultado:** `bun test` 84/84 OK, `bun run i18n:types` OK, `bunx vue-tsc --noEmit` limpio, `bun run build` verde.

---

## Tareas completadas (13 ago 2026 - un poco de orden en el formulario JSON-Schema)

**Nota del usuario en `AGENTS.todo.md`**: _Hay que poner un poco de orden en el formulario, hay secciones que son inmensas. Parto del ejemplo de services: tiene muchas propiedades dentro, por lo que inicialmente solo debería mostrar las obligatorias; y en orden, las propiedades simples primero y luego las de tipo array|object en forma de pestañas (como include, services, networks)._ Plan y detalle en `AGENTS.schema-form-orden.PLAN.md`.

1. **`src/utils/schema-form/jsl.ts`**: nueva utilidad `isContainerNode(node)` → true si el nodo es contenedor (`array`/`map`/`object`/`any`) o una unión con alguna variante contenedora (p.ej. `build` `['string','object']`); las uniones de solo simples (`boolean|string` en `attach`, `privileged`…) se consideran simples.
2. **`src/components/form/schema/SchemaFieldObject.vue`** (nuevo): render de los hijos de un objeto con orden: **simples primero** (obligatorias delante de opcionales) y **contenedores como pestañas** (icono por kind vía `ICONS.schemaForm` + punto rojo/ámbar de error/warning, igual que las tabs raíz de `ComposeEditor`). Cuando hay muchas simples opcionales (>10) se pliegan tras el botón "Mostrar campos" (`UCollapsible`): **inicialmente solo se ven las obligatorias** — en `service` (sin `required`) la sección simple queda plegada y lo primero visible son las pestañas.
3. **`SchemaField.vue`**: el render de objetos delega el cuerpo en `SchemaFieldObject` (la cabecera con label/help/remove/add se conserva aquí). Eliminados `OBJECT_COLLAPSE_THRESHOLD`, `children` y `childPath` (pasaron al nuevo componente).
4. **`src/utils/icons.ts`**: nuevo grupo `ICONS.schemaForm` (`object`/`map`/`array`/`union`/`any`) para los iconos de las pestañas anidadas.
5. **`tests/jsl.test.ts`**: bloque `isContainerNode` sobre `service` real (build/devices/healthcheck/environment/depends_on → contenedores; image/attach/hostname/cpus → simples).

**Archivos modificados:**
- `src/utils/schema-form/jsl.ts`
- `src/components/form/schema/SchemaFieldObject.vue` (nuevo)
- `src/components/form/schema/SchemaField.vue`
- `src/utils/icons.ts`
- `tests/jsl.test.ts`
- `AGENTS.schema-form-orden.PLAN.md`, `AGENTS.todo.done.md`, `AGENTS.todo.md`, `AGENTS.frontend.md` §8

**Resultado:** `bun test` 79/79 OK, `bun run i18n:types` OK, `bunx vue-tsc --noEmit` limpio, `bun run build` verde.

---

## Tareas completadas (13 ago 2026 - mostrar warnings de validación jsl)

**Nota del usuario en `AGENTS.todo.md`**: _La validación de jsl incluye también warnings; esos warnings también se deberían mostrar._ Plan y detalle en `AGENTS.schema-form-jsl.PLAN.md` Fase 8.

1. **`src/utils/schema-form/validate.ts`**: `ValidationResult` ahora incluye `warnings: Record<ruta, string[]>`. `validateWithJsl` recoge las annotations de `root.validate(data)` cuyo código termina en `-warning` (p.ej. `deprecated-warning` de propiedades `deprecated` con valor) y las agrupa por ruta con clave i18n `form.schema_form.warnings.*`. `ok` sigue dependiendo solo de `errors` (los warnings no invalidan).
2. **`src/composables/useSchemaToForm.ts`**: expone `warnings` (ref) y `warningAt(path)`; `validate()` rellena ambos.
3. **`SchemaField.vue`**: muestra el primer warning del campo (`text-warning`) bajo el campo.
4. **`ComposeEditor.vue`**: `UAlert` color `warning` con resumen de warnings y punto ámbar en los tabs afectados (el rojo de errores tiene prioridad).
5. **i18n**: `validation_warnings` y `warnings.*` (deprecated/unknown_keyword/unknown_format/schema/generic) en `src/locales/es/form/schema_form.ts`.

**Archivos modificados:**
- `src/utils/schema-form/validate.ts`
- `src/composables/useSchemaToForm.ts`
- `src/components/form/schema/SchemaField.vue`
- `src/components/form/schema/ComposeEditor.vue`
- `src/locales/es/form/schema_form.ts`
- `tests/validate.test.ts` (bloque "deprecated-warning")
- `AGENTS.schema-form-jsl.PLAN.md` (Fase 8), `AGENTS.todo.done.md`, `AGENTS.todo.md`

**Resultado:** `bun test` 73/73 OK, `bun run i18n:types` OK, `bun run build` verde. Comprobado en runtime: `version: '3'` en compose-spec genera `warnings.version = deprecated`.

---

## Tareas completadas (13 ago 2026 - revisión de notas del sistema de formularios jsl, 3ª ronda)

**Notas del usuario en `AGENTS.todo.md`** (3ª revisión) y cambios aplicados. Plan y detalle en `AGENTS.schema-form-jsl.PLAN.md` Fase 7.

1. **Botón de añadir en la línea del título**: el botón "+" de arrays/mapas ahora va a la derecha del título (no al final de la lista). `SchemaField.vue` lo muestra en la cabecera (modo no `bare`) e invoca la acción vía `defineExpose({ add })` + template refs de `SchemaFieldArray.vue`/`SchemaFieldMap.vue` (que reciben el nuevo prop `bare` y conservan su botón inferior solo en modo `bare`).
2. **Mapas de objetos en pestañas**: `SchemaFieldMap.vue` detecta mapas cuyo valor es objeto (`classifyNode(valueNode).kind === 'object'`, p.ej. `services`, `networks`) y los renderiza como pestañas (una por entrada, con clave editable y borrado dentro de la pestaña activa). El resto de mapas conserva las filas. `addEntry` salta a la pestaña nueva y `removeEntry` ajusta el índice activo.
3. **Fix: uniones por `type` array no permitían poner el valor**: una propiedad `['string','number','boolean']` (valores de mapas `list_or_dict`) no mostraba ningún control porque `activeVariantIndex`/`preferredVariant`/`variantDefault` solo miraban `node.oneOf`/`anyOf`. Nueva utilidad `unionVariants(node)` (usa las variantes de `classifyNode`) aplicada en los tres helpers. Ahora al elegir el tipo aparece el control correcto: USwitch (boolean), UInput (string) o UInputNumber (number). El null se sigue gestionando con el switch de `SchemaFieldNull`.
4. **Etiquetas de tipo en español**: `SchemaFieldUnion.vue` y `SchemaFieldArray.vue` usan `form.schema_form.kind.*` con fallback a `variantLabel`.

**Archivos modificados:**
- `src/utils/schema-form/jsl.ts` (nuevo `unionVariants`; `activeVariantIndex`/`preferredVariant` usan las variantes de classifyNode)
- `src/components/form/schema/SchemaField.vue` (botón de añadir en la cabecera para array/map; refs a los hijos)
- `src/components/form/schema/SchemaFieldArray.vue` (prop `bare`, `defineExpose({ add })`, etiquetas kind, botón inferior solo en bare)
- `src/components/form/schema/SchemaFieldMap.vue` (pestañas para mapas de objetos, prop `bare`, `defineExpose({ add })`)
- `src/components/form/schema/SchemaFieldUnion.vue` (etiquetas kind en español)
- `tests/jsl.test.ts` (bloque "uniones por type array")
- `AGENTS.schema-form-jsl.PLAN.md` (Fase 7), `AGENTS.todo.done.md`, `AGENTS.todo.md`

**Resultado:** `bun test` 70/70 OK, `bun run i18n:types` OK, `bun run build` verde.

---

## Tareas completadas (13 ago 2026 - revisión de notas del sistema de formularios jsl, 2ª ronda)

**Notas del usuario en `AGENTS.todo.md`** (2ª revisión) y cambios aplicados. Plan y detalle en `AGENTS.schema-form-jsl.PLAN.md` Fase 6.

1. **Selector de tipo → `URadioGroup`** (en vez de select/desplegable): el selector que decide si la propiedad es string/objeto/array (p.ej. `include`) era un `USelect`. Cambiados a `URadioGroup orientation="horizontal" variant="table" indicator="hidden" size="sm"`:
   - `SchemaFieldArray.vue` (formato de items unión de un array).
   - `SchemaFieldUnion.vue` (variantes de una unión).
   - Eliminada la clave i18n `form.schema_form.choose` (quedó sin uso).
2. **Fix del switch "Sin valor (null)"**: desactivar el null hacía `form.remove(path)` y en un mapa (p.ej. `networks`) borraba la clave completa (la red desaparecía). Ahora `SchemaFieldNull.vue` recibe el nodo (`node?: SchemaNode`) y desactiva con `form.set(path, variantDefault(node))` → `networks.<nombre>` vuelve a `{}` y la entrada permanece. `SchemaField.vue` pasa el nodo resuelto.

**Archivos modificados:**
- `src/components/form/schema/SchemaFieldArray.vue` (`URadioGroup` de formato)
- `src/components/form/schema/SchemaFieldUnion.vue` (`URadioGroup` de variantes; quitado `useI18n` no usado)
- `src/components/form/schema/SchemaFieldNull.vue` (prop `node` + `variantDefault` al desactivar null)
- `src/components/form/schema/SchemaField.vue` (pasa `:node` a `SchemaFieldNull`)
- `src/locales/es/form/schema_form.ts` (− `choose`)
- `AGENTS.schema-form-jsl.PLAN.md` (Fase 6), `AGENTS.todo.done.md`, `AGENTS.todo.md`

**Resultado:** `bun test` 66/66 OK, `bun run i18n:types` OK, `bun run build` verde.

---

## Tareas completadas (13 ago 2026 - revisión de notas del sistema de formularios jsl)

**Notas del usuario en `AGENTS.todo.md`** (tras completar el sistema jsl) y cambios aplicados:

1. **`src/utils/compose-schema/types.ts` y `src/utils/json-utils.ts` innecesarios** → eliminados.
   - `json-utils.ts`: `toJson`/`fromJson` eran código muerto (ningún consumidor); `composeJson` solo lo usaba `ComposeEditor.vue`, ahora inline (`composeSpec as JsonSchema`).
   - `compose-schema/types.ts`: solo definía `ComposeSpecification`/`ComposeJson` = `Record<string, any>`.
2. **Botón "Cargar ejemplo" sobra** → eliminado (`loadSample()`, const `sample`, `UButton`, clave i18n `form.schema_form.load_sample`).
3. **Array con items `oneOf` → UN solo formato (no mezclar)** → corregido en `SchemaFieldArray.vue`: los `variants` se calculan con `classifyNode(resolveNode(items))`, cubriendo `items.oneOf` directo, `$ref`→unión (p.ej. `include`) y `type` array. Antes `include.items` era `$ref` y no se detectaba el select → se podían mezclar formatos por item.
4. **Visibilidad de errores al validar** → `ComposeEditor.vue` muestra ahora un `UAlert` resumen (`form.schema_form.validation_errors`), auto-activa el tab con el primer error y marca los tabs con errores (punto rojo). Antes los errores solo se veían en campos montados (tabs visibles).

**Archivos modificados:**
- `src/components/form/schema/ComposeEditor.vue`
- `src/components/form/schema/SchemaFieldArray.vue`
- `src/locales/es/form/schema_form.ts` (+ `validation_errors`, − `load_sample`)
- `AGENTS.md`, `AGENTS.frontend.md`, `AGENTS.schema-form-jsl.PLAN.md` (Fase 5)
- Eliminados: `src/utils/json-utils.ts`, `src/utils/compose-schema/types.ts` (+ carpeta `compose-schema/`)

**Resultado:** `bun test` OK, `bun run i18n:types` OK, `bun run build` verde.

---

## Tareas completadas (13 ago 2026 - sistema de formularios JSON-Schema con jsl)

**Objetivo:** Reconstruir el sistema de formularios por JSON-Schema (`src/components/form/schema/*`, `src/composables/useSchemaToForm.ts`, `src/utils/schema-form/*`) para que gire alrededor de **`json-schema-library` (jsl)** y sea **agnóstico** (no depende de `compose-spec.json` ni `composer-schema.json`). Ejecutado en 4 fases según `AGENTS.schema-form-jsl.PLAN.md`.

**Fase 1 - utilidades jsl (`src/utils/schema-form/jsl.ts`, `paths.ts`):**
- `compileRoot(schema)` → `{ root: SchemaNode, draft: string }` (detecta `draft-04`/`2020-12`).
- `classifyNode(node)` → `{ kind, nullable, isUnion, isMap, variants? }`. Semántica de `type` como array: `['<tipo>','null']` → nullable; varios tipos sin `null` → union; con `null` → union + nullable; `'null'` solo → campo null.
- `resolveNode(node)` → resuelve `$ref` (`node.resolveRef()`) y fusiona `allOf` (`mergeNode`).
- `activeVariantIndex` (reduce con `getNode('#', valor)` → `oneOfIndex`, fallback por tipo JS), `preferredVariant`, `variantDefault` (vía `getData()`), `variantLabel`.
- `paths.ts`: se añaden `pathToPointer`/`pointerToPath`.

**Fase 2 - validación (`src/utils/schema-form/validate.ts`):**
- `validateWithJsl(root, data, resolveMessage?)` → `{ ok, errors: Record<ruta, string[]> }`, mapeando pointer→ruta y código jsl→clave i18n `form.schema_form.errors.*`.
- Claves `errors.*`, `kind.null`, `null_value` en `src/locales/es/form/schema_form.ts`; `typed-locale.d.ts` regenerado.

**Fase 3 - composable + contexto + componentes + ComposeEditor (el swap):**
- `useSchemaToForm.ts` reescrito: `{ root, draft, formData, errors, validate, errorAt, get, set, remove, nodeAt, resolveTitle, resolveDescription }`; defaults iniciales vía `root.getData()`.
- `SchemaField.vue` (despacho por `classifyNode`, soporta nullable con `SchemaFieldNull`), `SchemaFieldNull.vue` (USwitch null), `SchemaFieldUnion.vue` (USelect de variantes, oneOf exclusivo), `SchemaFieldArray.vue` (lista + USelect de formato si `items.oneOf`, array uniforme), `SchemaFieldMap.vue` (patternProperties[0] → additionalProperties → any), `SchemaFieldAny.vue` (textarea JSON), `context.ts`.
- `ComposeEditor.vue`: tabs desde `root.properties`, name/version aparte, `UBadge` con el draft, mismos sample/validate/generate.
- Arreglos colaterales: `src/pages/dashboard/docker_composes/add.vue` (eliminado onSubmit/template muerto); recreado `src/components/form/editors/parts/ComposeFileForm.vue` como adaptador `ComposeFile ↔ ComposeEditor`.

**Fase 4 - limpieza y documentación:**
- Eliminados `src/utils/schema-form/{extract.ts,toZod.ts,defaults.ts,union.ts,types.ts}`, `src/components/form/editors/ComposeEditor.vue.back`, `tests/union.test.ts`, `schema-form.plan.md` (consolidado en el PLAN).
- `tests/schema-form.test.ts` reescrito contra la nueva API (mantiene cobertura: refs cíclicos, union/array/object/map/enum, defaults, paths, validación anidada y format).
- Actualizados `AGENTS.md` (gotcha) y `AGENTS.frontend.md` (§8 Formularios JSON-Schema).
- `src/utils/json-utils.ts`: `composeJson: JsonSchema` (importa `JsonSchema` de jsl en vez de `Schema`).

**Resultado:** `bun test` 66/66 OK, `vue-tsc --noEmit` limpio, `bun run build` verde.

---

## Tareas completadas (07 ago 2026 — simplificar caché Docker Hub tags)

**Objetivo:** Rediseñar `deployer_docker_hub_tags_cache` para guardar **una fila por página consultada** (en vez de una por tag), reduciendo el número de registros y las peticiones a Docker Hub.

**Nueva estructura de la tabla** (`src-tauri/migrations/0001_initial_schema.up.sql`):

- `id`, `namespace`, `repository` — igual que antes
- `url_query` — URL usada para la petición (clave de caché; UNIQUE `(namespace, repository, url_query)`)
- `url_next` / `url_previous` — URLs de paginación devueltas por la API
- `count` — total de tags (de la API)
- `tags` — JSON de `results` filtrando `content_type == "image"` y omitiendo `images`, `digest`, `content_type`, `media_type`; cada tag **enriquecido** con `version`/`variant`
- `tags_versions` / `tags_variants` — arrays JSON de valores únicos en orden de aparición (orden de la API = `last_updated` desc)
- `fetched_at` — marca de antigüedad; TTL de 24 h (`TAGS_CACHE_TTL_SECONDS`), search usa TTL de 1 h (`SEARCH_CACHE_TTL_SECONDS`)

**Lógica backend** (`src-tauri/src/commands/docker/hub_cache/`):

- `parse_tag()` = misma lógica que `parseTag()` del frontend (versión = parte anterior al primer `-`, variante = resto o `""`)
- `get_docker_hub_tags_cache(image_name, tag: Option<String>)`:
  - sin `tag` → página 1 (dropdown)
  - con `tag` → camina por `url_next` (límite `MAX_TAG_PAGES = 100`), consultando caché por `url_query` y haciendo HTTP solo para páginas no frescas
- UPSERT con `ON CONFLICT (namespace, repository, url_query) DO UPDATE`
- `cache_is_fresh` ahora recibe el TTL como parámetro

**Frontend:**

- `src/lib/docker-compose/docker-hub.ts` — interfaz `DockerHubTagResult` alineada (`version`, `variant`), nueva `fetchDockerHubTagExists(imageName, tag)` usada por `validateComposeImages`
- `src/components/form/inputs/docker-compose/ComposeImagePicker.vue` — consume `version`/`variant` precalculados, `parseTag` eliminada
- `src/types/tauri-types.d.ts` regenerado con `cargo test export_bindings` (`TS_RS_EXPORT_DIR=../src/types`)
- `src/lib/schema.ts` regenerado por drizzle

**Resultado:** `cargo check` limpio, `cargo test` 99 tests OK, `vue-tsc --noEmit` OK.

**Spec original de la tarea (migrada de AGENTS.todo.md):**

Docker composes, simplificar un poco la tabla `deployer_docker_hub_tags_cache`.

1. Actualmente guardar un registro por cada tag, lo cual eso hace que aumente en exceso el número de registros.
2. Incluyo un ejemplo de la respuesta de búsqueda de tags para un repositirio poniendo para una tag (todas siguen el mismo patrón.)

Esta es la estructura de la tabla actualmente:

- id
- namespace
- repository
- tag_name
- last_updated
- full_size
- fetched_at

Nueva estructura de la tabla:

- id -> esto es igual que en la anterior
- namespace  -> esto es igual que en la anterior
- repository  -> esto es igual que en la anterior
- url_query -> Esta es la url que se ha usado para recuperar los datos.
- url_next -> Url para la siguiente página
- url_previous -> Url para la página anterior.
- count -> Total de tags
- tags -> Esto es un json con toda la información de la tag es decir la lista que aparece en results
  - A esto se debe omitir la siguiente información:
    - "images" la lista que aparece, no es necesaria ya que no se utiliza.
    - "digest"
    - "content_type" Aunque se debe verificar es es siempre image (si no es image, se descarga la tag)
    - "media_type"
- fetched_at -> Esto imagino que es cuando se ha hecho la consulta, por lo que es igual, no se debe volver a hacer la consulta hasta que tenga una antigüedad superior a 24 horas.

Con esta nueva estructura, se simplifica y se reduce el número de registros.

Cuando se busca una versión, se mira si está en la caché, si se necesita recuperar más tags, se comprueba la url_next y se busca en la cache por el campo url_query si no está se hace la petición. De esta forma, se reduce las peticiones a los servidores de Docker.
Se seguiria el mismo patrón con el campo previous.

---

> Este es el ejemplo de la respuesta data por la consulta `https://hub.docker.com/v2/repositories/portainer/agent/tags?page_size=1&ordering=last_updated`

```json
{
  "count": 1729,
  "next": "https://hub.docker.com/v2/repositories/portainer/agent/tags?ordering=last_updated&page=2&page_size=1",
  "previous": null,
  "results": [
    {
      "creator": 10681195,
      "id": 623440328,
      "last_updated": "2026-07-30T04:44:13.965904Z",
      "last_updater": 10681195,
      "last_updater_username": "portainereemachine",
      "name": "alpine-sts",
      "repository": 5081717,
      "full_size": 42927662,
      "v2": true,
      "tag_status": "active",
      "tag_last_pulled": "2026-08-07T11:31:46.163535986Z",
      "tag_last_pushed": "2026-07-30T04:44:13.965904Z",
      "media_type": "application/vnd.oci.image.index.v1+json",
      "content_type": "image",
      "digest": "sha256:d57c3d57774d524f9738d07e743a2e8d3d65ea74bc2a39bc17b20ac0fd768e75",
      "images": [
        {
          "architecture": "amd64",
          "features": "",
          "variant": null,
          "digest": "sha256:1105f410abe4851da5038f32f134548fd0767dcee7407b2b8492101ae96a94e4",
          "os": "linux",
          "os_features": "",
          "os_version": null,
          "size": 42927662,
          "status": "active",
          "last_pulled": "2026-08-07T11:25:02.870293011Z",
          "last_pushed": "2026-07-30T03:38:17.367170055Z"
        },
        {
          "architecture": "unknown",
          "features": "",
          "variant": null,
          "digest": "sha256:c6ecf0f5ea9288439ce4907c44b29ea8985edd5107a1c19a051a670148144462",
          "os": "unknown",
          "os_features": "",
          "os_version": null,
          "size": 683914,
          "status": "active",
          "last_pulled": "2026-08-07T11:25:17.133218151Z",
          "last_pushed": "2026-07-30T03:38:17.964845861Z"
        },
        {
          "architecture": "arm64",
          "features": "",
          "variant": null,
          "digest": "sha256:6813971a0a8c27a7423080ba8132f2ec3146693bd33f48929bec027af4662596",
          "os": "linux",
          "os_features": "",
          "os_version": null,
          "size": 39159219,
          "status": "active",
          "last_pulled": "2026-08-07T11:25:17.780286459Z",
          "last_pushed": "2026-07-30T03:37:54.788534913Z"
        },
        {
          "architecture": "unknown",
          "features": "",
          "variant": null,
          "digest": "sha256:dbdc9b8193eeaa3c812ade5ff35975beb4281baaa24c6031cec328f4d9c2b083",
          "os": "unknown",
          "os_features": "",
          "os_version": null,
          "size": 683216,
          "status": "active",
          "last_pulled": "2026-08-07T11:30:28.054446408Z",
          "last_pushed": "2026-07-30T03:37:55.179821829Z"
        },
        {
          "architecture": "arm",
          "features": "",
          "variant": "v7",
          "digest": "sha256:01f570939f25f791de6605db3419b900072e4a75fe8bdf93891b94b704d38aed",
          "os": "linux",
          "os_features": "",
          "os_version": null,
          "size": 39709617,
          "status": "active",
          "last_pulled": "2026-08-07T11:25:19.12429423Z",
          "last_pushed": "2026-07-30T03:38:02.907996381Z"
        },
        {
          "architecture": "unknown",
          "features": "",
          "variant": null,
          "digest": "sha256:c42dd690e896899062a2ee8230f11278164d354dd0ad68d37ba8ad1c1dfb4325",
          "os": "unknown",
          "os_features": "",
          "os_version": null,
          "size": 681721,
          "status": "active",
          "last_pulled": "2026-08-07T11:25:19.777532308Z",
          "last_pushed": "2026-07-30T03:38:03.325652309Z"
        },
        {
          "architecture": "ppc64le",
          "features": "",
          "variant": null,
          "digest": "sha256:5033d4bdb68b950f79cc6a4b3d9088a0b162ca7d036f1bce717851682e954fa6",
          "os": "linux",
          "os_features": "",
          "os_version": null,
          "size": 38340957,
          "status": "active",
          "last_pulled": "2026-08-07T11:25:20.451606648Z",
          "last_pushed": "2026-07-30T03:38:21.105171436Z"
        },
        {
          "architecture": "unknown",
          "features": "",
          "variant": null,
          "digest": "sha256:bf7b53a86cf53076cae27cf3a54760d16efd99a2824c5c3bcffefbcea5fbd5a4",
          "os": "unknown",
          "os_features": "",
          "os_version": null,
          "size": 681765,
          "status": "active",
          "last_pulled": "2026-08-07T11:25:21.16645013Z",
          "last_pushed": "2026-07-30T03:38:21.717458459Z"
        }
      ]
    }
  ]
}
```

## Tareas completadas (28 jul 2026 — renombrar comandos)

**Objetivo:** Renombrar 3 comandos Tauri y actualizar sus referencias en frontend.

**Cambios:**
1. `has_pending_migrations` → `has_migrations_pending`
   - `src-tauri/src/commands/database/has_migrations_pending.rs` (nuevo archivo, función renombrada)
   - `src-tauri/src/commands/database/mod.rs` — mod + use
   - `src-tauri/src/lib.rs` — use + invoke_handler
   - `src/main.ts` — invoke call
2. `validate_sqlite_database` → `validate_database_sqlite`
   - `src-tauri/src/commands/database/validate_database_sqlite.rs` (nuevo archivo, función renombrada)
   - `src-tauri/src/commands/database/mod.rs` — mod + use
   - `src-tauri/src/lib.rs` — use + invoke_handler
   - `src/composables/useMigrations.ts` — invoke
   - `src/composables/useDatabaseSetup.ts` — 3x invoke
3. `run_migrations` → `execute_migrations`
   - `src-tauri/src/commands/database/execute_migrations.rs` (nuevo archivo, función renombrada)
   - `src-tauri/src/commands/database/mod.rs` — mod + use
   - `src-tauri/src/lib.rs` — use + invoke_handler
   - `src/composables/useMigrations.ts` — invoke
   - `src/composables/useDatabaseSetup.ts` — 2x invoke
   - `src/pages/dashboard/app/index.vue` — invoke

**Nota:** Las claves i18n (`pages.migrations.steps.*.run_migrations`) y los step IDs no se renombraron porque son identificadores de UI, no comandos Tauri.

**Resultado:** `cargo check` limpio, 0 errores.

## Tareas completadas (24 jul 2026 — refactor host_check_status)

**Objetivo:** Separar el comando `host_check_status` en dos (info estática + métricas dinámicas), eliminar columna `distribution` redundante, añadir cooldown configurable para ambos.

**Archivos modificados:**
- `src-tauri/migrations/0001_initial_schema.up.sql` — DROP COLUMN distribution + ADD status_info integrados en el CREATE TABLE (sin migración separada por regla: nueva migración solo si cambia versión)
- `src-tauri/migrations/0001_initial_schema.down.sql` — sin cambios (ya dropea todo)
- `src-tauri/src/commands/hosts/types.rs` — Host sin distribution, Host con status_info, HostSystemInfo con distribution+last_checked_at, nuevo HostStatusMetrics
- `src-tauri/src/commands/hosts/status.rs` — reescritura completa: `host_check_status` (estático, 24h cooldown) + `host_check_metrics` (dinámico, 15min cooldown)
- `src-tauri/src/commands/hosts/mod.rs` — exporta host_check_metrics
- `src-tauri/src/lib.rs` — registra host_check_metrics en invoke_handler
- `src-tauri/src/commands/ssh/connect.rs` — SELECT sin distribution, con status_info
- `src-tauri/src/commands/deployments/run/runner.rs` — igual
- `src-tauri/src/commands/passkeys/export_public_key.rs` — igual
- `src/lib/schema.ts` — regenerado por drizzle (distribution eliminado, status_info añadido)
- `src/types/tauri-types.d.ts` — regenerado por ts_rs (HostStatusMetrics, HostSystemInfo actualizado)
- `src/pages/dashboard/hosts/[id]/(view).vue` — eliminada interfaz PersistedSystemInfo, importa HostSystemInfo, distribution vía system_info.distribution

**Cooldowns (deployer_settings):**
- `hosts.system_info_cooldown_hours` → default 24
- `hosts.status_info_cooldown_minutes` → default 15

**Resultado:** `cargo check` limpio (1 warning menor: BatchSystemInfo::uname no leído), `cargo test` 87 tests OK, `bun run build` OK.

## Tareas completadas (22 jul 2026 — actualización paquetes)

1. ✅ **Tarea 2 — Epoch en versiones** — Corregido `clean_version()` en `updates.rs` para strippear el prefijo epoch (`5:29.5.2` → `29.5.2`). Versiones como `5:29.5.2 -> 5:29.6.2` ahora se clasifican correctamente como "minor".
2. ✅ **Tarea 1 — Sudo para actualizaciones** — Añadido campo `use_sudo: Option<bool>` a `HostUpdatePackagesInput`. El comando SSH se antepone con `sudo ` cuando el flag está activado. En frontend, añadido checkbox "Usar sudo" junto a los botones de actualizar (solo visible cuando hay paquetes disponibles).

## Tareas completadas (22 jul 2026)

1. ✅ **get_database_info.rs** — Simplificado: eliminada constante `APP_TABLES` hardcodeada, ahora se usan `table_name.starts_with("deployer_")` para clasificar tablas automáticamente.
2. ✅ **crud.rs:160-167** — Analizado: no se necesita cambio. La lógica existente ya maneja correctamente valores `ENC:` (los descifra si `should_encrypt` es false, los deja intactos si es true).

Cosas que no funcionan correctamente

1. ✅ Botón de comprobar actualizaciones — resuelto con lógica completa n8n (clasificación major/minor/patch, seguridad, prioridad, tabla con botón individual y confirmación).
2. ✅ Botón comprobar estado — la información se limpia al iniciar cualquier operación (statusInfo.value = null en checkStatus).
3. ✅ Comando estado del servidor — se añadieron campos cpu_cores, memory_total, disk_total, os_release a HostSystemInfo para persistir arquitectura y datos estáticos.

Notas:

1. ✅ Al entrar en un servidor se muestra la información estática del servidor (RAM total, disco total, CPUs, SO, versión, kernel, arquitectura) desde los datos persistidos en BD.
2. ✅ El botón de comprobar actualizaciones está deshabilitado hasta que se haya pulsado "Comprobar estado" (detección de package_manager).
3. ✅ Separada la información del servidor (estática: hardware, SO) del estado (dinámico: uptime, uso de memoria, uso de disco).



> Este es un código que tengo en un flujo n8n para formatear la salida del comando:
```bash
apt list --upgradable 2>/dev/null && echo '---OS---' && cat /etc/os-release
```
```javascript
const raw = $input.first().json.stdout.split('\n');

// separar bloques
const separatorIndex = raw.findIndex(line => line.includes('---OS---'));

const packageLines = raw.slice(0, separatorIndex);
const osLines = raw.slice(separatorIndex + 1);

// parsear OS
const osInfo = {};
osLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    osInfo[key] = value.replace(/"/g, '');
  }
});

// limpiar versión (quitar sufijos debian)
function cleanVersion(v) {
  return v ? v.split('-')[0] : v;
}

// clasificar update
function classifyUpdate(current, next) {
  if (!current || !next) return "unknown";

  const c = current.split('.').map(Number);
  const n = next.split('.').map(Number);

  if (n[0] > c[0]) return "major";
  if (n[1] > c[1]) return "minor";
  if (n[2] > c[2]) return "patch";

  return "unknown";
}

function getPriority(type, isSecurity) {
  if (isSecurity) return "high";
  if (type === "major") return "high";
  if (type === "minor") return "medium";
  return "low";
}

// parsear paquetes
const packages = packageLines
  .filter(line => line && !line.startsWith("Listing"))
  .map(line => {
    const parts = line.split(' ');

    const name = parts[0].split('/')[0];
    const repo = parts[0].split('/')[1];
    const new_version_raw = parts[1];

    const match = line.match(/\[upgradable from: ([^\]]+)\]/);
    const current_version_raw = match ? match[1] : null;

    const new_version = cleanVersion(new_version_raw);
    const current_version = cleanVersion(current_version_raw);

    const type = classifyUpdate(current_version, new_version);
    const isSecurity = repo?.toLowerCase().includes("security");
    const priority = getPriority(type, isSecurity);

    return {
      name,
      current_version,
      new_version,
      type,
      isSecurity,
      priority
    };
  });

// cortar si no hay updates
if (packages.length === 0) return [];

// resumen
const summary = {
  total: packages.length,
  security: packages.filter(p => p.isSecurity).length,
  major: packages.filter(p => p.type === "major").length,
  minor: packages.filter(p => p.type === "minor").length,
  patch: packages.filter(p => p.type === "patch").length
};

// etiquetas
const labels = {
  major: "🔴 Major",
  minor: "🟡 Minor",
  patch: "🟢 Patch",
  unknown: "⚪"
};

// HTML
const html = `
<h2>Servidor: ${osInfo.PRETTY_NAME}</h2>

<p>
<strong>Total:</strong> ${summary.total} |
🔐 Seguridad: ${summary.security} |
🔴 Major: ${summary.major} |
🟡 Minor: ${summary.minor} |
🟢 Patch: ${summary.patch}
</p>

<table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
  <tr>
    <th>Paquete</th>
    <th>Actual</th>
    <th>Nueva</th>
    <th>Tipo</th>
  </tr>
  ${packages.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.current_version}</td>
      <td><strong>${p.new_version}</strong></td>
      <td>${p.isSecurity ? "🔐 Seguridad" : labels[p.type]}</td>
    </tr>
  `).join('')}
</table>
`;

return [
  {
    json: {
      os: osInfo,
      summary,
      packages,
      html
    }
  }
];
```
