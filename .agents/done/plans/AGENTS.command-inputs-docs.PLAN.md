# Plan: Parámetros de entrada en comandos (5/5) — documentación y changelog

## Estado

**Terminado** — el usuario lo dio por completado el 2026-11-18. Verificación manual (`bunx vue-tsc --noEmit`, `bun run build` y, para la documentación, `cd docs && bun run build`) pendiente de que la ejecute el usuario.

**Diseño de origen:** `.agents/done/designs/AGENTS.command-inputs.DESIGN.md` (aprobado el 2026-11-18). Corresponde al bloque 5 de §7 del diseño y a la sección «Documentación a actualizar» de `AGENTS.md`.

**Dependencias:** planes 1 a 4. La documentación describe el comportamiento ya implementado.

**Orden de ejecución:** quinto y último de los cinco planes.

---

## Instrucciones dadas (verbatim)

> "Vamos a aparcar esto, y a mejorar el módulo de comandos. Para que pueda tener inputs de entrada"

> "Están bien esas decisiones que tomaste. Ahora crea el plan de implementación de esto."

Contexto aportado por el agente (análisis previo):

- `docs/content/es/005.commands/` tiene cinco páginas (`1.overview`, `2.manage`, `3.parsers`, `4.testing`, `5.built-in`); no existe `docs/content/en/005.commands/`.
- `docs/content/es/005.commands/4.testing.md:15` afirma que la salida se muestra **en streaming**, pero el runner descarta los `OutputChunk` y la salida aparece al terminar; la frase es incorrecta y hay que corregirla.
- El changelog está en `docs/content/{es,en}/.changelog/`, con ramas `0.1.x`–`0.3.x`; `package.json` ya declara `0.4.0` y no existe la rama `0.4.x`.
- `AGENTS.frontend.md` no documenta el módulo de inputs; `AGENTS.md` tiene una sección de *Gotchas* donde encaja una nota corta.

---

## Objetivo

Documentar la funcionalidad y dejar el proyecto coherente:

- Nueva página de documentación de parámetros de entrada, enlazada desde visión general, gestión y pruebas.
- Corrección de la afirmación falsa sobre streaming.
- Nota técnica en `AGENTS.frontend.md` y *gotcha* en `AGENTS.md`.
- Entrada de changelog de la versión `0.4.0` (rama `0.4.x`).

**No entra en este plan:** crear la sección inglesa de comandos (no existe hoy), traducir las cinco páginas existentes, documentar las mejoras aplazadas (§9 del diseño: streaming, `fail_on_nonzero`, `module`/`submodule`) ni redactar notas de otras funcionalidades de `0.4.0`.

---

## Contexto técnico actual

| Elemento | Estado real |
| --- | --- |
| Páginas de comandos | `docs/content/es/005.commands/{1.overview,2.manage,3.parsers,4.testing,5.built-in}.md`, con frontmatter `title`, `description`, `navigation.icon`, `label`, `since`. |
| Navegación | `docs/content/es/005.commands/.navigation.yml`: `title: Comandos`, `icon: i-tabler-terminal-2`. El orden lo da el prefijo numérico del archivo. |
| Testing | `4.testing.md` describe host, salida y exit code; incluye la frase incorrecta «salida en streaming» (`:15`) y no menciona parámetros. |
| Changelog | `docs/content/es/.changelog/{0.1.x,0.2.x,0.3.x}/` + `index.yaml`; `en` tiene la misma estructura. Cada rama tiene `index.yaml` y un `.md` por versión. |
| Versión | `package.json` → `0.4.0`; el último changelog es `0.3.0` (2026-11-17). |
| Guías internas | `AGENTS.frontend.md` §3 (convenciones), §6 (comandos Tauri) y §9 (`CodeEditor`); `AGENTS.md` sección *Gotchas*. |

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-18 | **Página nueva `6.inputs.md`** en lugar de inflar `2.manage.md`: los parámetros tienen suficientes reglas (tipos, referencias, defaults, listas, comillas) para una página propia. |
| 2026-11-18 | **Enlaces desde las páginas existentes**: `1.overview` (qué guarda un comando), `2.manage` (cómo se editan) y `4.testing` (cómo se rellenan al probar). |
| 2026-11-18 | **Solo español.** `docs/content/en` no tiene sección de comandos; crear una traducción completa queda fuera de este plan. |
| 2026-11-18 | **Corregir la mentira del streaming** en `4.testing.md`; la salida se muestra al terminar y el streaming está en §9 del diseño. |
| 2026-11-18 | **Changelog `0.4.x` con `0.4.0.md`**, fecha provisional 2026-11-18. Se documenta solo esta funcionalidad; las demás notas de `0.4.0` se añadirán al preparar la release. |
| 2026-11-18 | **Espejo del changelog en inglés** (`docs/content/en/.changelog/0.4.x/`) para no dejar la rama solo en un idioma; no se traduce la sección de comandos. |
| 2026-11-18 | **`AGENTS.frontend.md`**: nueva subsección al final de §3 con el contrato, la raíz `params` y las reglas de defaults/listas. **`AGENTS.md`**: un *gotcha* corto que apunte a esa subsección. |

**Alternativas descartadas:**

- **Documentar todo en `2.manage.md`**: la página quedaría desequilibrada y mezclaría gestión con sintaxis.
- **Crear `docs/content/en/005.commands/`**: traducción completa fuera de alcance; se haría en un plan de documentación aparte.
- **Añadir la entrada a `0.3.x`**: la versión del proyecto ya es `0.4.0` y la funcionalidad no estaba en `0.3.0`.

---

## Problemas y riesgos encontrados

### P1 — La documentación de testing afirma streaming

- `4.testing.md:15` dice «muestra la salida en streaming»; el runner actual descarta los chunks.
- **→ Riesgo MEDIO.** Corregir la frase y no prometer streaming en la página nueva. Si se implementa después (diseño §9), se actualizará.

### P2 — Reglas de comillas y listas mal explicadas

- Una lista entrecomillada llega como un único argumento; una expresión de lista sin comillas depende del shell. Es fácil documentarlo mal.
- **→ Riesgo MEDIO.** Incluir dos ejemplos contiguos (valor único entrecomillado y lista sin comillas) y la comprobación `[ -n "…" ]` para listas vacías, copiados del §6.1.1 del diseño.

### P3 — Changelog de una versión no cerrada

- `0.4.0` aún no tiene changelog y puede incluir más cambios; una entrada incompleta puede parecer definitiva.
- **→ Riesgo BAJO.** Indicar en el historial del plan que la fecha y el contenido son provisionales y que la release debe completar la nota.

### P4 — Enlaces entre páginas

- Docus resuelve enlaces relativos (`./inputs`); un nombre de archivo mal referenciado rompe la navegación.
- **→ Riesgo BAJO.** Usar enlaces relativos como el resto del módulo (`[Parsers](./parsers)`, `[Testing](./testing)`) y comprobar la página generada.

### P5 — Desfase entre guías internas y código

- `AGENTS.frontend.md` y `AGENTS.md` deben describir el estado final, no el plan.
- **→ Riesgo MEDIO.** Redactar la documentación después de los planes 1–4 y revisar nombres de archivo (`src/utils/inputs/`, `InputsForm.vue`) contra el código real.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Página nueva `docs/content/es/005.commands/6.inputs.md`

1. Frontmatter siguiendo el módulo:
   ```yaml
   ---
   title: Parámetros de entrada
   description: Declarar parámetros en un comando y rellenarlos al ejecutarlo en {{project_name}}.
   navigation:
     icon: i-tabler-forms
   label: beta
   since: '0.4'
   ---
   ```
2. Secciones:
   - **Qué es un parámetro**: se declara en el comando, se pide al ejecutar y se interpola con `{{params.<key>}}`; no se guarda el valor.
   - **Tipos**: `text`, `number`, `boolean`, `select`; cuándo usar cada uno.
   - **Definir parámetros**: sección «Parámetros de entrada» del formulario; `key` (slug), `label`, `required`, `default`, `help`, `options`.
   - **Referenciar en el script**: ejemplo con `{{params.remote_dir}}`; el linter y el autocompletado.
   - **Valores por defecto**: literal o `{{global.slug}}`; solo variables globales habilitadas y no secretas; no se admiten dependencias entre parámetros.
   - **Listas**: sin tipo `list`; texto separado por espacios, sin comillas en la expresión de la lista, `[ -n "…" ]` para comprobar vacío, y validación de elementos por el llamante. Ejemplo de `update_packages`.
   - **Seguridad**: los valores no se persisten; el entrecomillado es responsabilidad del autor; los secretos siguen en variables globales.
   - **Límites**: máximo 20 parámetros, sin ficheros, sin inputs secretos.
3. Enlazar a [Parsers](./parsers) y [Testing](./testing) donde corresponda.

### Fase 2 — Actualizar las páginas existentes

1. `1.overview.md`: añadir «Parámetros de entrada» a la lista de lo que guarda un comando, con enlace a `./inputs`.
2. `2.manage.md`: mencionar la sección del formulario al crear/editar y enlazar a `./inputs`; aclarar que los valores se piden al ejecutar y no se guardan.
3. `4.testing.md`:
   - Añadir el paso «rellena los parámetros» al flujo del diálogo.
   - Explicar que los defaults se aplican al abrir y que un requerido ausente bloquea la ejecución.
   - **Corregir** «salida en streaming» por «la salida se muestra al terminar la ejecución».
   - Mantener el resto (host, exit code, diferencias guardado/ad-hoc).
4. `5.built-in.md`: sin cambios salvo que se mencione que los comandos internos no declaran parámetros (opcional, solo si encaja).

### Fase 3 — Guías internas

1. `AGENTS.frontend.md`: nueva subsección al final de §3, por ejemplo «Parámetros de entrada de comandos (`src/utils/inputs/`)», con:
   - `deployer_commands.inputs` es JSON `InputFieldDefinition[]`; el contrato se comparte con los futuros flujos.
   - El script usa `{{params.<key>}}`; el runner aplica defaults y valida `required`.
   - Los defaults solo resuelven `{{global.<slug>}}` no secretas.
   - Las listas se pasan como texto separado por espacios; el entrecomillado lo decide el autor.
   - `InputsForm.vue` es el render compartido; `CommandInputsEditor.vue` es solo la definición.
2. `AGENTS.md`: añadir un *gotcha* corto que resuma lo anterior y enlace a `AGENTS.frontend.md` (sin duplicar el detalle).

### Fase 4 — Changelog `0.4.x`

1. Crear `docs/content/es/.changelog/0.4.x/index.yaml` copiando la estructura de `0.3.x`:
   ```yaml
   branch: 0.4.x
   title: Versiones 0.4.x
   description: |
     Explora todas las versiones de la rama 0.4.x...
   security: true
   requirements:
     op: ['Windows']
     support: bugs
   ```
2. Crear `docs/content/es/.changelog/0.4.x/0.4.0.md`:
   - Frontmatter `version: '0.4.0'`, `branch: '0.4.x'`, `date: '2026-11-18'` (provisional), `title: 'Versión 0.4.0'`, `description` y `authors: idmarinas`.
   - Sección «Destacados de la versión» con **Parámetros de entrada en comandos**: columna `inputs`, cuatro tipos, `{{params.*}}`, defaults con variables globales y diálogo de ejecución con validación y vista previa.
   - Sección de notas con el resto de cambios pendiente de completar al preparar la release.
3. Crear el espejo `docs/content/en/.changelog/0.4.x/index.yaml` y `0.4.0.md` con la misma entrada traducida; no crear páginas de comandos en inglés.

### Fase 5 — Revisión de coherencia

1. Revisar que los nombres de archivo, componentes y claves i18n citados existen realmente tras los planes 1–4.
2. Revisar que ninguna página promete streaming, inputs secretos, tipo `list` o persistencia de valores.
3. Revisar que los ejemplos de comillas y listas coinciden con el §6.1.1 del diseño.
4. Pedir al usuario que compile la documentación (`cd docs` y `bun run build`) si quiere validar la navegación.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `docs/content/es/005.commands/6.inputs.md` | **Nuevo.** Página de parámetros de entrada. |
| `docs/content/es/005.commands/1.overview.md` | «Parámetros de entrada» en lo que guarda un comando + enlace. |
| `docs/content/es/005.commands/2.manage.md` | Editor de parámetros al crear/editar + enlace. |
| `docs/content/es/005.commands/4.testing.md` | Flujo con parámetros; corregir la afirmación de streaming. |
| `docs/content/es/005.commands/5.built-in.md` | Nota opcional sobre comandos internos sin parámetros. |
| `docs/content/es/007.variables/2.interpolation.md` | Ámbitos disponibles (`global` y `params`) en la nota y el autocompletado. |
| `docs/content/es/002.app/5.workflow.md` | Fila de `deployer_commands` con los parámetros de entrada. |
| `docs/content/es/.changelog/0.4.x/index.yaml` | **Nuevo.** Rama `0.4.x`. |
| `docs/content/es/.changelog/0.4.x/0.4.0.md` | **Nuevo.** Entrada provisional de `0.4.0`. |
| `docs/content/en/.changelog/0.4.x/index.yaml` | **Nuevo.** Espejo en inglés. |
| `docs/content/en/.changelog/0.4.x/0.4.0.md` | **Nuevo.** Espejo en inglés. |
| `AGENTS.frontend.md` | Subsección de parámetros de entrada en §3. |
| `AGENTS.md` | *Gotcha* corto sobre `inputs` y `{{params.*}}`. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. La página `Comandos → Parámetros de entrada` aparece en la navegación después de «Comandos internos».
2. Los enlaces desde visión general, gestión y pruebas llevan a la página nueva.
3. Los ejemplos de `{{params.*}}`, defaults con `{{global.*}}` y listas separadas por espacios se entienden sin leer el diseño.
4. La página de testing ya no dice «streaming» y explica que la salida aparece al terminar.
5. El changelog muestra la rama `0.4.x` y la versión `0.4.0` en español e inglés.
6. `AGENTS.frontend.md` y `AGENTS.md` describen el comportamiento real (nombres de archivo y componentes correctos).
7. `cd docs && bun run build` termina sin errores de enlaces ni de frontmatter (si el usuario lo ejecuta).

---

## Criterios de aceptación

- [ ] Existe `docs/content/es/005.commands/6.inputs.md` con tipos, referencias, defaults, listas, seguridad y límites.
- [ ] Las páginas 1, 2 y 4 enlazan a la nueva página y describen el flujo con parámetros.
- [ ] La afirmación de salida «en streaming» está corregida.
- [ ] No se documenta ningún tipo `list`, input secreto ni persistencia de valores.
- [ ] Los ejemplos de comillas/listas coinciden con el diseño.
- [ ] `AGENTS.frontend.md` y `AGENTS.md` quedan actualizados sin duplicar el detalle.
- [ ] Existe la rama de changelog `0.4.x` con la entrada `0.4.0` en español e inglés.
- [ ] No se crea una sección inglesa de comandos ni se traducen las páginas existentes.

### Desviaciones

- También se actualiza `docs/content/es/007.variables/2.interpolation.md`: el «note» decía que la aplicación solo suministra `global`, y el bloque de autocompletado solo listaba `global`. Tras el plan 2 existen `global` y `params`; dejar la página sin tocar habría documentado un comportamiento falso.
- `4.testing.md` se reescribe algo más de lo previsto: además de quitar «streaming», se separan los botones Test de alta (ad-hoc) y de edición (definición guardada) y se añade un `::note` con la limitación de que, en edición, la vista previa usa los parámetros del formulario pero la ejecución usa la definición guardada.
- La entrada de changelog no cita hashes de commit: la funcionalidad aún no está confirmada en git. Se deja además un comentario HTML al final para completar el resto de notas de `0.4.0` al preparar la release.
- `5.built-in.md` incluye la nota de que los comandos de semilla no declaran parámetros, para que el lector no espere el bloque en el diálogo.
- En `AGENTS.frontend.md` la subsección se añade como `### Parámetros de entrada de comandos (...)` al final de §3 (antes de §4b), no como sección nueva de nivel 2.
- Se actualiza también el resumen de entidades de `docs/content/es/002.app/5.workflow.md` para incluir los parámetros en la fila de `deployer_commands`.
- Los iconos nuevos (`moveUp`, `moveDown`, `alertCircle`) se centralizan en `ICONS` (`src/utils/icons.ts`) en lugar de dejar literales `i-tabler-*` en los componentes, siguiendo el §4b de `AGENTS.frontend.md`.
- En `6.inputs.md` se indica que el `value` de una opción de `select` debe ser único **y no vacío** (el schema lo rechaza tras la corrección del `USelect`).

---

## Puntos abiertos

1. **Fecha y contenido de `0.4.0`:** la entrada se crea con fecha provisional y solo con esta funcionalidad; al preparar la release hay que completar el resto de notas y ajustar la fecha.
2. **Sección inglesa de comandos:** si se quiere paridad de idiomas, hace falta un plan de traducción de las seis páginas (cinco existentes + la nueva).
3. **Streaming:** cuando se implemente el plan aplazado, hay que volver a tocar `4.testing.md` (la página nueva no describe la salida, así que no depende de ello).

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-18 | Plan creado en estado **Planificando**. |
| 2026-11-18 | Ejecutado: `6.inputs.md`; enlaces y flujo con parámetros en `1.overview`, `2.manage` y `4.testing` (streaming corregido); nota en `5.built-in`; ámbitos `params` en `007.variables/2.interpolation`; subsección en `AGENTS.frontend.md` §3, gotcha en `AGENTS.md`; rama `0.4.x` con `0.4.0` en es/en. Estado **Ejecutando**, pendiente de verificación manual. |
| 2026-11-18 | El usuario lo dio por completado. Estado **Terminado**; plan archivado en `.agents/plans.done/`. Verificación manual pendiente. |
