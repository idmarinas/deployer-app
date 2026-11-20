# Plan: Parámetros de entrada en comandos (1/5) — modelo y contrato

## Estado

**Terminado** — el usuario lo dio por completado el 2026-11-18. Verificación manual (`bunx vue-tsc --noEmit`, `bun run build`) pendiente de que la ejecute el usuario.

**Diseño de origen:** `.agents/done/designs/AGENTS.command-inputs.DESIGN.md` (aprobado el 2026-11-18). Corresponde al bloque 1 de §7 del diseño.

**Orden de ejecución:** este plan es el primero de cinco. Los planes 2 a 5 dependen de la columna y del contrato creados aquí.

---

## Instrucciones dadas (verbatim)

> "Vamos a aparcar esto, y a mejorar el módulo de comandos. Para que pueda tener inputs de entrada"

> "Están bien esas decisiones que tomaste. Ahora crea el plan de implementación de esto."

Contexto aportado por el agente (análisis previo):

- El motor de interpolación ya reserva la raíz `params` (`src/utils/interpolation/types.ts:10`); no hay que tocarlo.
- `deployer_commands.parser` es el precedente de columna JSON (`src/drizzle/entities/commands.ts:13`).
- El contrato se comparte con los flujos de nodos: `.agents/designs/AGENTS.node-workflows.DESIGN.md` §8.1 ya define `WorkflowInput`.
- `bun run drizzle:generate --name <nombre>` genera la migración y la aplana a `src-tauri/migrations/`; es un generador y requiere permiso del usuario antes de ejecutarlo.

---

## Objetivo

Crear el soporte de datos y el contrato compartido de los parámetros de entrada de un comando:

- Columna JSON `inputs` en `deployer_commands`, con `[]` por defecto.
- Módulo `src/utils/inputs/` con los tipos y el schema Zod del contrato (sin resolución de defaults todavía).
- `CommandDefinition.inputs` y lectura de la columna en `runCommand`.
- Validación del campo en el formulario y seed de la columna.

**No entra en este plan:** resolver `default` con `{{global.slug}}` (plan 2), inyectar `params` en la interpolación (plan 2), editor visual (plan 3), diálogo de ejecución (plan 4) ni documentación (plan 5). Tampoco entran tipos nuevos (`list`, `host`, `textarea`).

---

## Contexto técnico actual

| Elemento | Estado real |
| --- | --- |
| Tabla | `src/drizzle/entities/commands.ts:6-21`. Columnas `key`, `name`, `description`, `command`, `parser` (JSON), `timeout`, `custom`, `enabled`, `internal`, timestamps. Sin `inputs`. |
| Tipo de entidad | `src/types/entities.ts:3` → `typeof commands.$inferSelect`. Añadir la columna amplía `Command` automáticamente. |
| Definición del runner | `src/utils/commands/types.ts:8-19`: `id`, `name`, `command`, `parser`, `timeout_secs`. |
| Carga en el runner | `src/utils/commands/runner.ts:48-54` construye `CommandDefinition` desde la fila. |
| Validación | `src/composables/validation/useCommandValidation.ts:18-87` usa `createInsertSchema` / `createUpdateSchema` de `drizzle-orm/zod` con refinamientos por campo. |
| Seed | `src/composables/deployer/seed_data/commands.ts:154-171`: `seedColumns` y `resetColumns` enumeran las columnas sincronizadas. |
| Estado inicial del alta | `src/pages/dashboard/commands/add.vue:33-44` enumera los campos del formulario. |
| Migraciones | `drizzle.config.ts` → `out: './migrations'`; el script `bun run drizzle:generate` genera y aplana a `src-tauri/migrations/`. sqlx las embebe. |
| i18n | Carga por globs de carpeta (`src/locales/_loader.ts:26-29`): un archivo nuevo `utils/inputs.ts` crea la clave `utils.inputs.*` sin registro manual. |

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-18 | **Columna JSON, no tabla hija.** `inputs: text({ mode: 'json' }).$type<InputFieldDefinition[]>().notNull().default([])`, con el precedente de `parser`. |
| 2026-11-18 | **Contrato compartido con los flujos.** Los tipos viven en `src/utils/inputs/types.ts`; `InputFieldType` solo admite `text`, `number`, `boolean` y `select` en la v1. |
| 2026-11-18 | **Schema Zod compartido.** `createInputFieldSchema()` / `createInputFieldsSchema()` en `src/utils/inputs/schema.ts`, reutilizados por el formulario y por el runner. |
| 2026-11-18 | **Validación estática y dinámica separadas.** Este plan valida forma, unicidad de claves, coherencia de `default` con el tipo y raíz permitida (`global`). La existencia/habilitación/no-secret de la variable global se valida en el plan 2 (`resolveInputDefaults`). |
| 2026-11-18 | **`inputs` en seed.** Se añade a `seedColumns` y `resetColumns` para que restaurar predeterminados sincronice también los parámetros. |
| 2026-11-18 | **Sin cambios en Rust.** `query_raw` no necesita conocer la columna; el proxy de Drizzle serializa el JSON. |

**Alternativas descartadas:**

- **Tabla hija `deployer_command_inputs`**: añade CRUD, orden y sincronización con el comando; el contrato se puede migrar después sin cambiar el JSON.
- **Definir el contrato dentro de `src/utils/commands/`**: obligaría a duplicarlo cuando lleguen los flujos de nodos.
- **Validar con `createInsertSchema` sin refinamiento**: el tipo generado para una columna JSON es demasiado laxo y no comprueba `key` únicas ni coherencia de `default`.

---

## Problemas y riesgos encontrados

### P1 — Valor por defecto de la columna en filas existentes

- SQLite debe rellenar `inputs` con `'[]'` en las filas ya creadas; un `NULL` rompería `row.inputs.map(...)`.
- **→ Riesgo MEDIO.** `NOT NULL DEFAULT '[]'` en la definición de Drizzle y comprobar el SQL generado antes de aplicar. Verificación manual con un comando existente.

### P2 — Tipo Zod generado para la columna JSON

- `createInsertSchema` puede inferir la columna como `z.unknown()`/`z.any()` y no validar los elementos.
- **→ Riesgo MEDIO.** Sobrescribir el campo `inputs` en insert y update con `createInputFieldsSchema().default([])`, sin confiar en la inferencia.

### P3 — Migración con recreación de tabla

- drizzle-kit puede generar `CREATE TABLE ... INSERT ... DROP ...` en lugar de un `ALTER TABLE ADD COLUMN`.
- **→ Riesgo BAJO.** Es aceptable si conserva los datos y los índices (`deployer_command_unq_name`, PK `key`); revisar el SQL generado y probar con una BD con comandos.

### P4 — Colisión de nombres con `parser`

- El nuevo módulo se llama `inputs`, pero ya existe un ámbito `params` en interpolación; usar el mismo nombre para el campo del formulario y la raíz evita confusión.
- **→ Riesgo BAJO.** Documentar en el tipo que `key` se usa como `{{params.<key>}}`.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Módulo compartido `src/utils/inputs/`

1. Crear `src/utils/inputs/types.ts`:
   - `InputFieldType = 'text' | 'number' | 'boolean' | 'select'`
   - `InputFieldOption { label: string; value: string | number }`
   - `InputFieldDefinition { key, label, type, required, default?, options?, help? }`
   - `InputValues = Record<string, string | number | boolean>`
2. Crear `src/utils/inputs/schema.ts`:
   - Constantes `INPUT_KEY_PATTERN = /^[a-z][a-z0-9_]*$/` y `MAX_INPUT_FIELDS = 20`.
   - `createInputFieldSchema()` con `superRefine`: `key` con formato, `label` no vacío, `select` con `options` no vacías y valores únicos, `default` coherente con el tipo (booleano ↔ booleano, número ↔ numérico, `select` ∈ `options`), `default` de tipo cadena solo puede contener expresiones `{{global.<slug>}}` (validar con `findReferences`; cualquier otra raíz es error).
   - `createInputFieldsSchema()` como array con máximo y `key` únicas.
   - `coerceInputValue(field, value)` para number/boolean/select, reutilizable por el plan 2.
   - `validateInputValues(fields, values): InputValueIssue[]` con `{ key, code, messageKey, messageParams }`; `required` considera presentes `false` y `0`, y ausente `undefined`, `null` y cadena vacía.
3. Crear `src/utils/inputs/index.ts` con las reexportaciones (mismo patrón que `src/utils/interpolation/index.ts`).
4. Crear `src/locales/es/utils/inputs.ts` y `src/locales/en/utils/inputs.ts` con los mensajes usados por `schema.ts` (`errors.key_format`, `errors.key_duplicate`, `errors.label_required`, `errors.options_required`, `errors.option_duplicate`, `errors.default_type`, `errors.default_scope`, `errors.too_many`, y `value_required` / `value_invalid`). Dejar preparadas las claves `default_unknown`, `default_disabled` y `default_secret` para el plan 2.

### Fase 2 — Columna y migración

1. Añadir a `src/drizzle/entities/commands.ts`:
   ```ts
   inputs: text({ mode: 'json' }).$type<InputFieldDefinition[]>().notNull().default([]),
   ```
2. Ejecutar (con permiso del usuario) `bun run drizzle:generate --name commands_inputs`.
3. Revisar el `.sql` generado en `migrations/` y el aplanado en `src-tauri/migrations/`: `NOT NULL DEFAULT '[]'`, sin pérdida de datos ni índices.
4. No editar `src/drizzle/schema.ts` ni `src/drizzle/relations.ts` (autogenerados).

### Fase 3 — Tipos del runner y validación

1. En `src/utils/commands/types.ts`, añadir `inputs?: InputFieldDefinition[]` a `CommandDefinition`.
2. En `src/utils/commands/runner.ts:48-54`, añadir `inputs: row.inputs` a la definición construida. Sin cambios de comportamiento todavía.
3. En `src/composables/validation/useCommandValidation.ts`, sobrescribir `inputs` en `insert` y `update` con el schema compartido (`.default([])` en insert, `.optional()` en update) y mensajes de `utils.inputs.errors.*`.

### Fase 4 — Seed y estado inicial del formulario

1. En `src/composables/deployer/seed_data/commands.ts:164,168`, añadir `inputs` a `seedColumns` y `resetColumns`.
2. En `src/pages/dashboard/commands/add.vue:33-44`, añadir `inputs: []` al `initialState`.
3. Confirmar que los tres comandos sembrados siguen sin declarar `inputs` (array vacío) y que el seed no los pisa en filas `custom = 1`.

### Fase 5 — Comprobación de tipos y migración aplicada

1. Pedir al usuario que ejecute `bunx vue-tsc --noEmit`.
2. Pedir al usuario que abra la app y confirme que la migración se aplica sin errores y que un comando existente conserva su definición.

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/utils/inputs/types.ts` | **Nuevo.** Contrato compartido comandos ↔ flujos. |
| `src/utils/inputs/schema.ts` | **Nuevo.** Validación Zod, unicidad de claves, coherencia de `default`, `validateInputValues`. |
| `src/utils/inputs/index.ts` | **Nuevo.** Reexportaciones. |
| `src/locales/es/utils/inputs.ts` | **Nuevo.** Mensajes de validación del contrato. |
| `src/locales/en/utils/inputs.ts` | **Nuevo.** Espejo en inglés. |
| `src/drizzle/entities/commands.ts` | Columna `inputs` JSON con default `[]`. |
| `migrations/<timestamp>_commands_inputs/migration.sql` | Generado por drizzle-kit (no editar a mano). |
| `src-tauri/migrations/<timestamp>_commands_inputs.sql` | Generado por el aplanado (no editar a mano). |
| `src/utils/commands/types.ts` | `CommandDefinition.inputs?`. |
| `src/utils/commands/runner.ts` | Copiar `row.inputs` a la definición. |
| `src/composables/validation/useCommandValidation.ts` | Refinamiento del campo `inputs` en insert/update. |
| `src/composables/deployer/seed_data/commands.ts` | `inputs` en `seedColumns` y `resetColumns`. |
| `src/pages/dashboard/commands/add.vue` | `inputs: []` en el estado inicial. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Abrir la app con una BD que ya tenga comandos: la migración se aplica y el listado sigue funcionando.
2. Crear un comando nuevo y guardarlo: en la BD, `inputs` es `'[]'` y no `NULL`.
3. Editar un comando, guardarlo sin tocar parámetros y reabrirlo: sigue sin parámetros.
4. Restaurar los datos predeterminados: los comandos del seed siguen funcionando y conservan `inputs = []`.
5. Insertar manualmente (o vía formulario, cuando exista el plan 3) un `inputs` inválido —clave duplicada, `select` sin `options`, `default` que no coincide con el tipo, `default` con `{{params.x}}`— y comprobar que la validación lo rechaza.
6. Comprobar que `system_info`, `system_metrics` y `upgradable_packages` se ejecutan igual que antes.

---

## Criterios de aceptación

- [ ] `deployer_commands.inputs` existe, es JSON, `NOT NULL` y por defecto `[]`.
- [ ] La migración generada conserva los datos e índices existentes.
- [ ] `InputFieldDefinition` e `InputFieldType` viven en `src/utils/inputs/` y no en `src/utils/commands/`.
- [ ] `createInputFieldsSchema()` rechaza claves duplicadas, más de 20 inputs, `select` sin opciones y `default` incoherente con el tipo.
- [ ] `createInputFieldsSchema()` rechaza un `default` con una raíz distinta de `global`.
- [ ] `CommandDefinition.inputs` existe y `runCommand` lo rellena desde la fila.
- [ ] El seed sincroniza y restablece `inputs`.
- [ ] El alta de comando arranca con `inputs: []`.
- [ ] No se modifican archivos autogenerados ni se añaden comandos Rust.

### Desviaciones

- Los locales de `utils/inputs` cubren más de lo previsto: además de la forma del contrato, incluyen `key_duplicate`, los mensajes de `default` (`default_unknown`, `default_disabled`, `default_secret`, `default_type`, `default_scope`) y los de valores (`value_required`, `value_invalid`), porque el schema se comparte con el runner (plan 2).
- `inputs: []` se añadió también a los tres registros del seed (`system_info`, `system_metrics`, `upgradable_packages`), no solo a las listas `seedColumns`/`resetColumns`, para que los tipos de los datos sembrados encajen con el contrato.
- La migración `20261118154818_commands_inputs` se resolvió como `ALTER TABLE deployer_commands ADD inputs text DEFAULT '[]' NOT NULL;`, sin recrear la tabla, así que conserva datos e índices sin intervención.
- `option_value_required` (valor de opción vacío) no estaba previsto aquí; se añadió al schema en el plan 3 al corregir el crash de `USelect`.

---

## Puntos abiertos

1. **Reordenación de inputs:** el diseño pide alta/baja/reordenación; este plan solo define el contrato. El plan 3 decidirá si la reordenación es con botones arriba/abajo (previsto) o arrastrando.
2. **Tipos de `default` en `select`:** se admite `string | number` porque las opciones pueden ser numéricas. Si en la práctica solo se usan cadenas, se puede acotar a `string` sin migración.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-18 | Plan creado en estado **Planificando**. |
| 2026-11-18 | Ejecutado: `src/utils/inputs/*`, locales es/en, columna `inputs` + migración `20261118154818_commands_inputs`, `CommandDefinition.inputs`, `row.inputs` en el runner, schema en `useCommandValidation`, `inputs` en seed y alta de comando. Estado **Ejecutando**, pendiente de verificación manual. |
| 2026-11-18 | El usuario lo dio por completado. Estado **Terminado**; plan archivado en `.agents/plans.done/`. Verificación manual pendiente. |
