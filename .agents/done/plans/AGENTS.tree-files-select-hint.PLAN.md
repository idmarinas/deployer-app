# Plan: Mensajes informativos del selector de archivos (TreeFiles / ComposeTreeFilesUpload)

## Estado

**Completado**

---

## Instrucciones dadas (verbatim)

> Extraído de `AGENTS.todo.md` (tareas 1 y 2 de `### Tareas`):
>
> 1. Componente ComposeTreeFileUpload
>    1. La alerta de : "Falta el archivo compose.yaml principal Crea un archivo compose.yaml en la raíz para poder guardar el docker compose." deberia aparecer sustituyendo el cuadro de "Selecciona un archivo para editarlo"
> 2. El componente TreeFile
>    1. El mensaje de "Selecciona un archivo para editarlo" es poco informativo segun la situación.
>    2. Si se permite editar archivos, esta bien, pero que pasa si no se permiten editar archivos?
>    3. Y en caso de que no se puedan ni subir ni editar los archivos, solo verlos? la idea es que se pueda ver su contenido, una vista previa. ese mensaje no es correcto.
>    4. ¿Y que pasa si no hay archivos? no se puede seleccionar un archivo para editarlo, porque no hay, el texto no tiene sentido.
>    5. Propuesta:
>       1. No hay archivos:
>          1. Tener mensajes según la convinación de los 3 supuestos:
>             1. Editar
>             2. Subir
>             3. Crear
>       2. Hay archivos:
>          1. Tener mensajes según la convinación de los 3 supuestos:
>             1. Editar
>             2. Subir
>             3. Crear
>       3. Convinaciones posibles:
>          1. Convinación 1:
>             1. Editar: No
>             2. Subir: No
>             3. Crear: No
>          2. Convinación 2:
>             1. Editar: No
>             2. Subir: No
>             3. Crear: Sí
>          3. Convinación 2:
>             1. Editar: No
>             2. Subir: Sí
>             3. Crear: Sí
>          4. Convinación 2:
>             1. Editar: Sí
>             2. Subir: Sí
>             3. Crear: No
>          5. Convinación 2:
>             1. Editar: Sí
>             2. Subir: No
>             3. Crear: No
>          6. Convinación 2:
>             1. Editar: No
>             2. Subir: Sí
>             3. Crear: No
>          7. Convinación 3:
>             1. Editar: Sí
>             2. Subir: Sí
>             3. Crear: Sí
>          8. Creo que están todas las convinaciones posibles, sino, tenlas en cuenta, la mayor parte podrán tener el mismo mensaje. Pero que se tengan en cuenta.

---

## Resumen

Dos tareas sobre el mismo sistema (el **placeholder de "no hay archivo seleccionado"** en los componentes de archivos), por eso se agrupan en un único plan:

1. **Alerta de compose faltante**: en `ComposeTreeFilesUpload.vue`, la alerta "Falta el archivo compose.yaml principal / Crea un archivo compose.yaml en la raíz para poder guardar el docker compose." debe aparecer **sustituyendo** el cuadro de "Selecciona un archivo para editarlo", en vez de flotar debajo del árbol.
2. **Mensaje informativo según la situación**: el texto del placeholder debe depender de la combinación de capacidades (**Editar / Subir / Crear**) y de si **hay archivos o no**. Además, cuando no se permite editar pero sí ver, se debe mostrar una **vista previa de solo lectura** del contenido.

El resultado: un mensaje calculado por matriz (8 combinaciones × hay/sin archivos) en `TreeFiles.vue`, un slot `#empty` para que el wrapper de compose sustituya el placeholder por su alerta, y vista previa de solo lectura cuando `canEdit = false`.

---

## Contexto actual (análisis)

### `TreeFiles.vue` (`src/components/form/files/`)

- Es el componente raíz genérico. Columna derecha (área de contenido):
  - Picker de subida si `canUpload`.
  - Botón eliminar si `canEdit` y hay selección.
  - Si hay selección → cabecera + `#editor` slot (solo si `canEdit`).
  - Si no hay selección → caja punteada con `form.files.select_hint` **solo** si `canEdit && (canUpload || canCreateFile)` (línea 243-248).
- **Problema detectado**: el placeholder solo aparece con esa condición, por lo que **todas** las combinaciones con `canEdit = false` (incluido el modo "solo ver" de la vista) y la combinación `E:Sí U:No C:No` no muestran nada. Además, con `canEdit = false` y archivo seleccionado solo se muestra la cabecera (sin contenido).
- Propiedades actuales: `modelValue`, `class`, `config`, `canUpload` (default `true`), `canEdit` (default `true`), `canCreateFile` (default `true`), `isProtectedFile`, `onBeforeCreate`.
- Slots: `#actions`, `#tree-badges`, `#badges`, `#editor`.

### `ComposeTreeFilesUpload.vue` (`src/components/form/inputs/docker-compose/`)

- Wrapper fino sobre `TreeFiles` para docker compose.
- Renderiza la alerta `compose_missing` **debajo** del `TreeFiles` (líneas 127-135) cuando `canCreateFile && !hasMainCompose`.
- Usos:
  - `DockerComposeForm.vue` (add/edit): `can-create-file can-edit can-upload` → combo `E:Sí U:Sí C:Sí`.
  - `(view).vue`: `can-upload=false can-edit=false can-create-file=false` → combo `E:No U:No C:No` (solo ver).

### `FileContentEditor.vue`

- Editor genérico: imagen (`<img>`), binario (`UAlert`), texto (`UTextarea`).
- **No tiene modo de solo lectura**. `UTextarea` de Nuxt UI v4 **soporta `readonly`** de forma nativa (verificado en su API).

### i18n

- `src/locales/es/form/files.ts`: `select_hint: 'Selecciona un archivo del árbol para editarlo'` (único uso en `TreeFiles.vue:247`).
- `src/locales/es/form/docker_composes.ts`: `compose_missing` / `compose_missing_hint` (se reutilizan).
- Los tipos se regeneran con `bun run i18n:types` (→ `typed-locale.d.ts`).

### Validación al guardar

- `[id]/edit.vue` valida en `onSubmit` que exista un `compose.yaml` principal y con contenido; si no, muestra error y **bloquea el guardado**. → La alerta sigue siendo útil mientras se edita (no debe desaparecer al seleccionar otro archivo).

---

## Decisiones tomadas

| Decisión | Elección | Razón |
| --- | --- | --- |
| Cómo elegir el mensaje | `computed` que devuelve una **clave i18n** según matriz (E, U, C) × (hay/sin archivos) | La tarea pide mensajes por combinación; explícito y trazable. |
| Combinación faltante | Se incluye la combinación 8ª `E:Sí U:No C:Sí` (no listada por el usuario; la instrucción pide tenerlas todas en cuenta) | Cierre completo de la matriz: 8 × 2 = 16 casos. |
| Mensajes compartidos | Varias combinaciones comparten clave (sobre todo en "sin archivos", donde Editar no aplica) | La propia instrucción lo permite. |
| Sustituir el cuadro | Nuevo slot `#empty` en `TreeFiles` que reemplaza **todo** el placeholder; prop de slot `hint` con el texto calculado | El wrapper necesita un elemento distinto (alerta) y no debe duplicar la matriz. |
| Alerta durante la edición | La alerta también se muestra **encima del editor** (slot `#editor`) cuando falta el compose | Evita la regresión: hoy la alerta siempre está visible; además el guardado se bloquea sin compose.yaml. Se elimina la alerta inferior del wrapper. |
| Evitar duplicar la alerta | Extraer `ComposeMissingAlert.vue` (componente mínimo) en `src/components/form/inputs/docker-compose/` | La alerta aparece en 2 slots; duplicar el markup sería frágil. |
| Vista previa sin edición | Cuando `canEdit = false` y hay selección, renderizar `FileContentEditor` con prop nueva `readonly` | `UTextarea` soporta `readonly` nativo; imágenes/binarios ya eran de solo lectura. Se usa `:model-value` (una vía). |
| Cuándo mostrar el placeholder | Siempre que no haya selección (todas las combinaciones), mediante `#empty` | Antes varias combinaciones (incluida "solo ver") no mostraban nada. |
| i18n | Nueva sección `form.files.hint.*` (12 claves); se elimina `form.files.select_hint` | Sustituye al mensaje único actual. |
| Verificación | `bun run i18n:types` → `bunx vue-tsc --noEmit` → `bun run build` | Regla de AGENTS.md (no hay lint/test). |

---

## Diseño de detalle

### Matriz de mensajes

#### Hay archivos (`treeItems.length > 0`)

| # | Editar | Subir | Crear | Clave i18n | Mensaje |
| --- | --- | --- | --- | --- | --- |
| 1 | No | No | No | `form.files.hint.select_view` | Selecciona un archivo para ver su contenido |
| 2 | No | No | Sí | `form.files.hint.select_view_create` | Selecciona un archivo para ver su contenido o crea uno nuevo |
| 3 | No | Sí | No | `form.files.hint.select_view_upload` | Selecciona un archivo para ver su contenido o sube archivos |
| 4 | No | Sí | Sí | `form.files.hint.select_view_all` | Selecciona un archivo para ver su contenido, o sube o crea archivos |
| 5 | Sí | No | No | `form.files.hint.select_edit` | Selecciona un archivo para editarlo |
| 6 | Sí | No | Sí | `form.files.hint.select_edit_create` | Selecciona un archivo para editarlo o crea uno nuevo |
| 7 | Sí | Sí | No | `form.files.hint.select_edit_upload` | Selecciona un archivo para editarlo o sube archivos |
| 8 | Sí | Sí | Sí | `form.files.hint.select_edit_all` | Selecciona un archivo para editarlo, o sube o crea archivos |

#### Sin archivos (`treeItems.length === 0`)

Editar no aplica (no hay nada que seleccionar); el mensaje depende solo de Subir/Crear.

| # | Editar | Subir | Crear | Clave i18n | Mensaje |
| --- | --- | --- | --- | --- | --- |
| 1 | No | No | No | `form.files.hint.empty_none` | No hay archivos |
| 2 | No | No | Sí | `form.files.hint.empty_create` | Crea un archivo para empezar |
| 3 | No | Sí | No | `form.files.hint.empty_upload` | Sube archivos para empezar |
| 4 | No | Sí | Sí | `form.files.hint.empty_all` | Sube o crea archivos para empezar |
| 5 | Sí | No | No | `form.files.hint.empty_none` | No hay archivos |
| 6 | Sí | No | Sí | `form.files.hint.empty_create` | Crea un archivo para empezar |
| 7 | Sí | Sí | No | `form.files.hint.empty_upload` | Sube archivos para empezar |
| 8 | Sí | Sí | Sí | `form.files.hint.empty_all` | Sube o crea archivos para empezar |

### `TreeFiles.vue`

1. Nuevo computed que devuelve la clave i18n (en vez del `t()` directo):

```ts
const selectHintKey = computed(() => {
	const hasFiles = treeItems.value.length > 0

	if (!hasFiles) {
		if (canUpload.value && canCreateFile.value) return 'form.files.hint.empty_all'
		if (canUpload.value) return 'form.files.hint.empty_upload'
		if (canCreateFile.value) return 'form.files.hint.empty_create'
		return 'form.files.hint.empty_none'
	}

	if (canEdit.value) {
		if (canUpload.value && canCreateFile.value) return 'form.files.hint.select_edit_all'
		if (canUpload.value) return 'form.files.hint.select_edit_upload'
		if (canCreateFile.value) return 'form.files.hint.select_edit_create'
		return 'form.files.hint.select_edit'
	}

	if (canUpload.value && canCreateFile.value) return 'form.files.hint.select_view_all'
	if (canUpload.value) return 'form.files.hint.select_view_upload'
	if (canCreateFile.value) return 'form.files.hint.select_view_create'
	return 'form.files.hint.select_view'
})
```

2. Placeholder sustituible (se muestra **siempre** que no haya selección):

```html
<div v-else>
	<slot name="empty" :hint="t(selectHintKey)">
		<div class="border-2 border-dashed border-muted rounded-lg p-6 text-center text-sm text-muted">
			{{ t(selectHintKey) }}
		</div>
	</slot>
</div>
```

3. Vista previa de solo lectura cuando `canEdit = false` (dentro del bloque `v-if="selectedPath && selectedEntry"`):

```html
<template v-if="canEdit">
	<slot name="editor" :entry="selectedEntry" :content="selectedContent" :update-content="updateContent">
		<FileContentEditor :entry="selectedEntry" v-model="selectedContent" />
	</slot>
</template>
<FileContentEditor v-else :entry="selectedEntry" :model-value="selectedContent" readonly />
```

### `FileContentEditor.vue`

- Nueva prop `readonly?: boolean` (default `false`).
- Pasar `:readonly="props.readonly"` al `UTextarea`. Ramas imagen/binario sin cambios (ya solo lectura).

### `ComposeTreeFilesUpload.vue`

- **Eliminar** la alerta inferior (`UAlert` al final del template).
- Extraer `ComposeMissingAlert.vue` (componente mínimo, mismo directorio) con el `UAlert` actual (`color="warning"`, `variant="soft"`, `icon="i-tabler-brand-docker"`, `:title="t('form.docker_composes.files.compose_missing')"`, `:description="t('form.docker_composes.files.compose_missing_hint')"`, `v-if="canCreateFile && !hasMainCompose"` recibido por prop).
- Añadir el slot `#empty` (sustituye el cuadro por la alerta o por el mensaje calculado):

```html
<template #empty="{ hint }">
	<ComposeMissingAlert v-if="canCreateFile && !hasMainCompose" />
	<p v-else class="text-sm text-muted">{{ hint }}</p>
</template>
```

- Añadir `ComposeMissingAlert` al inicio del slot `#editor` (se mantiene la advertencia mientras se edita).

### i18n (`src/locales/es/form/files.ts`)

- Eliminar `select_hint`.
- Añadir `hint: { select_view, select_view_create, select_view_upload, select_view_all, select_edit, select_edit_create, select_edit_upload, select_edit_all, empty_none, empty_create, empty_upload, empty_all }` con los textos de la matriz.
- Regenerar `typed-locale.d.ts` con `bun run i18n:types`.

---

## Orden de implementación

| # | Paso | Archivos | Dependencias |
| --- | --- | --- | --- |
| 1 | i18n: nueva sección `form.files.hint.*`, eliminar `select_hint` | `src/locales/es/form/files.ts` | Ninguna |
| 2 | `FileContentEditor`: prop `readonly` | `src/components/form/files/FileContentEditor.vue` | Ninguna |
| 3 | `TreeFiles`: computed `selectHintKey`, slot `#empty`, vista previa solo lectura | `src/components/form/files/TreeFiles.vue` | #1, #2 |
| 4 | `ComposeMissingAlert.vue` nuevo | `src/components/form/inputs/docker-compose/` | Ninguna |
| 5 | `ComposeTreeFilesUpload`: eliminar alerta inferior, añadir `#empty` y alerta en `#editor` | `src/components/form/inputs/docker-compose/ComposeTreeFilesUpload.vue` | #3, #4 |
| 6 | Verificación | `bun run i18n:types` → `bunx vue-tsc --noEmit` → `bun run build` | Todos |

---

## Notas / fuera de alcance

- `createMainComposeFile` (botón docker en `#actions`) añade `compose.yaml` al modelo pero **no lo selecciona** en el árbol. Comportamiento preexistente, fuera de alcance de este plan.
- `(view).vue` usa `:model-value` (sin `v-model`), por lo que la vista solo lectura no puede mutar nada. Correcto.
- Tras este cambio, la página de vista (`E:No U:No C:No`) mostrará el mensaje `select_view` cuando no haya selección y la vista previa de solo lectura al seleccionar un archivo (requisito 2.3).

---

## Registro de cambios (implementación, 16 ago 2026)

1. **`src/locales/es/form/files.ts`**: eliminado `select_hint`; añadida la sección `hint` con las 12 claves de la matriz (`select_view*`, `select_edit*`, `empty_*`).
2. **`src/components/form/files/FileContentEditor.vue`**: nueva prop `readonly?: boolean`; se pasa `:readonly` al `UTextarea` (imagen/binario sin cambios).
3. **`src/components/form/files/TreeFiles.vue`**:
   - Nuevo computed `selectHintKey` (matriz E/U/C × hay/sin archivos).
   - Placeholder sustituible: `<div v-else>` con slot `#empty` (slot prop `hint`); default = caja punteada con `t(selectHintKey)`.
   - Vista previa de solo lectura: cuando `canEdit = false`, se renderiza `FileContentEditor :model-value="selectedContent" readonly` (el slot `#editor` solo con `canEdit`).
4. **`src/components/form/inputs/docker-compose/ComposeMissingAlert.vue`** (nuevo): `UAlert` de `compose_missing`/`compose_missing_hint` (sin prop; el `v-if` lo aplica el llamador).
5. **`src/components/form/inputs/docker-compose/ComposeTreeFilesUpload.vue`**: eliminada la alerta inferior; añadido slot `#empty` (`ComposeMissingAlert` si `canCreateFile && !hasMainCompose`, si no `<p>{{ hint }}</p>`) y `ComposeMissingAlert` al inicio del slot `#editor`.

**Verificación:** `bun run i18n:types` OK (typed-locale.d.ts regenerado), `bunx vue-tsc --noEmit` limpio, `bun run build` verde.

**Comportamiento resultante:**
- La alerta "Falta el archivo compose.yaml principal" sustituye el cuadro de selección cuando no hay archivo seleccionado y falta el compose (tarea 1), y sigue visible encima del editor mientras se edita.
- El mensaje informativo se adapta a las 8 combinaciones Editar/Subir/Crear y a si hay o no archivos (tarea 2.5), incluida la combinación 8ª faltante `E:Sí U:No C:Sí`.
- En modo solo ver (`canEdit = false`) se muestra el contenido en vista previa de solo lectura (tareas 2.2/2.3).

---

## Estado actual

Este plan está en **Completado**.
