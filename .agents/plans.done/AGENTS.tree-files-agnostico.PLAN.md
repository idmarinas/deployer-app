# Plan: Componentes de archivos (TreeFiles) agnósticos y reutilizables

## Estado

**Ejecutando**

---

## Instrucciones dadas (verbatim)

> Extraído de `AGENTS.todo.md` (tarea 1 de `### Tareas`):
>
> 1. El componente ComposeTreeFilesUpload junto con DockerComposeTreeFilePicker ¿se pueden hacer agnosticos? más reutilizable, para otras partes. Donde se necesiten guardar y editar archivos.
>    1. La idea es que la forma de guardar los archivos en la BD sea igual, independientemente del módulo que los usa.
>       1. Por ejemplo:
>          1. Actualmente solo Docker Compose usa archivos, pero en un futuro puede que otros modulos puedan usarlos.
>          2. La idea es que la estructura base de la tabla (y lo que el TreeFilePicker maneja) sean iguales para todos. De esta forma con un solo componente podemos reutilizarlo en varios módulos.
>          3. La taba en la BD es independiente por módulo, es decir, docker compose tiene su propia tabla para los archivos, y cualquier otro mídulo tendria su propia tabla para los archivos.
>
>    2. Se deben renombrar los componentes vue, para algo más genérico y que no hagan referencia a compose.
>    3. Recuerda estos componentes se van a usar, tanto para editar archivos, subirlos como para solo verlos. Por lo que la parte de subir archivos, tiene que ser opcional y ponerlo solo cuando se necesite subir archivos, y la parte de editar igual.
>    4. Se debe definir la estructura base para las tablas de archivos.
>       1. Actualmente es:
>
>       ```sql
>       CREATE TABLE deployer_docker_compose_files (
>          id INTEGER CONSTRAINT deployer_docker_compose_files_pk PRIMARY KEY AUTOINCREMENT,
>          docker_compose_id INTEGER NOT NULL CONSTRAINT deployer_docker_compose_files_fk_compose_id REFERENCES deployer_docker_composes (id) ON DELETE CASCADE,
>          file_path TEXT NOT NULL,
>          content TEXT,
>          is_binary BOOLEAN NOT NULL DEFAULT 0,
>          metadata TEXT,
>          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
>          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
>       );
>       ```
>
>       Tomo como referencia la tabla de archivos de docker_compose puesto que es la que hay actualmente que usa archivos.
>       La información se puede obtener de la clase File que devuelve el webkit, esto evitar el tener que poner el metadata. ya que toda la información se guardaría.
>
>       - Estructura propuesta:
>         - id: autoincrement
>         - module_id: faltaba el id al módulo al que hace referencia. En el caso de Docker Compose, sería al id de la tabla deployer_docker_composes (buscar un mejor nombre y que sea igual para todos, y que repesente lo que es, para evitar tener que hacer cambios en los componentes)
>         - file_path: la ruta del archivo, tal y como es ahora.
>         - content: el contenido del archivo.
>         - is_binary: indicando si el archivo es binario o no (esto imagino que es por las imágenes para guardarlas en formato base64)
>         - name: es el nombre del archivo, incluyendo la extensión (solo el nombre, no se incluye la ruta)
>         - mime_type: el tipo de archivo (text, image...)
>         - size: el tamaño que tiene el archivo. (que se debe actualizar cuando se editar el contenido del archivo. y es el tamaño original del contenido antes del encodeBase64)
>         - last_modified: fecha de la última modificación
>         - webkit_relative_path: la ruta relativa devuelta por webkit.
>         - icon: el icono resuelto para el archivo (que se mostrará el el TreeFiles)
>         - create_at: igual que ahora
>         - updated_at: igual que ahora

---

## Resumen

Refactorizar los componentes de archivos de Docker Compose (`ComposeTreeFilesUpload.vue`,
`DockerComposeTreeFilePicker.vue`, `TreeFilesViewer.vue`, `ReviewComposeFilesDialog.vue` y la
lib `src/lib/docker-compose/files.ts`) para que sean **agnósticos y reutilizables** por cualquier
módulo que necesite guardar/editar/ver archivos.

Cambios clave de las instrucciones:

- **Renombrar los componentes Vue** a nombres genéricos que no hagan referencia a "compose".
- **Tres modos de uso** en el mismo componente: subir archivos, editar archivos y **solo verlos**.
  Las partes de subir y editar son **opcionales** y solo se muestran cuando se activan.
- **Columna FK genérica `module_id`** (misma para todos los módulos), en lugar de
  `docker_compose_id`, para que los componentes no tengan que cambiar por módulo.

Se define una **estructura base común** para las tablas de archivos (una por módulo, p.ej.
`deployer_docker_compose_files`) donde la información que hoy vive en el JSON de `metadata`
(name, mime_type, size, last_modified, webkit_relative_path, icon) pasa a **columnas reales**,
obtenidas directamente de la clase `File` que devuelve webkit. Así el mismo componente (y el
mismo formato de persistencia) sirve para Docker Compose y para cualquier módulo futuro.

## Estado actual (análisis)

| Pieza | Ubicación | Acoplamiento a Compose |
| --- | --- | --- |
| `ComposeTreeFilesUpload.vue` | `src/components/form/inputs/docker-compose/` | Alto: `isComposeFile`, `isMainComposeFile`, `isEnvFilePath`, editor Compose (`FileEditComposeEditor`), editor env (`FileEditEnvEditor`), alerta "compose_missing", creación de `compose.yaml`, i18n `form.docker_composes.files.*` |
| `DockerComposeTreeFilePicker.vue` | idem | Alto: `isComposeFile`, `isExcludedComposeFileType`, `isIgnoredComposeDir`, `MAX_COMPOSE_FILE_SIZE`, `IGNORED_DIRS`, `useReviewComposeFilesDialog` |
| `TreeFilesViewer.vue` | `src/components/view/` | Medio: badges compose (`isComposeFile`/`isMainComposeFile`), botón crear compose, i18n `form.docker_composes.files.*` |
| `ReviewComposeFilesDialog.vue` | `src/components/overlay/forms/` | Medio: acción `'compose'`, `IGNORED_DIRS`, clave `form.docker_composes.files.ignored_dirs_note` |
| `CreateFileDialog.vue` | `src/components/overlay/forms/` | Bajo: solo usa claves i18n `form.docker_composes.files.*` |
| `useDialog.ts` | `src/composables/` | `useReviewComposeFilesDialog` |
| `src/lib/docker-compose/files.ts` | lib | Mixto: helpers genéricos (`getFileIcon`, `detectBinary`, `buildFileMetadata`, `getUploadRelativePath`, `parse/serializeFileMetadata`, iconos) + específicos de compose (`isComposeFile`, `isMainComposeFile`, `isEnvFilePath`, `IGNORED_DIRS`, `EXCLUDED_EXTENSIONS`, `MAX_COMPOSE_FILE_SIZE`) |

**Backend (Rust):**

- Tabla `deployer_docker_compose_files` (migración `0001`, versión 0.1.0): `id, docker_compose_id, file_path, content, is_binary, metadata, created_at, updated_at`.
- Entidad `DockerComposeFile` + inputs (`files_types.rs`) → `src/types/tauri-types.d.ts` vía `ts_rs` (`#[ts(export)]`).
- Comandos en `files_commands.rs`: `sync_docker_compose_files` (único usado por el frontend), `upload_compose_files`, `create_compose_file`, `delete_compose_file`, `update_compose_file` (**ninguno de los 4 últimos se invoca desde `src/`** — código muerto).
- `operations.rs` usa solo `file_path`, `content`, `is_binary` de `DockerComposeFile` → no afectado por añadir columnas.

**Frontend (lecturas Drizzle + páginas):**

- `src/loaders/docker_composes.ts` selecciona `file_path, content, is_binary, metadata`.
- `add.vue` / `edit.vue` construyen `ComposeFileInput[]` y llaman a `sync_docker_compose_files`.
- `(view).vue` usa `parseFileMetadata`/`getFileIcon`/`isEnvFilePath` para mostrar archivos.

---

## Decisiones tomadas

| Decisión | Elección | Razón |
| --- | --- | --- |
| ¿Dónde vive la estructura base? | Columnas reales en BD, **sin `metadata`** | La tarea pide sustituir el metadata por la información de la clase `File` de webkit. La columna `metadata` se elimina (`DROP COLUMN`, SQLite bundled ≥ 3.35). |
| Nombre de la FK a la tabla del módulo | **`module_id`** (mismo nombre en todos los módulos) | Punto 1 del enunciado: nombre genérico, igual para todos y representativo, para no tocar los componentes. Alternativas descartadas: `owner_id`, `parent_id`, `entity_id`. En compose se renombra `docker_compose_id → module_id`. |
| `name` | `TEXT NOT NULL DEFAULT ''` + backfill | Integridad; la app siempre lo aporta. El `DEFAULT ''` evita romper filas existentes en el ADD COLUMN. |
| `last_modified` / `size` | `INTEGER` (epoch ms / bytes) | `File.lastModified` y `File.size` son números; `size` = tamaño **antes** de codificar a base64. |
| Comandos backend no usados | Eliminar `upload_compose_files`, `create_compose_file`, `delete_compose_file`, `update_compose_file` | Código muerto desde el frontend; se mantiene solo `sync_docker_compose_files`. Reduce superficie a mantener. |
| Persistencia por módulo | Cada módulo mantiene su tabla y su comando `sync_*` propio (patrón documentado) | El componente es agnóstico y trabaja sobre la lista en memoria (`ManagedFile[]`); el módulo persiste con su propio sync. Evita SQL dinámico/inyección de nombre de tabla. |
| Renombrado de componentes | `ComposeTreeFilesUpload.vue` → `src/components/form/files/TreeFiles.vue`; `DockerComposeTreeFilePicker.vue` → `src/components/form/files/TreeFilePicker.vue`; `ReviewComposeFilesDialog.vue` → `src/components/overlay/forms/ReviewFilesDialog.vue`; `TreeFilesViewer.vue` se genérica en su sitio (nombre ya genérico); `useReviewComposeFilesDialog` → `useReviewFilesDialog`; `CreateFileDialog.vue` ya es genérico | Punto 2 de las instrucciones: nada debe referenciar a "compose" salvo el wrapper específico de compose. |
| Modos de uso (ver / editar / subir) | `TreeFiles` con props `canUpload` y `canEdit` (ambas opcionales): subida y edición solo se renderizan cuando se activan; con ambas `false` se comporta como **solo ver** | Punto 3 de las instrucciones: un solo componente reutilizable para las tres necesidades. |
| Componentes genéricos | Nueva carpeta `src/components/form/files/` | Separa lo reutilizable de lo específico de compose. |
| Config del picker | Prop `config: TreeFilesConfig` (`maxFileSize`, `excludedExtensions`, `ignoredDirs`) | Hoy esos valores son de compose (`MAX_COMPOSE_FILE_SIZE`, `EXCLUDED_EXTENSIONS`, `IGNORED_DIRS`); pasan a ser configurables. |
| Editor por tipo | Slot `#editor` + defaults genéricos (textarea/imagen/binario) | El editor de compose/env y las protecciones (`isMainComposeFile`) las pone el wrapper de compose. |
| Lib | `src/lib/files.ts` (genérico) + `src/lib/docker-compose/files.ts` (solo compose) | Mantiene el núcleo agnóstico, sin imports de compose. |
| Migración | Editar `0001_initial_schema.up.sql`/`.down.sql` **en sitio** (la versión sigue en `0.1.0`); **sin** bump de versión ni archivo `0002` | Regla de AGENTS.md: solo se genera una migración nueva si cambia la versión. Como sigue en `0.1.0`, los cambios de esquema van en la migración de esa versión (0001). ⚠️ El plan `AGENTS.custom-tables` propone `0002_custom_tables`; debe aplicar la misma regla de versión (coordinar el archivo 0001). |

### Decisiones confirmadas

1. ✅ Eliminar `metadata` de la tabla (en la migración inicial).
2. ✅ Eliminar los 4 comandos backend no usados: `upload_compose_files`, `create_compose_file`, `delete_compose_file`, `update_compose_file`.
3. `name` se deduce de `file_path` cuando falta (la app siempre lo genera).
4. ✅ Renombrar los componentes Vue a nombres genéricos (sin "compose") — punto 2 de las instrucciones.
5. ✅ Subida y edición opcionales (props `canUpload`/`canEdit`) — punto 3 de las instrucciones.
6. ✅ Columna FK genérica `module_id` (igual para todos los módulos) — estructura propuesta.
7. ✅ Migración editada **en sitio** en `0001` (la versión sigue en `0.1.0`): sin bump ni archivo `0002`.

### Preguntas abiertas (confirmar al cerrar la planificación)

- Ninguna de las decisiones de arquitectura quedó abierta; el resto de detalles de la implementación se resuelven siguiendo los patrones existentes del proyecto.

---

## Estructura base de las tablas de archivos

Cualquier módulo que quiera archivos crea su tabla con esta base. La columna FK se llama
**`module_id`** en todos los módulos (punto 1 de las instrucciones) para que los componentes
no tengan que cambiar por módulo:

```sql
CREATE TABLE deployer_<modulo>_files (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id            INTEGER NOT NULL REFERENCES deployer_<modulos> (id) ON DELETE CASCADE,
    file_path            TEXT NOT NULL,
    content              TEXT,
    is_binary            BOOLEAN NOT NULL DEFAULT 0,
    name                 TEXT NOT NULL,
    mime_type            TEXT,
    size                 INTEGER,
    last_modified        INTEGER,
    webkit_relative_path TEXT,
    icon                 TEXT,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX deployer_<modulo>_files_idx_module_id ON deployer_<modulo>_files (module_id);
CREATE INDEX deployer_<modulo>_files_idx_file_path ON deployer_<modulo>_files (file_path);
CREATE INDEX deployer_<modulo>_files_idx_name ON deployer_<modulo>_files (name);

CREATE TRIGGER deployer_<modulo>_files_trg_set_updated_at
AFTER UPDATE ON deployer_<modulo>_files
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE deployer_<modulo>_files SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
```

| Campo | Origen | Notas |
| --- | --- | --- |
| `module_id` | id del registro propietario | Mismo nombre en todos los módulos (compose: `deployer_docker_composes.id`) |
| `file_path` | `getUploadRelativePath(file)` / ruta creada | Ruta relativa dentro del módulo |
| `content` | `file.text()` o base64 | Binario se guarda en base64 |
| `is_binary` | `detectBinary(file)` | |
| `name` | `file.name` | Solo nombre + extensión |
| `mime_type` | `file.type` | |
| `size` | `file.size` | Tamaño original (antes del base64); se recalcula al editar contenido |
| `last_modified` | `file.lastModified` | Epoch ms |
| `webkit_relative_path` | `file.webkitRelativePath` | Ruta devuelta por webkit |
| `icon` | `getFileIcon(...)` | Icono mostrado en el árbol |

---

## FASE 1: Migración SQL

- **Sin bump de versión**: la versión sigue en `0.1.0` (Cargo.toml, tauri.conf.json, package.json). Por la regla de AGENTS.md, mientras la versión no cambie los cambios de esquema se editan **en sitio** en la migración de esa versión.
- Editar `src-tauri/migrations/0001_initial_schema.up.sql` (cabecera `-- Version: 0.1.0`): reescribir `deployer_docker_compose_files` con la estructura base final (FK `module_id` + columnas nuevas, sin `metadata`) y ajustar sus índices. El trigger `..._trg_set_updated_at` no cambia.
- Editar `0001_initial_schema.down.sql` acorde (borra la tabla; sin cambios relevantes).
- Al ser la migración inicial, la tabla se escribe directamente con la estructura final:

```sql
CREATE TABLE deployer_docker_compose_files (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id            INTEGER NOT NULL CONSTRAINT deployer_docker_compose_files_fk_module_id REFERENCES deployer_docker_composes (id) ON DELETE CASCADE,
    file_path            TEXT NOT NULL,
    content              TEXT,
    is_binary            BOOLEAN NOT NULL DEFAULT 0,
    name                 TEXT NOT NULL,
    mime_type            TEXT,
    size                 INTEGER,
    last_modified        INTEGER,
    webkit_relative_path TEXT,
    icon                 TEXT,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX deployer_docker_compose_files_idx_module_id ON deployer_docker_compose_files (module_id);
CREATE INDEX deployer_docker_compose_files_idx_file_path ON deployer_docker_compose_files (file_path);
CREATE INDEX deployer_docker_compose_files_idx_name ON deployer_docker_compose_files (name);
```

- ⚠️ Al ser la migración inicial, el cambio solo afecta a BDs recién creadas. Válido porque la app está en `0.1.0` (pre-release) y `dev:db:generate` recrea la BD desde cero.

- Regenerar Drizzle: `bun run dev:db:generate` (recrea `src/lib/schema.ts` y `src/lib/relations.ts`). No editar esos archivos a mano.

## FASE 2: Backend Rust

### `src-tauri/src/commands/docker/compose/files_types.rs`

- `DockerComposeFile`: renombrar el campo `docker_compose_id` → **`module_id`** (columna que la migración inicial crea ya con ese nombre) y añadir campos nuevos: `name: String`, `mime_type: Option<String>`, `size: Option<i64>`, `last_modified: Option<i64>`, `webkit_relative_path: Option<String>`, `icon: Option<String>`. Eliminar `metadata`.
- `ComposeFileInput` (usado por sync): mismos campos nuevos (`name` requerido; resto opcionales). No lleva `module_id` (se pasa en `SyncDockerComposeFilesInput`).
- Eliminar `CreateDockerComposeFileInput`, `UpdateDockerComposeFileInput`, `DeleteDockerComposeFileInput`, `UploadComposeFilesInput` (quedan huérfanos al eliminar los comandos).
- `SyncDockerComposeFilesInput`: renombrar `docker_compose_id` → `module_id`.

### `src-tauri/src/commands/docker/compose/files_commands.rs`

- `sync_docker_compose_files`: renombrar `docker_compose_id` → `module_id` en las consultas SQL y binds; INSERT/UPDATE/SELECT con las columnas nuevas (`file_path, content, is_binary, name, mime_type, size, last_modified, webkit_relative_path, icon`).
- Eliminar `upload_compose_files`, `create_compose_file`, `delete_compose_file`, `update_compose_file` y sus imports.

### Registro

- `src-tauri/src/commands/docker/compose/mod.rs` y `src-tauri/src/lib.rs`: quitar los comandos eliminados del `use` y del `invoke_handler`.

### Tipos TS

- Regenerar `src/types/tauri-types.d.ts` compilando el crate (`cargo check` / `cargo build` regenera los `#[ts(export)]`; controlar con `TS_RS_EXPORT_DIR=../src/types` según el flujo habitual).

## FASE 3: Librería genérica `src/lib/files.ts` (nuevo)

Mover aquí lo agnóstico de `src/lib/docker-compose/files.ts`:

- `ManagedFile` (interfaz del modelo de archivo, alineada con la tabla base):

  ```ts
  export interface ManagedFile {
    id?: number
    file_path: string
    content?: string | null
    is_binary: boolean
    name: string
    mime_type?: string | null
    size?: number | null
    last_modified?: number | null
    webkit_relative_path?: string | null
    icon?: string | null
  }
  ```

- `TreeNode`/`FolderTreeNode`/`FileNode` (tipos de nodo del árbol) + `buildTree`/ordenación (mover la lógica de `ComposeTreeFilesUpload`).
- `getUploadRelativePath(file)`, `detectBinary(file)`, `buildManagedFile(file): Omit<ManagedFile,'id'>` (rellena todos los campos desde `File`), `getFileIcon(entry | {name,mime_type,is_binary,icon})`, `isImageEntry(entry)`, `getImageMimeType(entry)`, `isBinaryMimeType`, tablas `TEXT_EXTENSIONS`/`IMAGE_EXTENSIONS`/`IMAGE_MIME_TYPES`, `iconForExtension`/`iconForName`, `byteSize(content)` (para recalcular `size` al editar texto).
- `TreeFilesConfig` (config del picker): `{ maxFileSize?: number; excludedExtensions?: string[]; ignoredDirs?: string[] }`.

`src/lib/docker-compose/files.ts` queda solo con lo específico: `isComposeFile`, `isMainComposeFile`, `isSecondaryComposeFile`, `isEnvFilePath`, `isIgnoredComposeDir`, `isExcludedComposeFileType`, `IGNORED_DIRS`, `EXCLUDED_EXTENSIONS`, `MAX_COMPOSE_FILE_SIZE` (este último reutilizado como default del config del wrapper).

## FASE 4: Componentes genéricos (`src/components/form/files/`)

### Arquitectura: un componente, tres modos

`TreeFiles.vue` es el componente raíz reutilizable. **La subida y la edición son opcionales**
(punto 3 de las instrucciones) mediante dos props booleanas; con ambas `false` se comporta como
**solo ver** (el mismo componente que usará la página de vista del compose):

- `canUpload?: boolean` (default `true`) → renderiza el picker de subida (`TreeFilePicker`) y el diálogo de revisión.
- `canEdit?: boolean` (default `true`) → renderiza el panel de edición de contenido.
- `canCreateFile?: boolean` (default `true`) → botón "nuevo archivo" y crear en carpeta (del viewer).
- Solo ver → `canUpload=false, canEdit=false, canCreateFile=false`.

`TreeFiles` interna el árbol con `TreeFilesViewer` (view) y compone el resto de piezas de forma condicional.

### `TreeFilePicker.vue` (← `DockerComposeTreeFilePicker.vue`)

- Props: `existingPaths: string[]`, `config?: TreeFilesConfig`.
- Emits: `files-selected: ManagedFile[]`.
- Lógica: drag&drop + selección de archivo/carpeta, filtros (`maxFileSize`, `excludedExtensions`, `ignoredDirs`), lectura (texto / base64), `buildManagedFile` para rellenar todos los campos, review dialog genérico (`useReviewFilesDialog`).
- i18n genérica `form.files.*`.

### `TreeFiles.vue` (← `ComposeTreeFilesUpload.vue`)

- Props: `modelValue: ManagedFile[]`, `class?`, `config?: TreeFilesConfig`, `canUpload?`, `canEdit?`, `canCreateFile?`, `isProtectedFile?: (entry: ManagedFile) => boolean` (el wrapper de compose lo usa para el compose.yaml principal).
- Emits: `update:modelValue`.
- Slots: `#badges="{ entry }"` (badges junto a la ruta del archivo seleccionado), `#editor="{ entry }"` (editor de contenido; `v-model` ya lo gestiona el componente vía `selectedContent`) y `#actions` (cabecera del viewer).
- Comportamiento (heredado, sin lógica de compose): árbol ordenado, selección, expansión, edición de contenido (al editar texto se recalcula `size`), crear archivo (dialog), eliminar (respetando `isProtectedFile`), vista previa de imagen, alerta de binario, textarea por defecto, placeholder de "selecciona un archivo". Upload/editor/crear solo visibles según `canUpload`/`canEdit`/`canCreateFile`.

### `TreeFilesViewer.vue` (genéricar `src/components/view/`)

- Props: `items`, `onCreateFile`, `canCreateFile?`.
- Slots: `#actions` (cabecera; compose mete el botón docker de crear compose.yaml), `#badges="{ item }"` (trailing de archivos; compose mete los badges principal/secundario), mantiene `#folder-trailing` por defecto (chevron + crear archivo en carpeta).
- Quitar: `canCreateCompose`, `create-compose`, badges compose, i18n compose.

### `ReviewFilesDialog.vue` (← `ReviewComposeFilesDialog.vue`)

- Mover a `src/components/overlay/forms/ReviewFilesDialog.vue`.
- `ReviewFileItem { path, size, icon?, reason: 'size' | 'type' | null }` (eliminar `isCompose`/acción `'compose'`).
- `ignoredDirs` como prop opcional (para la nota) en vez de importar `IGNORED_DIRS`.
- i18n `overlays.dialog.files_review.*` + nota genérica (mover `ignored_dirs_note` de `form.docker_composes.files.*`).

### `useDialog.ts`

- `useReviewFilesDialog(options: { items, existingPaths, ignoredDirs? })` genérica (reemplaza `useReviewComposeFilesDialog`).

### `CreateFileDialog.vue`

- Cambiar claves i18n de `form.docker_composes.files.*` a `form.files.*`.

## FASE 5: Wrapper Docker Compose

`src/components/form/inputs/docker-compose/ComposeTreeFilesUpload.vue` → **wrapper fino**:

- `<TreeFiles v-model="state.files" :config="{ maxFileSize: MAX_COMPOSE_FILE_SIZE, excludedExtensions: [...EXCLUDED_EXTENSIONS], ignoredDirs: [...IGNORED_DIRS] }" :is-protected-file="f => isMainComposeFile(f.file_path)">` (formulario: `canUpload` y `canEdit` activos).
- `#badges`: compose principal/secundario, imagen, binario, env (claves `form.docker_composes.files.*`).
- `#editor`: `FileEditComposeEditor` / `FileEditEnvEditor` según tipo; el resto lo resuelve el genérico.
- Alerta `compose_missing` (UAlert) y botón "crear compose.yaml" en `#actions` del viewer.
- **Página de solo ver** (`(view).vue`): usar el mismo `TreeFiles` con `:can-upload="false" :can-edit="false" :can-create-file="false"` y los mismos slots `#badges` (sin `#editor`) — punto 3 de las instrucciones. Reemplaza el uso directo de `TreeFilesViewer`.
- Eliminar `DockerComposeTreeFilePicker.vue` (su lógica vive ahora en `TreeFilePicker.vue`).

`DockerComposeForm.vue`: tipo de `state.files` = `ManagedFile[]` (o `ComposeFileEntry` si se conserva como alias).

## FASE 6: i18n

Nueva sección genérica `form.files.*` en `src/locales/es/form/files.ts` (o dentro de `form/index.ts`):

- `label`, `upload`, `upload_folder`, `confirm`, `review`, `cancel`, `file_count`, `text_content`, `create_file`, `create_file_title`, `create_file_hint`, `file_path`, `file_path_in_folder`, `new_file_placeholder`, `already_exists`, `invalid_path`, `edit`, `delete`, `empty`, `select_hint`, `binary`, `image_label`, `binary_hint`, `discarded_size`, `discarded_type`, `discarded_files`, `ignored_dirs_note`, `create_success`, `delete_success`, `update_success`, `create.not_empty`.

Secciones `form.docker_composes.files.*` (se mantienen, solo lo específico): `compose_label`, `principal`, `secondary`, `env_label`, `env_add`, `create_compose`, `compose_missing`, `compose_missing_hint`, `create.compose_already_exists`.

- Regenerar `typed-locale.d.ts`: `bun run i18n:types`.

## FASE 7: Loaders, tipos y páginas

- `src/loaders/docker_composes.ts`: añadir `name, mime_type, size, last_modified, webkit_relative_path, icon` al SELECT y al tipo `files`; `docker_compose_id` → `module_id` (columna con ese nombre tras la migración).
- `add.vue` / `edit.vue`: al construir `ComposeFileInput[]` incluir `name` y los campos nuevos (ya no `metadata`).
- `(view).vue`: sustituir `parseFileMetadata`/`getFileIcon(metadata)` por los campos nuevos (`entry.icon`, `entry.size`, `entry.mime_type`), `isImageEntry`/`getImageMimeType` de la lib genérica y usar `TreeFiles` en modo solo ver (o el wrapper de compose en modo view).
- `index.vue`: no requiere cambios (solo usa `file_path`/`content`).

## FASE 8: Verificación

- `bun run dev:db:generate` (regenera schema Drizzle).
- `cargo check` / `cargo build` (backend + regenera `tauri-types.d.ts`).
- `bun run i18n:types` (regenera `typed-locale.d.ts`).
- `bun test` (si aplica a estas utilidades; revisar).
- `bun run build` (`vue-tsc --noEmit` + `vite build`).

---

## Orden de implementación

| # | Paso | Depende de |
| --- | --- | --- |
| 1 | Migración SQL: editar `0001` en sitio (FK `module_id` + columnas base nuevas), sin bump de versión | — |
| 2 | Regenerar Drizzle (`bun run dev:db:generate`) | 1 |
| 3 | Backend: `files_types.rs`, `files_commands.rs`, quitar comandos muertos, `mod.rs`/`lib.rs` | 1 |
| 4 | Regenerar `tauri-types.d.ts` (cargo check) | 3 |
| 5 | `src/lib/files.ts` (genérico) + reducir `docker-compose/files.ts` | — |
| 6 | Componentes genéricos: `TreeFilePicker`, `TreeFiles`, `TreeFilesViewer`, `ReviewFilesDialog`, `useDialog`, `CreateFileDialog` | 5 |
| 7 | Wrapper compose + `DockerComposeForm` + eliminar `DockerComposeTreeFilePicker.vue` | 6 |
| 8 | i18n (`form.files.*`, reducir compose) + `bun run i18n:types` | 6 |
| 9 | Loaders + `add.vue`/`edit.vue`/`(view).vue` | 4, 8 |
| 10 | Verificación completa (build, cargo, i18n) | 1-9 |

---

## Notas importantes / Gotchas

- **`metadata` se elimina**: toda la información pasa a columnas. En el runtime, los archivos nuevos se construyen con `buildManagedFile(file)`.
- **`docker_compose_id` → `module_id`**: al ser la migración inicial, la tabla se crea directamente con `module_id` (no hay `RENAME COLUMN`). El cambio se propaga a todo el stack (Rust, Drizzle, loaders, sync).
- **Editar `0001` en sitio**: válido solo mientras la versión no cambie (app en `0.1.0`, pre-release, y `dev:db:generate` recrea la BD desde cero). Tras publicar una versión, los cambios de esquema deben ir en una migración nueva con bump de versión.
- **`size` al editar**: al modificar el contenido de un texto se recalcula `size` (bytes del nuevo contenido). Para binarios, `size` es el tamaño original (antes del base64).
- **Subida/edición opcionales**: `TreeFiles` solo renderiza el picker (con `canUpload`), el editor (con `canEdit`) y el crear archivo (con `canCreateFile`). En modo solo ver, los tres desactivados.
- **Drag & drop / Sortable**: no aplica a estos componentes (usamos input `webkitdirectory`); si se reordenan, recordar `forceFallback: true` (AGENTS.md).
- **Pinia Colada**: si el wrapper usa loaders, `data` es `shallowRef` — reasignar `.value` completo, no mutar.
- **Vite ignora `src-tauri/`**: los cambios en Rust requieren rebuild explícito.
- **No editar archivos autogenerados**: `src/lib/schema.ts`, `src/lib/relations.ts`, `src/types/tauri-types.d.ts`, `typed-locale.d.ts`.
- **Coordinación con `AGENTS.custom-tables.PLAN.md`**: este plan no crea `0002`. El plan custom-tables propone `0002_custom_tables`; si la versión sigue en `0.1.0`, debe aplicar la misma regla (editar `0001` en sitio) — coordinar para no pisarse en el archivo 0001.
- **Eliminar código muerto**: al refactorizar, buscar referencias a `parseFileMetadata`, `serializeFileMetadata`, `createFileMetadata`, `buildFileMetadata`, `FileMetadata`, a los 4 comandos backend eliminados y a los componentes renombrados para no dejar huérfanos.
