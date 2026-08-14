# Plan — Sistema de formularios JSON-Schema basado en json-schema-library (jsl)

> Tarea de `AGENTS.todo.md`: _Composable y componentes para crear un formulario a partir de un json-schema_.
> Estado: **COMPLETADA** (13 ago 2026). Revisiones posteriores de notas también aplicadas (Fase 5 y Fase 6). Ver `## 10. Registro de progreso`.
> Este archivo es la guía completa de implementación.

## 1. Objetivo

Reconstruir el sistema de formularios por JSON-Schema (`src/components/form/schema/*`, `src/composables/useSchemaForm.ts`, `src/utils/schema-form/*`, `src/utils/json-utils.ts`) para que **gire alrededor de la API de `json-schema-library` (jsl)** y sea **agnóstico** de cualquier esquema concreto (no debe depender de `compose-spec.json` ni `composer-schema.json`).

Requisitos literales de `AGENTS.todo.md`:

1. **Validación con jsl, no Zod.** jsl expone `root.validate(data)`. No hace falta Zod en el núcleo.
2. **Referencias resueltas por jsl.** No crear utilidades propias de `$ref` (eliminar `dereferenceSchema`).
3. **Versión de la especificación desde jsl** (`root.getDraftVersion()`).
4. **Campos simples** (`string`, `number`, `boolean`, `enum`, `null`) → componente Nuxt UI correspondiente.
5. **Semántica de `oneOf` (exclusivo):** cuando una propiedad tiene `oneOf`, el valor **solo puede tener uno de los formatos** dados; nunca varios a la vez.
6. **Campos ARRAY** con `oneOf` en sus ítems (`items.oneOf`) → el array solo admite **un formato** (el select fija el formato de todos los items): se muestra un `USelect` para elegir el formato (ej. `string` u `object`) y los items se añaden/editan con esa variante.
7. **Campos OBJECT** → render recursivo de sus propiedades (que pueden ser a su vez array/object/string/number/…).

## 2. Diagnóstico del estado actual (verificado)

- `bunx vue-tsc --noEmit` falla en 15 errores y `bun test` tiene **3 tests en rojo** (36 pass / 3 fail). El sistema actual **no compila**.
- `src/utils/schema-form/jsl.ts` tiene `compileSchema` con **recursión infinita** (se llama a sí misma) e importa `Schema` que **no existe** en jsl (`error TS2305`).
- `src/utils/schema-form/extract.ts` es un **parser manual completo** (deserializa `$ref`, `allOf`, keywords) → justo lo contrario de "usar jsl".
- `src/utils/schema-form/toZod.ts` está roto y mal nombrado (no usa Zod, pero tampoco funciona con jsl).
- `SchemaField.vue` referencia `field.oneOf` (no existe en el tipo `ArrayField`) y `./types` que ya no está en esa ruta.
- `useSchemaForm.ts` mapea errores con un `reduce` roto (`e.data.pointer` no se usa).
- Decisiones previas (archivo `schema-form.plan.md`, sesión anterior) que se mantienen:
  1. Componentes sobre el **`SchemaNode` de jsl** (se elimina el modelo `SchemaField`).
  2. Campo `type: "null"` → `USwitch` activar/desactivar.
  3. Mensajes de validación → claves i18n.

## 3. Comportamiento verificado de jsl v11.6.2 (ya instalada)

Comprobado ejecutando scripts con `bun run`:

| Hecho | Resultado |
|---|---|
| `compileSchema(compose-spec.json)` | `draft-2020-12`, 0 `schemaErrors` |
| `compileSchema(composer-schema.json)` | `draft-04`, 0 `schemaErrors` (detección automática) |
| `node.getDraftVersion()` | devuelve `'draft-2020-12'` etc. |
| `$ref` a nivel superior | **NO se resuelve**: `patternProperties[0].node.schema` es `{"$ref":"#/$defs/service"}`; hay que usar `node.resolveRef()` o `root.getNode(pointer, data)` |
| `root.getNode('/services', {})` | resuelve y reduce; `type: object` |
| `root.getNode('/services/web', data)` | reduce patternProperties + `$ref` → `properties` con 93 claves; `properties.build.oneOf = ['string','object']` |
| `root.getNode('/services/web/build', {})` | con datos vacíos devuelve nodo `schema: undefined` (no reduce oneOf) → para los hijos usar `node.properties[child]` del nodo reducido del padre |
| `root.validate(data)` | `{ valid, errors }`; cada error tiene `code` (`type-error`, `one-of-error`, `required-property-error`, `format-email-error`, …) y `data.pointer` (JSON pointer), `data.key`, `value`, `expected` |
| Errores en arrays | pointer con índice: `#/list/0` |
| `type` en nodos | puede ser `string \| string[]` (draft-04/06/07/2019/2020 lo permiten). El caso típico es `['string','null']` = string nullable |
| Array `items: { oneOf: [string, object] }` | `node.items.oneOf` expone las variantes (base del select de formato) |
| `node.getData()` | genera valores por defecto respetando `default`/tipos |

Implicaciones de diseño:

- El render de un nodo usará **`root.getNode(pointer, data)`** (reduce oneOf/anyOf y resuelve `$ref`) y para los hijos leerá **`node.properties[child]`** / **`node.items`** / **`node.patternProperties`** ya resueltos.
- `resolveRef()` se usa para inspeccionar el esquema de un nodo sin depender de datos (ej. obtener el patrón de un mapa cuando el objeto aún no existe).

## 4. Arquitectura objetivo

```
useSchemaForm(schema, options)
  └─ compileSchema(schema) ─► root: SchemaNode  (+ draft vía getDraftVersion())
       ├─ formData ref            (paths.ts: getAt/setAt/removeAt)
       ├─ validate()              ─► root.validate(data) → errors por ruta (i18n)
       ├─ errorAt(path)
       └─ nodeAt(pointer)         ─► root.getNode(pointer, data) (reducido/resuelto)

Componentes (consumen SchemaNode + useSchemaFormContext):
  SchemaField        : clasifica el nodo (classifyNode) y despacha
  SchemaFieldScalar  : UInput / UInputNumber / USwitch / USelect (string·number·integer·boolean·enum)
  SchemaFieldNull    : USwitch null ←→ sin valor            (NUEVO)
  SchemaFieldUnion   : oneOf/anyOf → USelect de variantes + variante activa
  SchemaFieldArray   : lista de items; items con oneOf → select de formato (array uniforme)
  SchemaFieldMap     : patternProperties / additionalProperties → entradas con clave editable
  SchemaFieldAny     : textarea JSON (se conserva el actual)
```

Núcleo **agnóstico**: `src/utils/schema-form/*`, `useSchemaForm.ts` y `src/components/form/schema/*` **no importan** `compose-spec.json` ni `composer-schema.json`. `ComposeEditor.vue` es el único consumidor Compose (importa `src/schemas/compose-spec.json` y lo compila con `compileRoot`).

## 5. Decisiones

- Eliminar el modelo `SchemaField` (`types.ts`) y sus fábricas manuales (`extract.ts`, `defaults.ts`, `union.ts`). Sustituirlos por utilidades ligeras sobre `SchemaNode`.
- Conservar `src/utils/schema-form/paths.ts` (getAt/setAt/removeAt por ruta `a.b[0]`) y añadir conversión `pathToPointer` / `pointerToPath` para `getNode` y errores.
- Zod permanece instalado (lo usan `composables/schemas/{docker_composes,hosts,passkeys}.ts`); se elimina **solo** del sistema de formularios. `vite.config.ts` (optimizeDeps) no cambia.
- No hay cambios de BD → **no se genera migración** (regla 3 de `AGENTS.todo.md`).
- El composable conserva `SchemaFormOptions.resolveTitle/resolveDescription/resolveMessage` (los consume `ComposeEditor` para las claves `form.compose_schema.*`).

## 6. Fases de implementación

> Orden: de lo simple a lo complejo. **Fase N depende de N-1**; ir de una en una y dejar constancia al terminar cada fase. Después de cada fase: `bun test`.

### Fase 1 — Utilidades puras sobre jsl (no rompe el render; añade cobertura)

1. Reescribir `src/utils/schema-form/jsl.ts`:
   - `compileRoot(schema)` → `{ root, draft }` (envoltorio fino, sin recursión).
   - `classifyNode(node)` → `{ kind, nullable, isUnion, isMap, variants? }`. **`node.type` puede ser un array** (p.ej. `['string','null']`) y se normaliza así:
     - `['<tipo>', 'null']` (1 tipo + null, el caso habitual) → `kind = <tipo>`, `nullable = true` → se renderiza el campo del tipo con `SchemaFieldNull` (USwitch) para activar/desactivar el valor `null`.
     - `['<tipo>']` (array de 1) → equivale a `type: '<tipo>'`.
     - varios tipos **sin** `null` (p.ej. `['string','number']`) → `union` de formatos → `USelect` de variantes (semántica oneOf: solo uno).
     - varios tipos **con** `null` (p.ej. `['string','number','null']`) → `union` + `nullable = true`.
     - `type: 'null'` solo → `kind = 'null'` → `SchemaFieldNull`.
     - `type: []` vacío o ausente → se sigue por enum/oneOf/properties/…; si nada → `any`.
     - `node.enum` / `node.schema.const` → enum.
     - `node.oneOf` / `node.anyOf` → union.
     - `node.properties` → object; `node.patternProperties`/`additionalProperties` → map; `node.schema.additionalProperties === true` → map `any`.
     - vacío (sin type/enum/oneOf/…) → any.
   - `resolveNode(node)` → resuelve `$ref` (`resolveRef()`) y fusiona `allOf` (jsl `reduceNode`/merge, sin utilidad propia).
   - `activeVariantIndex(root, pointer, data)` → `root.getNode(pointer, data).oneOfIndex` (fallback por tipo JS como el actual `variantForValue`).
   - `preferredVariant(node)` / `variantDefault(node)` → basados en `getData()` / orden de preferencia.
   - `variantLabel(node)` → `title` o tipo.
2. Añadir a `src/utils/schema-form/paths.ts`: `pathToPointer('a.b[0]' → '#/a/b/0')` y `pointerToPath`.
3. `tests/jsl.test.ts`: clasificación (string/number/boolean/null/enum/array/object/map/union/any), nullable `['string','null']`, array `items.oneOf`, `$ref` resuelto, allOf fusionado, map, ciclo `$ref`, draft detectado.

### Fase 2 — Validación con jsl + i18n

1. `src/utils/schema-form/validate.ts`:
   - `validateWithJsl(root, data, resolveMessage?)` → `{ ok, errors: Record<ruta, string[]> }`.
   - Mapear `error.data.pointer` (JSON pointer) → ruta de formulario (`pointerToPath`); `code` → clave i18n `form.schema_form.errors.<code_snake>`; params `{ key, value, expected, minimum, maximum, … }`.
2. `src/locales/es/form/schema_form.ts`:
   - Añadir `errors.*` (mínimo: `type`, `required_property`, `minimum`, `maximum`, `min_length`, `max_length`, `pattern`, `enum`, `one_of`, `any_of`, `unique_items`, `multiple_of`, `min_items`, `max_items`, `format_email`, `format_uri`, `additional_properties`) con `{ key, value, expected, minimum, maximum, pattern }`.
   - Añadir `kind.null` y `null_value` (para `SchemaFieldNull`).
3. `bun run i18n:types` (regenera `typed-locale.d.ts`).
4. `tests/validate.test.ts`: códigos→rutas, email/required/min/max, rutas anidadas y de arrays (`#/list/0` → `list[0]`).

### Fase 3 — Composable + contexto + componentes + ComposeEditor (el swap)

Construir de abajo arriba:

1. `src/composables/useSchemaForm.ts` — reescritura: `{ root, draft, formData, errors, validate, errorAt, get, set, remove, nodeAt(pointer), resolveTitle, resolveDescription }`. `validate()` usa `validateWithJsl` con `useI18n()` por defecto.
2. `src/components/form/schema/context.ts` — tipar contra la nueva `SchemaFormInstance`.
3. `SchemaField.vue` — despacho por `classifyNode(node)`:
   - string → `UInput` (respeta `format` email/uri, `pattern`), number/integer → `UInputNumber` (min/max/multipleOf), boolean → `USwitch`, enum → `USelect`.
   - null → `SchemaFieldNull`.
   - object → hijos de `node.properties` (requeridos de `node.required`) con render recursivo (colapsable si >10 hijos, como hoy).
   - array/map/union/any → subcomponentes.
4. `SchemaFieldUnion.vue` — `USelect` de variantes (`node.oneOf`/`anyOf`); **oneOf es exclusivo: solo se edita el formato elegido**; al elegir fija `variantDefault()`; variante activa vía `activeVariantIndex`.
5. `SchemaFieldArray.vue` — añadir/eliminar items; **si `node.items.oneOf` existe → `USelect` de formato del array** (requisito: el array solo admite 1 formato) y todos los items se renderizan con la variante seleccionada; default del item vía `preferredVariant`+`getData()`.
6. `SchemaFieldMap.vue` — entradas con clave editable + valor (`patternProperties`/`additionalProperties`).
7. `SchemaFieldNull.vue` — nuevo: `USwitch` (activado → `form.set(path, null)`; desactivado → `form.remove(path)`).
8. `ComposeEditor.vue` — adaptar: tabs desde `root.properties` (`name`/`version` aparte, resto tabs), `resolveTitle/Description` con claves `form.compose_schema.*` (mantener), sample, validate, generate. Opcional: `UBadge` con la versión de draft (`root.getDraftVersion()`).
9. Verificar `bun run build` (vue-tsc strict) + `bun test` + arrancar `bun run dev`.

### Fase 4 — Limpieza, docs y verificación final

1. Eliminar: `src/utils/schema-form/{extract.ts,toZod.ts,defaults.ts,union.ts,types.ts}`, `src/components/form/editors/ComposeEditor.vue.back`, `schema-form.plan.md` (tras consolidarlo aquí).
2. Reescribir `tests/schema-form.test.ts` contra la nueva API manteniendo la cobertura actual (composer 160+ campos, `build` union string/object, `services` map, `authors` array-object, `deprecated`, refs cíclicos, defaults, paths).
3. Adaptar/eliminar `tests/union.test.ts` (los helpers `union.ts` desaparecen → cubrir con `tests/jsl.test.ts`).
4. Actualizar `AGENTS.md` y `AGENTS.frontend.md` con la nueva sección del sistema de formularios (regla 4 de `AGENTS.todo.md`).
5. `AGENTS.todo.md` → dejar constancia del progreso; al terminar del todo mover el registro a `AGENTS.todo.done.md` (regla 2).
6. Verificación final: `bun test`, `bun run i18n:types`, `bun run build`.

## 7. Criterios de aceptación

- `bun run build` limpio (vue-tsc strict + vite build) y `bun test` todo en verde.
- El núcleo no importa `compose-spec.json` ni `composer-schema.json` (grep de verificación).
- Campos simples con Nuxt UI; `null` con `USwitch`; arrays con `items.oneOf` muestran `select` de formato; objects recursivos.
- Validación con `root.validate()` de jsl y mensajes por claves i18n (nunca strings en español en el backend/código).
- `ComposeEditor` (página `docker_composes/add.vue`) funciona end-to-end generando YAML válido.

## 8. Reglas / restricciones

- Idioma: español (código/comentarios/mensajes).
- No tocar: `.dist/`, `node_modules/`, autogenerados (`drizzle/`, `src/lib/schema.ts`, `typed-locale.d.ts`, `auto-imports.d.ts`, `components.d.ts`, `src/route-map.d.ts`).
- Sin migraciones SQL (no cambia versión en `tauri.conf.json`).
- Sin dependencias nuevas (jsl ya está en `package.json`).
- No analizar `compose-spec.json` / `composer-schema.json` para diseñar el núcleo; solo como entrada de pruebas y consumo en `ComposeEditor`.

## 9. Notas / riesgos

- `additionalProperties: true` aparece como `undefined` en el nodo compilado → detectar vía `node.schema.additionalProperties === true`.
- `const` se lee de `node.schema.const`, no de `node.enum`.
- `getNode` con datos vacíos no reduce oneOf en rutas profundas → para hijos usar `node.properties[child]` del nodo reducido del padre, nunca `getNode` a ciegas.
- Reactividad: `formData` de Pinia-Colada no aplica aquí (es `ref` propio); mantener la reasignación completa en `set` (no mutar anidadas esperando reactividad).

## 10. Registro de progreso

### Fase 1 — COMPLETADA
- `src/utils/schema-form/jsl.ts` reescrito (`compileRoot`, `classifyNode`, `resolveNode`, `activeVariantIndex`, `preferredVariant`, `variantDefault`, `variantLabel`).
- `src/utils/schema-form/paths.ts`: añadidas `pathToPointer` / `pointerToPath`.
- `tests/jsl.test.ts`: 25 tests verdes (clasificación, nullable, `items.oneOf`, `$ref`, allOf, map, draft).

### Fase 2 — COMPLETADA
- `src/utils/schema-form/validate.ts` (`validateWithJsl`, `MessageResolver`, `errorPath`).
- Claves `errors.*`, `kind.null` y `null_value` en `src/locales/es/form/schema_form.ts`; `typed-locale.d.ts` regenerado.
- `tests/validate.test.ts`: 11 tests verdes (rutas anidadas, arrays, formatos, códigos).

### Fase 3 — COMPLETADA
- `src/composables/useSchemaForm.ts` reescrito: `{ root, draft, formData, errors, validate, errorAt, get, set, remove, nodeAt, resolveTitle, resolveDescription }`; `validate()` vía `validateWithJsl` con `useI18n()` por defecto.
- `context.ts` sin cambios de API (mismo `SchemaFormInstance`).
- Componentes sobre `SchemaNode`:
  - `SchemaField.vue`: clasifica con `classifyNode` y despacha; soporta `nullable` (USwitch `SchemaFieldNull`) para cualquier tipo.
  - `SchemaFieldNull.vue` (nuevo): USwitch null ←→ `remove(path)`.
  - `SchemaFieldUnion.vue`: `USelect` de variantes (oneOf/anyOf/type-array) + editor de la variante activa.
  - `SchemaFieldArray.vue`: lista + `USelect` de formato cuando `items.oneOf` (array uniforme) + default del item vía `variantDefault`.
  - `SchemaFieldMap.vue`: entradas clave-editable; valueNode = `patternProperties[0]` → `additionalProperties` → `any`.
  - `SchemaFieldAny.vue` (nuevo): textarea JSON.
- `ComposeEditor.vue`: tabs desde `root.properties` (name/version aparte), `UBadge` con el draft, mismos sample/validate/generate.
- Arreglos colaterales para build limpio (preexistentes):
  - `src/pages/dashboard/docker_composes/add.vue`: eliminado el `onSubmit`/template comentado muerto (la página solo aloja `<ComposeEditor />`).
  - Recreado `src/components/form/editors/parts/ComposeFileForm.vue` como adaptador `ComposeFile ↔ ComposeEditor` (el archivo había sido borrado y rompía `FileEditComposeEditor.vue`).
- `tests/render.test.ts` (nuevo): flujos de render sobre compose-spec (clasificación raíz, mapa `services` → `$ref`, array `include` union, defaults).
- Verificación: `vue-tsc --noEmit` limpio, `bun run build` verde, `bun test` 77 pass / 3 fail (los 3 son de `tests/schema-form.test.ts`, antiguo, a reescribir en Fase 4), `bun run dev` arranca.

### Fase 4 — COMPLETADA (13 ago 2026)
- Eliminados: `src/utils/schema-form/{extract.ts,toZod.ts,defaults.ts,union.ts,types.ts}`, `src/components/form/editors/ComposeEditor.vue.back`, `tests/union.test.ts`, `schema-form.plan.md` (decisiones ya consolidadas en este plan).
- `tests/schema-form.test.ts` reescrito contra la nueva API manteniendo la cobertura anterior: refs cíclicos (compile+resolve), composer (union license, enum, map require, union config.policy, authors array-object con name requerido, repositories union map/array, autoload psr-0), compose (services map + 90+ props, build union, version deprecated, include array→items union vía `resolveNode`), defaults (`variantDefault` respeta required+default), paths, validación anidada y format. 66/66 tests verdes.
- `src/utils/json-utils.ts`: `composeJson: JsonSchema` (importa `JsonSchema` de jsl; eliminada la dependencia del modelo `Schema`).
- Docs: `AGENTS.md` gotcha "Formularios JSON-Schema" + `AGENTS.frontend.md` §8 (utilidades, componentes, gotchas: `getData()` solo incluye `required`, `$ref` no se resuelve solo, agnosticismo).
- Tarea movida a `AGENTS.todo.done.md` (regla 2) con historial completo.
- Verificación final: `bun test` 66/66 OK, `bun run i18n:types` OK, `bun run build` (vue-tsc --noEmit + vite build) verde.

### Fase 5 — Revisión de notas del usuario (13 ago 2026)
Notas dejadas en `AGENTS.todo.md` tras la Fase 4. Plan detallado en `.opencode/plans/AGENTS.schema-form-revision.md`.
- **Eliminados `src/utils/json-utils.ts` y `src/utils/compose-schema/types.ts`**: `toJson`/`fromJson` eran código muerto (sin consumidores) y `ComposeSpecification`/`ComposeJson` eran `Record<string, any>` superfluos. `composeJson` ahora es inline en `ComposeEditor.vue` (`composeSpec as JsonSchema`), único consumidor Compose. El núcleo sigue agnóstico.
- **Quitado el botón "Cargar ejemplo"**: eliminados `loadSample()`, const `sample` y la clave i18n `form.schema_form.load_sample`.
- **Arrays con items unión → formato único (no mezclar)**: `SchemaFieldArray.vue` calcula `variants` desde `classifyNode(resolveNode(items))` (cubre `items.oneOf` directo, `$ref`→unión como `include`, y `type` array). Antes `include.items` era `$ref` y no se detectaba el select → cada item permitía formato distinto.
- **Errores visibles al validar**: `ComposeEditor.vue` ahora muestra un `UAlert` resumen (`form.schema_form.validation_errors` con `{count}` + rutas con mensaje), auto-activa el tab con el primer error (`firstErrorTabIndex`) y marca los tabs con errores (punto rojo).
- Docs actualizados: `AGENTS.md`, `AGENTS.frontend.md` §8.
- Verificación: `bun test` OK, `bun run i18n:types` OK, `bun run build` verde.

### Fase 6 — Nuevas notas del usuario (13 ago 2026)
Notas dejadas en `AGENTS.todo.md`:
- **Selector de tipo → `URadioGroup`**: los dos `USelect` que decidían el tipo de dato (unión de `SchemaFieldUnion.vue` y formato de items unión de `SchemaFieldArray.vue`, p.ej. `include` → string/objeto) ahora son `URadioGroup` con `orientation="horizontal" variant="table" indicator="hidden" size="sm"`. El select de `enum` en `SchemaField.vue` se conserva (elige valor, no tipo). Eliminada la clave i18n `form.schema_form.choose` (sin uso; `typed-locale.d.ts` regenerado).
- **Fix: el switch de null ya no borra la entrada**: `SchemaFieldNull.vue` ahora recibe el nodo (`node?: SchemaNode`) y al desactivar `null` hace `form.set(path, variantDefault(node))` en vez de `form.remove(path)` (que en un mapa como `networks` eliminaba la clave completa). `SchemaField.vue` le pasa el nodo resuelto. Efecto: `networks.<nombre>` → `{}` al volver de null (la red permanece). Verificado con jsl: `getData()` de `['object','null']`→`{}`, `['string','null']`→`""`, `['boolean','null']`→`false`, `['number','null']`→`0`.
- Verificación: `bun run i18n:types` OK, `bun test` 66/66 OK, `bun run build` (vue-tsc --noEmit + vite build) verde.

### Fase 7 — Nuevas notas del usuario (13 ago 2026)
Notas dejadas en `AGENTS.todo.md`:
- **Botón de añadir en la línea del título**: `SchemaField.vue` muestra el botón "+" (Añadir elemento / Añadir entrada) a la derecha del título cuando el campo es array o mapa (no bare). Los hijos exponen la acción vía `defineExpose({ add })` y el padre la invoca con template refs. Los botones inferiores quedan solo en modo `bare` (nuevo prop `bare` en `SchemaFieldArray.vue` y `SchemaFieldMap.vue`).
- **Mapas de objetos → pestañas**: `SchemaFieldMap.vue` detecta `classifyNode(valueNode).kind === 'object'` (p.ej. `services`, `networks`) y renderiza cada entrada como pestaña (botones + contenido con clave editable y borrado). El resto de mapas conserva la lista de filas. `addEntry` selecciona la nueva pestaña; `removeEntry` ajusta el índice activo.
- **Fix: uniones por `type` array no permitían poner valor**: una propiedad `['string','number','boolean']` (p.ej. los valores de los mapas `list_or_dict`) clasifica como union, pero `activeVariantIndex`/`preferredVariant`/`variantDefault` solo miraban `node.oneOf`/`anyOf` (vacíos) → no se renderizaba ningún control. Nueva utilidad `unionVariants(node)` (devuelve las variantes de `classifyNode`, que cubre `oneOf`/`anyOf` y `type` array) usada por `activeVariantIndex`, `preferredVariant` y `variantDefault`. Con eso el URadioGroup selecciona variante y se muestra el control correcto (USwitch para boolean, UInput/UInputNumber para string/number). El null sigue gestionado por el switch de `SchemaFieldNull`.
- **Etiquetas de tipo traducidas**: `SchemaFieldUnion.vue` y `SchemaFieldArray.vue` usan `form.schema_form.kind.*` (español) con fallback a `variantLabel`.
- Verificación: `bun test` 70/70 OK (nuevo bloque "uniones por type array" en `tests/jsl.test.ts`), `bun run i18n:types` OK, `bun run build` verde.

### Fase 8 — Mostrar warnings de validación (13 ago 2026)
Nota del usuario: _la validación de jsl incluye warnings; también deberían mostrarse_.
- jsl expone los warnings como **annotations** en `root.validate(data)` (p.ej. `deprecated-warning` cuando una propiedad `deprecated` tiene valor); antes se ignoraban (`result.valid` solo tiene en cuenta `errors`).
- `src/utils/schema-form/validate.ts`: `ValidationResult` gana `warnings: Record<ruta, string[]>`. Se recogen las annotations cuyo `code` termina en `-warning` y se traducen vía `form.schema_form.warnings.<código>` (`deprecated`, `unknown_keyword`, `unknown_format`, `schema`, `generic`). `ok` solo depende de `errors` (los warnings no invalidan). `errorPath` y `paramsOf` ahora aceptan una forma genérica (valen para `JsonError` y `JsonAnnotation`).
- `src/composables/useSchemaForm.ts`: expone `warnings` (ref) y `warningAt(path)`; `validate()` rellena ambos.
- `SchemaField.vue`: muestra el primer warning del campo en `text-warning` bajo el campo.
- `ComposeEditor.vue`: `UAlert` color `warning` con resumen (`form.schema_form.validation_warnings`), punto ámbar (`bg-warning`) en tabs con warnings (el punto rojo de error tiene prioridad).
- i18n: `validation_warnings` y `warnings.*` en `src/locales/es/form/schema_form.ts`.
- Verificación: `bun test` 73/73 OK (bloque "deprecated-warning" en `tests/validate.test.ts`), `bun run i18n:types` OK, `bun run build` verde.
