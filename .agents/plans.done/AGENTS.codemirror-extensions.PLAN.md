# Plan: Extraer las extensiones de CodeMirror de `CodeEditor.vue`

## Estado

**Completado** (2026-11-12) — las cuatro iteraciones están implementadas y el usuario da por cerrada la tarea. La verificación manual en UI queda aceptada por decisión del usuario.

---

## Instrucciones dadas (verbatim)

> Modificación del componete: src\components\form\textareas\CodeEditor.vue
>
> Este editor tiene muchas extensiones que se podrían extraer a archivos propios que se puedan reutilizar, como por ejemplo el autocompletado, se podría extraer a un archivo propio (ejemplo: src/plugins/codemirror/autocomplete/variables.ts) para luego importarlo al componente CodeEditor.vue
>
> La idea es reducir el tamaño del componente y que sea más fácil de mantener, además de poder reutilizar las extensiones en otros componentes.
>
> También se tiene que poder añadir nuevas extensiones según sea necesario, por ejemplo se usa CodeEditor.vue en un componente se tiene que poder una extensión que sea propia para ese componente.

---

## Objetivo

Reducir `src/components/form/textareas/CodeEditor.vue` (783 líneas) extrayendo a módulos propios y reutilizables todo lo que **no** es orquestación del componente Vue:

- Tipos y constantes públicas (`CodeLanguage`, `CODE_LANGUAGES`, `CodeHighlightRange`, `CodeHighlighter`).
- Carga de lenguajes y linters por lenguaje.
- Tema visual, resaltado de sintaxis y resaltado de rangos.
- Extensiones base de CodeMirror (historial, keymaps, indentación, selección…).
- Envoltorios de `autocomplete`, `lint` y `editable`.
- Lógica de los bloques bash (`heredoc` / `bash -c`).
- Nueva prop `extensions` para inyectar extensiones propias desde el consumidor.

**Sin cambios funcionales**: el editor debe comportarse exactamente igual que ahora. **Sin dependencias nuevas**.

---

## Estado actual (análisis)

`CodeEditor.vue` mezcla hoy, en un único archivo:

| Bloque | Líneas aprox. | ¿Reutilizable? |
| --- | --- | --- |
| Tipos y constantes (`CODE_LANGUAGES`, `CodeLanguage`, `CodeHighlightRange`, `CodeHighlighter`) | 32–44 | Sí, tipos públicos |
| `languageLoaders` + `LANGUAGE_NAMES` | 89–104 | Sí, por lenguaje |
| `lintLoaders` (JSON con `$t`, YAML con `yaml`) | 106–183 | Sí, linters independientes |
| `highlightStyle` + `SECRET_ICON_MASK` + `theme` | 289–475 | Sí, tema completo |
| `editableExtensions()` | 477–480 | Sí |
| `highlightExtension()` (ViewPlugin de decoraciones) | 482–517 | Sí, extensión genérica |
| Bloques bash (`HEREDOC_HEADER`, `BASH_C_OPEN`, `locate*`, `wrap*`, `pickHeredocMarker`, `escape*`, `setFormat`) | 189–271, 519–592 | Sí: lógica pura + helper de transacción |
| Montaje, compartimentos, watchers y template | 74–88, 185–187, 594–736, 738–783 | No: orquestación del componente |

Consumidores actuales:

- `src/components/form/CommandForm.vue` importa `CodeHighlighter` desde `CodeEditor.vue` y le pasa `:lint`, `:autocomplete` y `:highlight`.
- No hay más usos de `CodeEditor` ni de CodeMirror en el frontend (`grep` de `@codemirror` solo aparece en `CodeEditor.vue`, `src/utils/interpolation/completion.ts` y `CommandForm.vue`).

**Nota sobre el autocompletado:** el autocompletado de variables vive en `src/utils/interpolation/completion.ts` y se inyecta mediante la prop `autocomplete`. Como es una extensión de CodeMirror, **se mueve** a `src/plugins/codemirror/autocomplete/variables.ts` (ruta del ejemplo del enunciado). El **envoltorio genérico** `autocompletion({ override, activateOnTyping, closeOnBlur })` que hoy está dentro de `CodeEditor.vue` se extrae a `src/plugins/codemirror/autocomplete/index.ts`.

---

## Diseño propuesto

Nueva carpeta `src/plugins/codemirror/` (ruta sugerida en las instrucciones), con módulos independientes y un `index.ts` que actúa de API pública:

```
src/plugins/codemirror/
├── index.ts              # Barrel público: setup, tema, lenguajes, tipos y helpers
├── types.ts              # CODE_LANGUAGES, CodeLanguage, CodeHighlightRange, CodeHighlighter
├── languages.ts          # languageLoaders, LANGUAGE_NAMES, createLintLoader(formatDuplicateKey)
├── setup.ts              # createBaseExtensions(options): Extension[]
├── theme.ts              # codeEditorTheme, codeHighlightStyle, SECRET_ICON_MASK
├── editable.ts           # editableExtensions(locked)
├── highlight.ts          # highlightExtension(source)
├── autocomplete/
│   ├── index.ts          # createAutocompleteExtension(source)
│   └── variables.ts      # Autocompletado de variables (movido desde utils/interpolation)
├── lint/
│   ├── index.ts          # createLintExtensions(builtin, custom)
│   ├── json.ts           # createJsonLintSource(t)
│   └── yaml.ts           # createYamlLintSource()
└── bash/
    ├── blocks.ts         # Lógica pura: detección, envoltura y escapes
    └── format.ts         # setBashFormat(view, model, target)
```

### Responsabilidad de cada módulo

| Archivo | Contenido extraído | Dependencias |
| --- | --- | --- |
| `types.ts` | `CODE_LANGUAGES`, `CodeLanguage`, `CodeHighlightRange`, `CodeHighlighter` | Ninguna |
| `languages.ts` | `languageLoaders`, `LANGUAGE_NAMES`, `createLintLoader(formatDuplicateKey)` (JSON/YAML bajo demanda) | `@codemirror/*`, `yaml`, `lint/*` |
| `lint/json.ts` | Linter JSON: `jsonParseLinter` + detección de claves duplicadas (recibe `t` para i18n) | `@codemirror/lang-json` |
| `lint/yaml.ts` | Linter YAML con `parseDocument` | `yaml` |
| `lint/index.ts` | `linter(source)` + `lintGutter()`, combinación de fuente propia y personalizada | `@codemirror/lint` |
| `theme.ts` | `EditorView.theme(...)`, `HighlightStyle.define(...)`, máscara del icono de secreto | `@codemirror/view`, `@codemirror/language`, `@lezer/highlight` |
| `highlight.ts` | `ViewPlugin` + `Decoration.mark` para variables/secretos | `@codemirror/state`, `@codemirror/view` |
| `editable.ts` | `EditorState.readOnly` + `EditorView.editable` | `@codemirror/state`, `@codemirror/view` |
| `setup.ts` | `history`, `drawSelection`, `indentOnInput`, `bracketMatching`, `highlightActiveLine(Gutter)`, `tabSize`, `indentUnit`, `keymap`, `syntaxHighlighting`, tema, `darkTheme`, placeholder | `@codemirror/*`, `theme.ts` |
| `autocomplete/index.ts` | `autocompletion({ override, activateOnTyping, closeOnBlur })` | `@codemirror/autocomplete` |
| `autocomplete/variables.ts` | `createInterpolationCompletion` + tipos `InterpolationCompletionEntry`/`InterpolationCompletionConfig` (movido desde `src/utils/interpolation/completion.ts`) | `@codemirror/autocomplete` |
| `bash/blocks.ts` | `HEREDOC_HEADER`, `BASH_C_OPEN`, `locateHeredoc`, `locateBashC`, `wrapHeredoc`, `wrapBashC`, `pickHeredocMarker`, `escapeBashC`, `unescapeBashC`, tipos `BashFormat`/`FormatInfo` | Ninguna (lógica pura) |
| `bash/format.ts` | `setBashFormat(...)`: transacción única que conserva cursor y `Ctrl+Z` | `@codemirror/view`, `blocks.ts` |

### Nueva prop `extensions`

```ts
/** Extensiones CodeMirror adicionales (se combinan con las internas). */
extensions?: Extension | readonly Extension[]
```

- Se guardan en un `Compartment` propio (`customCompartment`) y se reconfiguran si la prop cambia, igual que `lint`/`autocomplete`/`highlight`.
- Se aplican **al final** del array de extensiones, para que un consumidor pueda sobrescribir comportamiento sin tocar el componente.
- Ejemplo de uso desde otro componente:

```vue
<CodeEditor v-model="code" :extensions="[myKeymap, myDecorationPlugin]" />
```

- Se mantiene `defineExpose({ insertAtCursor })`.

### Compatibilidad

- `CodeEditor.vue` seguirá re-exportando los tipos y constantes públicas para no romper `CommandForm.vue`:
  ```ts
  export { CODE_LANGUAGES, type CodeLanguage, type CodeHighlightRange, type CodeHighlighter } from '@/plugins/codemirror/types'
  ```
- Las claves i18n no cambian: `form.shared.code_editor.*` sigue igual (incluida `lint.duplicate_key`).
- La carga bajo demanda de lenguajes y linters se conserva: los `import()` dinámicos viven en `languages.ts` y `lint/*.ts`, no se convierten en imports estáticos.

---

## Fases de ejecución

> El plan NO se ejecuta hasta que pase de **Planificando** a **Pendiente** (lo decide el usuario).

### Fase 1 — Tipos y barrel
1. Crear `src/plugins/codemirror/types.ts` con `CODE_LANGUAGES`, `CodeLanguage`, `CodeHighlightRange` y `CodeHighlighter`.
2. Crear `src/plugins/codemirror/index.ts` como barrel de la API pública.
3. En `CodeEditor.vue`, sustituir las definiciones locales por re-exports desde `types.ts` (compatibilidad con `CommandForm.vue`).

### Fase 2 — Lenguajes y linters
1. Extraer `languageLoaders` y `LANGUAGE_NAMES` a `languages.ts`.
2. Extraer el linter JSON a `lint/json.ts` como `createJsonLintSource(t)` (mantiene el mensaje `form.shared.code_editor.lint.duplicate_key`).
3. Extraer el linter YAML a `lint/yaml.ts`.
4. Crear `createLintLoader(formatDuplicateKey)` en `languages.ts` para resolver el linter propio del lenguaje.
5. Crear `createLintExtensions(builtin, custom)` en `lint/index.ts` (combina ambas fuentes y devuelve `[linter, lintGutter]` o `[]`).

### Fase 3 — Tema, resaltado y editabilidad
1. Extraer `highlightStyle`, `SECRET_ICON_MASK` y `theme` a `theme.ts`.
2. Extraer `highlightExtension` a `highlight.ts` usando los tipos de `types.ts`.
3. Extraer `editableExtensions` a `editable.ts`.

### Fase 4 — Setup base y autocompletado
1. Crear `setup.ts` con `createBaseExtensions({ lineNumbers, tabSize, placeholder, dark })`, que agrupa las extensiones estáticas del montaje actual.
2. Crear `autocomplete/index.ts` con `createAutocompleteExtension(source)`.
3. Mover `src/utils/interpolation/completion.ts` a `src/plugins/codemirror/autocomplete/variables.ts` (sin cambios de lógica).
4. Actualizar el import de `CommandForm.vue`:
   - `@/utils/interpolation/completion` → `@/plugins/codemirror/autocomplete/variables`.
5. `CodeEditor.vue` consume estos módulos en `onMounted` y en los `apply*`/watchers.

### Fase 5 — Bloques bash
1. Mover la lógica pura (regex, `locateHeredoc`, `locateBashC`, `wrapHeredoc`, `wrapBashC`, `pickHeredocMarker`, `escapeBashC`, `unescapeBashC`, tipos) a `bash/blocks.ts`.
2. Mover `setFormat` a `bash/format.ts` como `setBashFormat(view, model, target)`.
3. `CodeEditor.vue` conserva `currentFormat`, `isHeredoc`, `isBashC` y `showBashTools` (son estado/computed de Vue) y delega en `bash/format.ts`.

### Fase 6 — Prop `extensions`
1. Añadir `extensions?: Extension | readonly Extension[]` a `defineProps`.
2. Crear `customCompartment`, normalizar a array y añadirlo al estado inicial.
3. Añadir `applyCustomExtensions()` + `watch(() => props.extensions, ...)`.
4. Documentar el ejemplo de uso en el JSDoc de la prop.

### Fase 7 — Adelgazar el componente y verificar
1. Eliminar de `CodeEditor.vue` todos los imports y bloques movidos (dejar solo orquestación Vue + template).
2. Comprobar que no quedan imports sin usar (`noUnusedLocals`).
3. Actualizar `AGENTS.frontend.md` §9 con la nueva estructura, la prop `extensions` y la ubicación de los módulos.
4. Dejar preparada la verificación manual (ver abajo). **El agente no ejecuta comandos de verificación**; los pasos los revisa el usuario.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/components/form/textareas/CodeEditor.vue` | Adelgazar: consumir los módulos extraídos; nueva prop `extensions`; re-exportar tipos |
| `src/plugins/codemirror/types.ts` | Nuevo: tipos y constantes públicas |
| `src/plugins/codemirror/languages.ts` | Nuevo: loaders de lenguajes y linters |
| `src/plugins/codemirror/lint/json.ts` | Nuevo: linter JSON (claves duplicadas) |
| `src/plugins/codemirror/lint/yaml.ts` | Nuevo: linter YAML |
| `src/plugins/codemirror/lint/index.ts` | Nuevo: extensión de lint combinada |
| `src/plugins/codemirror/theme.ts` | Nuevo: tema y resaltado de sintaxis |
| `src/plugins/codemirror/highlight.ts` | Nuevo: extensión de resaltado de rangos |
| `src/plugins/codemirror/editable.ts` | Nuevo: extensión de solo lectura/edición |
| `src/plugins/codemirror/setup.ts` | Nuevo: extensiones base del editor |
| `src/plugins/codemirror/autocomplete/index.ts` | Nuevo: envoltorio genérico de autocompletado |
| `src/plugins/codemirror/autocomplete/variables.ts` | Movido desde `src/utils/interpolation/completion.ts` (autocompletado de variables) |
| `src/utils/interpolation/completion.ts` | Se elimina (movido a `plugins/codemirror/autocomplete/variables.ts`) |
| `src/components/form/CommandForm.vue` | Actualizar el import de `createInterpolationCompletion` y `InterpolationCompletionEntry` |
| `src/plugins/codemirror/bash/blocks.ts` | Nuevo: lógica pura de bloques bash |
| `src/plugins/codemirror/bash/format.ts` | Nuevo: transacción de cambio de formato |
| `src/plugins/codemirror/index.ts` | Nuevo: barrel público |
| `AGENTS.frontend.md` | Actualizar §9 (`CodeEditor`) con la nueva estructura y prop `extensions` |

Sin cambios en `package.json`, `vite.config.ts`, backend ni locales.

---

## Verificación (manual)

> **No se ejecutan comandos de verificación.** El usuario comprueba los siguientes puntos manualmente.

1. Formulario de comando: el editor monta, escribe y sincroniza el `v-model`.
2. Autocompletado de variables (`{{`, `{{global.`, escape) sigue funcionando.
3. Linter de interpolación: referencias inexistentes marcadas; sin falsos positivos en secretas.
4. Resaltado de variables (primario) y secretas (ámbar).
5. Lenguajes `bash`, `yaml`, `json`, `php`, `plain`: selector, resaltado y lint propio (JSON con clave duplicada; YAML con documento inválido).
6. Switches `heredoc` / `bash -c`: activar, desactivar, convertir entre formatos, conservar cursor y `Ctrl+Z`.
7. `readonly` / `disabled`: no se puede editar.
8. Cambio de tema claro/oscuro: tooltips, panel de lint y autocompletado con tokens correctos.
9. Prop `extensions`: prueba temporal con una extensión sencilla (p. ej. un `keymap`) para confirmar que se aplica y se reconfigura al cambiar.
10. Revisar visualmente que no queden referencias a los símbolos movidos en `CodeEditor.vue` ni imports muertos.
11. Revisar que `CommandForm.vue` sigue funcionando con su import de `CodeHighlighter` y con el nuevo import del autocompletado de variables.

---

## Criterios de aceptación

- `CodeEditor.vue` queda reducido a la orquestación Vue (objetivo orientativo: < 300 líneas).
- Ninguna extensión/tema/linter/lenguaje queda duplicado: cada uno vive en un único módulo reutilizable.
- Los módulos extraídos se pueden importar de forma independiente (p. ej. `highlightExtension`, `codeEditorTheme`, `languageLoaders`) sin montar el componente.
- `extensions` permite añadir extensiones propias y reacciona a cambios.
- El comportamiento visible del editor es idéntico al actual.
- La verificación manual (apartado anterior) queda satisfecha y `AGENTS.frontend.md` §9 queda actualizada.

---

## Riesgos y decisiones

| Riesgo / decisión | Mitigación |
| --- | --- |
| Romper el code splitting de lenguajes | Mantener los `import()` dinámicos dentro de `languages.ts` y `lint/*.ts`. |
| El linter JSON necesita `$t` | `createJsonLintSource(formatDuplicateKey)` recibe un formateador construido con `$t`; las claves i18n no cambian. |
| Romper `CommandForm.vue` (importa `CodeHighlighter`) | Re-exportar tipos/constantes desde `CodeEditor.vue`; verificar compilación. |
| Extensiones propias que colisionen con las internas | Se aplican al final y en un compartimento aislado; el consumidor decide el orden dentro de su array. |
| Dependencias circulares entre módulos | `types.ts` no importa nada del proyecto; `theme.ts` no importa `setup.ts`; el barrel solo re-exporta. |
| `noUnusedLocals`/`noUnusedParameters` | Revisar imports tras cada fase (revisión manual del IDE). |
| Mover `completion.ts` de variables a `plugins/` | Se mueve a `src/plugins/codemirror/autocomplete/variables.ts`; solo tiene un consumidor (`CommandForm.vue`), cuyo import se actualiza. No se mantiene un re-export en la ruta antigua para evitar duplicidad. |
| ¿Extraer también el ciclo de vida del editor a un composable? | **Fuera de alcance inicial.** Si al terminar el componente sigue siendo grande, se evaluará en una tarea aparte; el objetivo de esta tarea es extraer extensiones. |

---

## Registro de ejecución

**Fecha:** 2026-11-11
**Estado:** implementación completada; pendiente de verificación manual por el usuario.

### Cambios realizados

- Creada la carpeta `src/plugins/codemirror/` con:
  - `types.ts`, `theme.ts`, `highlight.ts`, `editable.ts`, `setup.ts`, `languages.ts` y `index.ts`.
  - `lint/{index,json,yaml}.ts`.
  - `autocomplete/{index,variables}.ts`.
  - `bash/{blocks,format}.ts`.
- Movido `src/utils/interpolation/completion.ts` → `src/plugins/codemirror/autocomplete/variables.ts` (sin cambios de lógica).
- Actualizado `src/components/form/CommandForm.vue` para importar el autocompletado desde la nueva ubicación.
- Reescrito `src/components/form/textareas/CodeEditor.vue` (317 líneas) para consumir los módulos extraídos:
  - Importa `CodeLanguage` y `CodeHighlighter` desde `@/plugins/codemirror/types`; el re-export público de `CODE_LANGUAGES`, `CodeLanguage`, `CodeHighlightRange` y `CodeHighlighter` vive en el barrel `src/plugins/codemirror/index.ts` (el componente ya no los re-exporta; `CommandForm.vue` los importa directamente de `@/plugins/codemirror/types`).
  - Añadida la prop `extensions?: Extension | readonly Extension[]`, gestionada por un `Compartment` propio y reactiva a cambios.
- Actualizado `AGENTS.frontend.md` §1 (nueva carpeta `src/plugins/`) y §9 (estructura de módulos, props `autocomplete`/`highlight`/`extensions`, autocompletado de variables movido).

### Desviaciones respecto al plan

- `createLintLoader` recibe un formateador `formatDuplicateKey: (key: string) => string` en lugar de `t` directamente, para no acoplar los plugins de CodeMirror a i18n. `CodeEditor.vue` le pasa el formateador construido con `$t`.
- `createBaseExtensions` no incluye el facet `EditorView.darkTheme`; se expone aparte como `createDarkThemeExtension(dark)` para que el componente pueda reconfigurarlo en su propio `Compartment`.
- `extensions` no se normaliza a array: el tipo `Extension` de CodeMirror ya admite `readonly Extension[]`, así que se pasa `props.extensions ?? []` directamente al `Compartment`. Evita depender del estrechamiento de `Array.isArray` sobre arrays readonly y simplifica el componente.
- No se han ejecutado comandos de verificación (build, dev server, etc.): la verificación queda en el checklist manual del apartado anterior.

---

## Iteración 2: `basicSetup` → `createBaseExtensions`

**Fecha:** 2026-11-11
**Estado:** implementación completada; pendiente de verificación manual por el usuario.

### Motivación (instrucción del usuario)

> Creo que la mejor opción es trasladar la lógica de `basicSetup` al `createBaseExtensions`, para así poder personalizar su uso.

### Cambios realizados

- `src/plugins/codemirror/setup.ts`: `createBaseExtensions` compone explícitamente todas las extensiones de `basicSetup` (`codemirror`), con un toggle por funcionalidad (todos activos por defecto para conservar el comportamiento):
  - `lineNumbers` (gutter + `highlightActiveLineGutter`), `history`, `foldGutter`, `closeBrackets`, `search`, `autocomplete`, `multipleSelections`.
  - Keymaps asociados a cada toggle y en el mismo orden que `basicSetup` (`closeBracketsKeymap` **antes** de `defaultKeymap` para que Backspace borre el par completo), más `lintKeymap` e `indentWithTab`.
  - Se mantienen siempre: `highlightSpecialChars`, `drawSelection`, `dropCursor`, `indentOnInput`, `bracketMatching`, `highlightActiveLine`, `tabSize`, `indentUnit`, tema, `syntaxHighlighting(codeHighlightStyle)` y placeholder.
  - La búsqueda usa `search()` (aporta el `searchState` que necesita el panel de `Ctrl+F`) + `highlightSelectionMatches()`.
- `src/components/form/textareas/CodeEditor.vue`: eliminado `import { basicSetup } from 'codemirror'`; ahora pasa `lineNumbers`, `tabSize` y `placeholder` a `createBaseExtensions` (antes eran props muertas).
- `src/plugins/codemirror/theme.ts`: se elimina la dependencia implícita del `defaultHighlightStyle` de `basicSetup`; `codeHighlightStyle` cubre sus tags con tokens `--ui-*` (`regexp`, `escape`, `meta`, `processingInstruction`, `link`, `url`, `heading`, `emphasis`, `strong`, `strikethrough`, `inserted`, `deleted`, `namespace`, `macroName`, `special`/`local(variableName)`). Añadidos estilos de `.cm-specialChar`, `.cm-selectionMatch(-main)`, `.cm-searchMatch(-selected)`, `.cm-foldPlaceholder`, `.cm-textfield`, `.cm-button` y el botón de cierre del panel de búsqueda.
- `package.json` / `bun.lock`: `+@codemirror/search ^6.7.2`, `-codemirror ^6.0.2` (ya no se importa el meta-paquete).
- `AGENTS.frontend.md` §9: actualizada la lista de dependencias, los re-exports, la nueva viñeta «Base del editor (`setup.ts`)» con los toggles, los lenguajes sin linter y los widgets de tema.

### Pendiente de decisión

- ~~¿Desactivar `closeBrackets` (y/o `foldGutter`) para el editor de comandos bash?~~ **Decidido (2026-11-11):** se mantiene todo activo. Si más adelante molesta el auto-cierre en bash, basta con exponer un toggle en `CodeEditor.vue` y pasarlo a `createBaseExtensions`.

---

## Iteración 3: autocompletado aditivo y por lenguaje

**Fecha:** 2026-11-11
**Estado:** implementación completada; pendiente de verificación manual por el usuario.

### Motivación (instrucción del usuario)

> Creo que para agregar extensiones es complicado, por ejemplo, los lenguajes javascript, html, php… ¿tienen autocompletado? ¿cómo se le agrega?

### Hallazgos

- `autocompletion()` (ya en `createBaseExtensions`) sin `override` lee las fuentes declaradas por cada lenguaje en `languageData`:
  - **JavaScript** (`javascript()`): `completeFromList(snippets + keywords)` y `localCompletionSource` (variables/propiedades del ámbito). **Sí trae**.
  - **HTML** (`html()`): `htmlCompletionSourceWith(config)` (etiquetas, atributos) más JS y CSS anidados. **Sí trae**.
  - **PHP** (`php()`): no declara ninguna fuente (los bloques HTML anidados sí completan). **No trae**.
  - **JSON**, **YAML** y **Bash** (`StreamLanguage`): **no traen**.
- La prop `autocomplete` usaba `autocompletion({ override: [source] })`, que **anulaba** las fuentes del lenguaje (no se notaba en bash porque no tiene).

### Cambios realizados

- `src/plugins/codemirror/autocomplete/index.ts`:
  - `createAutocompleteExtension` ahora registra la fuente con `EditorState.languageData.of(() => [{ autocomplete: source }])` (aditiva, sin `override`).
  - Nuevo helper `withAutocomplete(language, source)` → `language.data.of({ autocomplete: source })` para añadir completado a un lenguaje concreto (PHP, JSON, YAML, Bash…).
- `src/plugins/codemirror/index.ts`: re-exporta `withAutocomplete`.
- `AGENTS.frontend.md` §9: nueva viñeta «Autocompletado por lenguaje» (qué lenguajes traen fuentes y cómo añadir una) y matizado que la prop `autocomplete` ya no sustituye.

---

## Iteración 4: autocompletado básico de PHP

**Fecha:** 2026-11-11
**Estado:** implementación completada; pendiente de verificación manual por el usuario.

### Instrucción del usuario

> Si añádelo, pero algo básico, que dependa mínimamente de la versión de PHP.

### Cambios realizados

- Nuevo `src/plugins/codemirror/autocomplete/php.ts`:
  - `phpCompletions`: lista conservadora de keywords, funciones (strings, arrays, ficheros, tipos, fechas, utilidades), clases/excepciones, constantes, superglobales y métodos mágicos. Mínimo real **PHP 7.0** (lo único 7.0 es `Throwable`; el resto es de PHP 5); **nada de 8.x** (`str_contains`, `match`, `enum`, `readonly`, `array_key_first`, `random_int`…).
  - `phpCompletionSource`: prefijo `[$\w]*` (permite `$_GET`, `$this`), no se abre solo sin prefijo (sí con `Ctrl+Espacio`), `validFor` para no re-consultar en cada tecla y **no completa** dentro de comentarios, cadenas/heredoc ni el HTML del template (nodos `LineComment`, `BlockComment`, `String`, `HeredocString`, `ShellExpression`, `Text`).
- `languages.ts`: el loader de `php` compone `[php(), withAutocomplete(phpLanguage, phpCompletionSource)]` con `import()` dinámico de la lista (mantiene el code splitting).
- `index.ts`: re-exporta `phpCompletionSource`.
- `AGENTS.frontend.md` §9: añadido `autocomplete/php.ts` a la estructura y actualizada la viñeta «Autocompletado por lenguaje».

### Verificación realizada

- `bunx vue-tsc --noEmit` sin errores.
- Prueba headless con `EditorState` + `php()`: `str_` → `str_pad`, `str_repeat`, `str_replace`…; `$_` → `$_COOKIE`, `$_ENV`, `$_FILES`…; `new Date` → `DateTime`, `DateInterval`…; sin resultados en comentarios, cadenas ni HTML externo; `Ctrl+Espacio` con prefijo vacío muestra la lista completa.

---

## Cierre (2026-11-12)

**Plan completado.** Las iteraciones 1–4 están implementadas y el usuario da por cerrada la tarea, aceptando el checklist manual de verificación en UI.

### Revisión final por inspección

- Estructura de `src/plugins/codemirror/` completa y coherente con el diseño (`types`, `theme`, `highlight`, `editable`, `setup`, `languages`, `lint/*`, `autocomplete/*` —incluido `php.ts`—, `bash/*`, `index.ts`).
- Sin referencias a rutas antiguas (`src/utils/interpolation/completion.ts`) ni al meta-paquete `codemirror`/`basicSetup` fuera de comentarios explicativos.
- `CodeEditor.vue`: 317 líneas (criterio orientativo «< 300»; se acepta por ser solo orquestación Vue y plantilla).
- `AGENTS.frontend.md` §9 actualizado con estructura, props, dependencias, tema y autocompletado por lenguaje.
- `bunx vue-tsc --noEmit`: los módulos de este plan compilan sin errores. Persiste un único error **ajeno** al plan: `src/utils/tiptap/SchemaSanitizerExtension.ts` no encuentra `@tiptap/pm/model` (archivo fuera de git y resto del editor Tiptap retirado; no hay dependencias `@tiptap/*` en `package.json`). Pendiente de limpieza en una tarea aparte.
