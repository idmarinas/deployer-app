# Plan: Soft delete estilo Doctrine (papelera y purga)

## Estado

**Terminado** — 2026-11-16. Todas las decisiones funcionales están cerradas (`settings` queda **apartado** y es ajeno a este plan), los criterios de aceptación están cumplidos y la verificación estática y de build es verde. La prueba funcional manual en `bun run tauri:dev` (ver “Verificación”) queda pendiente y se hará aparte; no bloquea el cierre. Plan archivado en `.agents/plans.done/`.

---

## Instrucciones dadas (verbatim)

  > Crea un plan para el soft-delete extrae la información de .agents\plans\AGENTS.futuro.PLAN.md, una vez crees el plan, limpia la información del .agents\plans\AGENTS.futuro.PLAN.md para que quede solo lo que está pendiente.

---

## Resumen

Cerrar el ciclo de vida de las entidades que tienen `deleted_at`:

```text
activo ──remove()──▶ papelera ──restore()──▶ activo
                         │
                         └──remove({ purge: true })──▶ borrado físico
```

La **base ya está implementada** (factoría CRUD, soft-delete en cuatro entidades, `restore` y lecturas filtradas). Este plan cubre lo que falta: purga física, consultas para la papelera, guardas contra carreras, UI de papelera y las decisiones transversales que el soft-delete deja abiertas (relaciones entre entidades, passkeys usadas por hosts, variables referenciadas por texto, seeds y documentación).

---

## Estado actual (ya implementado)

  Commit `cad9be9` (12 nov 2026), con documentación posterior en `92afef4`.

  | Pieza | Estado | Evidencia |
  | --- | --- | --- |
  | Factoría CRUD común | Hecho | `src/composables/queries/crud.ts` |
  | `findAll({ includeDeleted, onlyDeleted })` | Hecho | `crud.ts:77-98` |
  | `find(key)` excluyendo borradas | Hecho | `crud.ts:115-117` |
  | `create` / `update` | Hecho | `crud.ts:119-204` |
  | `remove(key)` con borrado lógico | Hecho | `crud.ts:206-248` |
  | `restore(key)` | Hecho | `crud.ts:250-288` |
  | `supportsSoftDelete` | Hecho | `crud.ts:290-298` |
  | Soft-delete configurado | Hecho | `variables`, `hosts`, `commands`, `passkeys` |
  | Lecturas filtradas | Hecho | loaders de las cuatro entidades y `DashboardLastItems.vue` |
  | i18n `restore` | Hecho | `src/locales/{es,en}/notifications/*.ts` |
  | Documentación de la factoría | Hecho | `AGENTS.frontend.md` §3 |

### Limitaciones al iniciar el plan (histórico)

  - `remove()` **solo hace soft-delete**; no existe purga física.
  - `find()` excluye las borradas, así que una segunda llamada a `remove()` sobre la misma clave devuelve `false`: hoy es imposible purgar desde la API.
  - `find()` no acepta opciones: solo devuelve activas. La búsqueda en papelera vive en la privada `findByKey(key, true)`, usada únicamente por `restore()`.
  - `remove()` y `restore()` no usan `returning()` ni guardas `deleted_at IS NULL` / `IS NOT NULL`.
  - `onlyDeleted`, `includeDeleted` y `restore()` no se usan en ninguna vista: **no hay UI de papelera**.
  - `settings` tiene `deleted_at` por `timestamps`, pero no usa la factoría CRUD.
  - No hay tablas personalizadas todavía.

---

## Decisiones heredadas del backlog

| Decisión | Elección |
| --- | --- |
| Primer borrado | `UPDATE … SET deleted_at = now(), updated_at = now()` |
| Segundo borrado | `DELETE` físico desde la papelera; libera `name` y `slug` |
| Restaurar | `UPDATE … SET deleted_at = NULL, updated_at = now()` |
| Implementación | En la capa de consultas, **sin triggers** |
| Lecturas activas | `isNull(deleted_at)` en todas las consultas de listado/detalle |
| Unicidad | Mantener los índices `UNIQUE` globales: una fila en papelera sigue reservando su nombre |
| Índices parciales | **Descartados**: las filas en papelera siguen contando para el `UNIQUE` |
| Cifrado | Una fila secreta borrada lógicamente conserva su ciphertext; la purga lo elimina |
| Claves del vault | No hay claves por fila que limpiar |

---

## Decisiones de revisión

| Fecha | Decisión |
| --- | --- |
| 2026-11-13 | `find(key, options)` se unifica con `CrudListOptions`; se descarta `findIncludingDeleted()` y desaparece la privada `findByKey()` (nota de Iván). |
| 2026-11-13 | `remove(key, options)` absorbe la purga con `{ purge: true }`; se descarta `purge()` como método separado (nota de Iván). |
| 2026-11-13 | Una fila referenciada por otra entidad no se borra: se muestra un diálogo con las referencias y se ofrece desvincular antes de continuar (nota de Iván). |
| 2026-11-13 | Se mantienen los `UNIQUE` globales para todas las filas, incluidas las de papelera; los índices parciales quedan descartados (nota de Iván). |
| 2026-11-13 | Las filas `internal` deben tener siempre `deleted_at = null`; el seed/reset las restaura y la UI no permite borrarlas (nota de Iván). |
| 2026-11-13 | "Ciphertext" es el valor `ENC:` de la fila, no la clave AES del vault; ni el soft-delete ni la purga tocan las claves de Stronghold (nota de Iván). |
| 2026-11-13 | UI: página “Papelera” dedicada y agrupada por tabla + pestaña “Papelera” en cada listado; se descarta el checkbox en la lista (nota de Iván). |
| 2026-11-13 | Tras el borrado lógico se muestra un toast con la acción **Deshacer**, que llama a `restore(key)` (respuesta 2 de Iván). |
| 2026-11-13 | Además de la purga fila a fila, cada tabla tiene **Vaciar papelera**, con aviso explícito de que no se puede deshacer (respuesta 3 de Iván). |
| 2026-11-13 | `hosts.key_id` se migra de `onDelete: 'set null'` a `onDelete: 'restrict'` (respuesta 4 de Iván). |
| 2026-11-13 | Variables referenciadas por texto: se avisa de las entidades que las usan para poder quitar/cambiar la referencia; ejecutar una entidad con una variable borrada da error (respuesta 5 de Iván). |
| 2026-11-13 | `settings` queda **apartado por ahora** a petición de Iván; no forma parte de este plan ni bloquea su implementación. |

---

## Alcance

### 1. API de la factoría (`src/composables/queries/crud.ts`)

#### 1.1. `find()` unificado con las opciones del listado

> **Nota de Iván (resuelta):** sí. En lugar de añadir `findIncludingDeleted()`, `find()` absorbe la antigua `findByKey()` privada y acepta las mismas opciones que `findAll()`.

```ts
find(key: TKey, options?: CrudListOptions): Promise<CrudRow<TTable> | undefined>
```

| Llamada | Filas que devuelve |
| --- | --- |
| `find(key)` | solo activas (`deleted_at IS NULL`) |
| `find(key, { onlyDeleted: true })` | solo en papelera (`deleted_at IS NOT NULL`) |
| `find(key, { includeDeleted: true })` | activas o en papelera, sin filtro |

- Es retrocompatible: los loaders siguen llamando `find(id)`; `update()` y `remove()` mantienen su semántica.
- `restore()` y la purga (`remove(key, { purge: true })`) usan `find(key, { onlyDeleted: true })`.
- Desaparece `findByKey()`: `find()` construye el `WHERE` con `eq(primaryKey, key)` + `listWhere(options)`, reutilizando la misma lógica que `findAll()`.
- `findAll({ onlyDeleted: true })` sigue cubriendo el listado de la papelera.
- Actualizar `CrudApi` en `shared.interfaces.ts` (`find` con opciones, `remove` con `CrudRemoveOptions`, `purgeDeleted`) y la mención de la API en `AGENTS.frontend.md` §3.

**Alternativa descartada:** mantener `findByKey(key, deleted)` privada y añadir `findIncludingDeleted()`. Duplica la API y obliga a tres métodos (`find`, `findByKey`, `findIncludingDeleted`) para el mismo `SELECT`.

#### 1.2. Borrado lógico y purga en `remove()`

> **Nota de Iván (aceptada):** `remove()` absorbe la purga con un parámetro explícito. Un solo método cubre las dos finalidades y `deleteFn` sigue funcionando sin cambios.

```ts
interface CrudRemoveOptions {
	/** `true` = borrado físico; solo permitido si la fila ya está en la papelera. */
	purge?: boolean
	/** Desvincula las referencias declaradas antes de borrar (ver §3). */
	unlink?: boolean
}

remove(key: TKey, options?: CrudRemoveOptions): Promise<boolean>
restore(key: TKey): Promise<boolean>
```

| Llamada | Estado requerido | Efecto |
| --- | --- | --- |
| `remove(key)` | activa | `UPDATE … SET deleted_at = now, updated_at = now WHERE pk = ? AND deleted_at IS NULL` |
| `remove(key, { unlink: true })` | activa, con referencias | `UPDATE` de las FK a `NULL` + borrado lógico |
| `remove(key, { purge: true })` | en papelera | `DELETE … WHERE pk = ? AND deleted_at IS NOT NULL` |
| `remove(key, { purge: true, unlink: true })` | en papelera, con referencias | `UPDATE` de las FK a `NULL` + `DELETE` (defensa; lo normal es que ya estén desvinculadas) |

Reglas:

- La purga **nunca** ocurre con una llamada normal: exige `{ purge: true }` explícito.
- `unlink` solo actúa sobre las referencias declaradas en la configuración de la entidad (§3); sin referencias es un no-op.
- Si la fila no está en el estado esperado → `false` sin lanzar (evita carreras y dobles clics).
- `returning()` para saber si la sentencia afectó a una fila.
- Invalidar la caché de la entidad y la de las entidades desvinculadas.
- Notificaciones: `<prefijo>.delete.*` para el borrado lógico y `<prefijo>.purge.*` para el físico, en `es` y `en`. La confirmación de purga es específica e irreversible.

**Alternativas descartadas:**

- `purge()` como método separado: API más amplia para el mismo `DELETE`.
- `remove()` en dos fases automáticas (`UPDATE` si está activa, `DELETE` si no): una segunda llamada desde la lista borraría físicamente sin querer. La purga debe ser siempre explícita.

#### 1.3. Restauración endurecida

```sql
UPDATE "tabla"
SET "deleted_at" = NULL, "updated_at" = ?
WHERE "pk" = ? AND "deleted_at" IS NOT NULL
RETURNING "pk";
```

- Si la fila no está en papelera, devolver `false`.
- Invalidar la caché y notificar.

#### 1.4. Deshacer desde el toast

> **Decisión (respuesta 2 de Iván):** sí, toast con acción **Deshacer** tras el borrado lógico.

- `remove(key)` (sin `purge`, con `softDelete` configurado) termina con un toast de éxito que incluye una acción:

  ```ts
  {
    label: t('common.actions.undo'),
    onClick: () => restore(key),
  }
  ```

- En entidades sin soft-delete no hay “Deshacer”: el borrado ya es físico.
- La acción reutiliza `restore(key)`: no hay un método nuevo ni un estado intermedio.
- Como el toast se emite dentro de `remove()`, funciona igual desde el listado (`deleteFn` de `useTableColumns`) que desde la vista de detalle; `restore()` invalida la caché y el listado se refresca.
- El toast dura más de lo habitual (p. ej. `duration: 8000`) para que dé tiempo a pulsar.
- La purga (`{ purge: true }`) **no** ofrece “Deshacer”: es irreversible.
- Si mientras el toast está visible la fila se restaura por otra vía, `restore()` devuelve `false` sin romper nada.
- `useToaster` ya acepta `actions` porque `ToasterOptions` es `Partial<Omit<Toast, 'title' | 'description'>>`; **no** hay que ampliarlo.
- `createQueryNotifier.success()` hoy no reenvía opciones. Hay que añadir un cuarto parámetro opcional:

  ```ts
  success(noticeId, title, description?, options?: ToasterOptions): void
  ```

  y pasarlo a `toaster.update(noticeId, 'success', title, description, options)`.
- Clave i18n nueva `common.actions.undo` en `es` y `en`; el texto del toast puede seguir usando `<prefijo>.delete.success.*`.

#### 1.5. Vaciar papelera (purga masiva)

> **Decisión (respuesta 3 de Iván):** además de la purga fila a fila, cada tabla ofrece **Vaciar papelera**, con aviso de que no se puede deshacer.

```ts
interface CrudPurgeAllResult {
	/** Filas borradas físicamente. */
	purged: number
	/** Filas que no se purgaron por tener referencias entrantes. */
	blocked: number
}

purgeDeleted(): Promise<CrudPurgeAllResult>
```

Reglas:

- Solo actúa sobre filas con `deleted_at IS NOT NULL`; nunca toca activas.
- Excluye las filas `internal` (cuando exista el campo).
- Respeta la política de relaciones (§3): **no** purga una fila referenciada; la cuenta en `blocked` y la deja en papelera. La UI muestra cuántas quedaron bloqueadas y enlaza al diálogo de desvinculación.
- El proxy Drizzle no expone transacciones (`query_raw` ejecuta una sentencia por llamada), así que la purga masiva es **secuencial**: un fallo en una fila no revierte las anteriores. Se informa del resultado parcial.
- `purgeDeleted()` se expone en `CrudApi` con ese nombre; no se llama `removeAll` para que no se confunda con “borrar activos”.
- Invalidar la caché de la entidad y de las entidades desvinculadas.
- i18n: `<prefijo>.purgeAll.*` (`loading`/`success`/`error`) y textos de confirmación.
- La confirmación es **doble**: el usuario debe aceptar un aviso explícito de que la acción es irreversible y vacía la papelera de esa tabla.
- La respuesta del toast incluye `purged` y `blocked`; si `blocked > 0`, se muestra un aviso adicional.

---

### 2. UI de papelera

Empezar por **variables** y extender después a `hosts`, `commands` y `passkeys`.

#### 2.1. Decisión (nota de Iván)

**Se implementan B + C:**

1. **Página “Papelera” dedicada (B):** ruta propia (p. ej. `src/pages/dashboard/trash.vue`) que muestra todas las filas borradas **agrupadas por tabla/entidad**. Cada grupo reutiliza la misma tabla de papelera.
2. **Pestaña “Borrados” en cada listado (C):** cada listado (`variables`, `hosts`, `commands`, `passkeys`) separa `Activos` / `Borrados` en pestañas. La pestaña reutiliza el mismo componente, filtrado a esa entidad. La página global conserva el nombre “Papelera”.

**Descartado:** checkbox “Mostrar borrados” en la lista (A), porque mezcla activos y borrados en la misma tabla y no separa el contexto.

**Componente compartido:** `TrashTable` (o `DeletedTable`) recibe:

- entidad y columnas,
- `findAll({ onlyDeleted: true })`,
- `restore`,
- `remove(key, { purge: true })`,
- `purgeDeleted()` (vaciar papelera de esa tabla),
- confirmación de purga.

Así la página global y las pestañas no duplican lógica.

**Datos:** los loaders actuales fijan `isNull(deleted_at)`. Para la papelera hace falta un loader por entidad (`isNotNull(deleted_at)`) o consumir `findAll({ onlyDeleted: true })` con `useQuery`. Mantener una `cacheKey` distinta (`['<entidad>', 'trash']`) e invalidarla tras restaurar o purgar.

**Detalle de una fila borrada:** la vista `[id]/(view).vue` se reutiliza en modo solo lectura (`deleted_at != null`): sin editar ni crear; solo restaurar y eliminar definitivamente.

#### 2.2. Requisitos mínimos

- Mostrar las filas con `deleted_at` y la fecha de borrado.
- Acción **Restaurar** (`restore`).
- Acción **Eliminar definitivamente** (`remove(id, { purge: true })`) con confirmación explícita e irreversible.
- La página global agrupa por tabla y muestra el número de filas de cada grupo.
- Las pestañas muestran el contador de la papelera de esa entidad.
- En la vista de detalle de una fila borrada: sin edición ni creación; solo restaurar y purgar.
- Botón de purga masiva por tabla con confirmación doble y aviso de que **no se puede deshacer**: en la página global se llama **Vaciar papelera** y en la pestaña de cada listado **Eliminar borrados**.
- El vaciado informa de las filas purgadas y de las que quedaron bloqueadas por referencias.
- Toast con acción **Deshacer** tras el borrado lógico (no tras la purga).
- Toasts de éxito/error y recarga o invalidación de la lista.
- No permitir borrar ni purgar filas `internal` (`FUT-VAR-03`).
- i18n completa en `es` y `en` (el tipo se regenera en la verificación manual).

`useTableColumns` puede ampliarse con acciones opcionales de papelera o dejar esas acciones en `TrashTable`; evitar mezclar “Eliminar” (lógico) con “Eliminar definitivamente” (físico) en la misma fila sin distinguirlas visualmente.

---

### 3. Lecturas y relaciones entre entidades

- Auditar cualquier lectura directa que no pase por la factoría y añadir `isNull(deleted_at)` si corresponde.
- `commands`: `runner.ts` ya filtra `enabled` y `deleted_at`; mantenerlo.
- `variables`: el resolvedor y los loaders ya filtran; mantenerlo.
- `settings`: **apartado por ahora** a petición de Iván. No entra en la factoría CRUD en este plan; si más adelante se decide, se tratará como una tarea aparte.
- Tablas personalizadas: no aplica hasta que exista `AGENTS.custom-tables.PLAN.md`.

#### Relaciones entre entidades (nota de Iván)

**Política:** una fila referenciada por otra entidad **no se borra**, ni lógica ni físicamente. Para poder borrarla hay que desvincularla primero.

- Cada entidad declara sus referencias entrantes en `CrudConfig.references`:

  ```ts
  interface CrudReference {
    table: SQLiteTable
    column: AnyColumn       // FK que apunta a la entidad
    label: string           // nombre legible de la entidad que referencia
  }
  ```

- `findReferences(key)` devuelve las filas que apuntan a la clave (para el diálogo).
- `remove(key)` comprueba las referencias antes de actuar:
  - Con referencias y sin `unlink`: no borra y notifica `<prefijo>.delete.error.referenced`.
  - Con `unlink: true`: pone las FK a `NULL` y continúa con el borrado lógico o la purga.
- La purga vuelve a comprobar las referencias justo antes del `DELETE`, aunque la UI ya haya desvinculado.
- La UI muestra un diálogo con las entidades que usan la fila y dos acciones: **Cancelar** y **Desvincular y eliminar**.
- Las FK actuales usan `onDelete: 'set null'`; se **migran a `restrict`** (decisión de Iván) para que SQLite no desvincule en silencio. Es una migración SQLite con reconstrucción de tabla.
- Migración concreta: `src/drizzle/entities/hosts.ts` (`key_id` → `{ onDelete: 'restrict' }`), `bun run drizzle:generate --name hosts_key_id_restrict` y flatten automático a `src-tauri/migrations/`. Revisar el SQL generado antes de aplicarlo.

#### Variables referenciadas por texto (respuesta 5 de Iván)

Las expresiones `{{global.<slug>}}` guardadas en `deployer_commands.command` (y en futuros workflows) **no son foreign keys**: SQLite no puede bloquear el borrado por sí solo. La política es **avisar, no bloquear**:

- Añadir un escáner de uso en `src/utils/interpolation` (reutilizando `parseTemplate`/`findReferences`) que recorra las tablas con texto interpolable y devuelva las filas que referencian un `slug`:

  ```ts
  interface VariableUsage {
    entity: 'command'          // crecerá con workflows
    key: string                // p. ej. `deployer_commands.key`
    name: string               // nombre legible para el diálogo
    expressions: string[]      // `{{global.deploy_app}}`, ...
  }

  findVariableUsages(slug: string): Promise<VariableUsage[]>
  ```

- `remove(key)` (lógico) y `remove(key, { purge: true })` de **variables** consultan `findVariableUsages(slug)` antes de actuar.
- El escáner recorre los comandos **activos** (`deleted_at IS NULL`); los comandos en papelera no se ejecutan y no deben bloquear el aviso. Si se quiere ser más estricto, se listan también marcados como “en papelera”, pero sin bloquear.
- Si hay usos, la UI muestra un diálogo con esas entidades y dos acciones:
  - **Cancelar**.
  - **Eliminar de todos modos**: la variable pasa a papelera o se purga, y las referencias quedan rotas a propósito.
- El diálogo enlaza a cada comando para que el usuario pueda **quitar o cambiar la referencia** antes de continuar. No se reescribe el texto automáticamente.
- Ejecutar una entidad con una variable borrada **da error**: `loadGlobalScopeMetadata()` y `loadGlobalScopeForExecution()` ya filtran `deleted_at IS NULL`, así que el motor lanza `InterpolationError` con clave `utils.interpolation.errors.unknown_variable`. No hay que añadir lógica nueva de ejecución, solo documentarlo.
- Restaurar la variable hace que las referencias vuelvan a resolver sin cambios.
- El renombrado de `slug` sigue siendo inmutable y está en `FUT-VAR-02`; aquí solo se trata el borrado.

#### Passkeys y hosts

- `hosts.key_id` referencia `passkeys.id` (hoy `onDelete: 'set null'`).
- Se aplica la política anterior:
  - `remove(passkeyId)` con hosts asociados → bloqueado; el diálogo lista los hosts y ofrece **Desvincular y eliminar** (`key_id = NULL` + soft-delete).
  - `remove(passkeyId, { purge: true })` → solo si ya no queda ningún host apuntando a ella.
- Rust (`src-tauri/src/ssh/connect.rs:38,50` y `export_public_key.rs`) no debería encontrar passkeys borradas asignadas a hosts. Opcional: añadir `deleted_at IS NULL` como defensa y devolver un error claro.
- La FK de `hosts.key_id` se migra a `onDelete: 'restrict'` (ver arriba) para que el borrado físico accidental falle en la BD.

---

### 4. Unicidad, seeds y cifrado

#### Unicidad

**Decisión (nota de Iván):** los `UNIQUE` globales se mantienen y **cuentan también las filas en papelera**.

- Una fila con `deleted_at` no nula sigue existiendo en la tabla, así que ocupa su `name`/`slug`/`key`.
- La validación de la UI (`$count` en `src/composables/validation/*`) ya cuenta todas las filas; es coherente con el `UNIQUE`.
- Si la UI ignorara las borradas, el `INSERT` fallaría en SQLite con una violación de unicidad. Por eso **no** se añaden índices parciales.
- Índices parciales (`WHERE deleted_at IS NULL`): **descartados**. Solo tendrían sentido si se decidiera reutilizar nombres de la papelera, lo que rompería la reserva y la restauración segura.
- La única forma de liberar un `name`/`slug`/`key` es la purga física (`remove(id, { purge: true })`).

#### Seeds

- `seedColumns` **no** debe incluir `deleted_at`.
- `resetValues: { deleted_at: null }`, como en `commands`.
- `seedWhere` debe excluir las borradas o incluirlas conscientemente.
- **Excepción `internal` (nota de Iván):** cuando exista `internal` (`FUT-VAR-03`), las filas internas deben quedar siempre con `deleted_at = null`:
  - El seed automático y el reset las devuelven a ese estado.
  - La UI no permite editarlas ni borrarlas (`useTableColumns` ya comprueba `row.internal`).
  - `remove()` debe rechazar filas `internal` con una notificación clara, aunque la UI ya las bloquee.

#### Cifrado

- **Aclaración (nota de Iván):** "ciphertext" es el valor `ENC:{version}:<base64>` guardado en la columna cifrada de la fila, **no** la clave AES del vault.
- La clave del vault vive en `encrypt:{tabla}.{columna}:{versión}` y es **compartida por todas las filas** de esa tabla/columna; no hay claves por fila.
- Soft-delete: la fila conserva su ciphertext; no se toca el vault.
- Purga: se elimina la fila y su ciphertext; **tampoco** se toca el vault.
- Las claves del vault solo se eliminan en `purgeUnusedVersions()` tras rotar y re-cifrar, cuando una versión antigua deja de estar en uso (`scanAndReencrypt` / `reencryptScope`).
- Por tanto, borrar o purgar una entidad **nunca** elimina claves de Stronghold.

---

### 5. Documentación

- Corregir `docs/content/es/008.variables/1.overview.md`: la nota final dice que el borrado es físico y que el lógico no está implementado; ya no es cierto.
- Documentar en esa misma página (o en una nueva) que:
  - el borrado es lógico y existe papelera;
  - restaurar recupera la variable;
  - eliminar definitivamente libera `slug`/`name`;
  - una variable borrada rompe las expresiones `{{global.<slug>}}` que la usaban y la ejecución falla con `unknown_variable`;
  - el aviso de usos lista los comandos afectados.
- Actualizar `AGENTS.frontend.md` §3 si cambia la API (`find(key, options)`, `remove(key, { purge, unlink })`, `purgeDeleted`, `findReferences`, toast con `actions`) o la UI.
- El resto de documentación de variables (slug, `is_secret`, `internal`/`group`, versión `en`) queda en `FUT-VAR-11`; no duplicarla aquí.

---

## Fases de implementación

1. **Decisiones**: cerradas salvo `settings`, que queda apartado y no bloquea.
2. **API**: `find(key, options)` unificado, `remove(key, { purge, unlink })`, `purgeDeleted()`, `findReferences`, `findVariableUsages`, `returning()`, guardas de estado, notificaciones `delete`/`purge`/`purgeAll` i18n y toast con acción **Deshacer**.
3. **Papelera de variables**: componente `TrashTable`, pestaña en el listado y página global agrupada; restaurar, purgar, vaciar papelera, confirmaciones, toasts.
4. **Resto de entidades**: `hosts`, `commands`, `passkeys`; adaptar validaciones y loaders si hace falta.
5. **Transversal**: relaciones y `unlink`, migración de `hosts.key_id` a `restrict`, aviso de variables referenciadas por texto, passkeys/hosts, seeds e `internal` cuando existan.
6. **Documentación y verificación**.

---

## Archivos afectados previsiblemente

- `src/composables/queries/crud.ts`
- `src/composables/queries/shared.ts` (`success` con `actions` del toast) y `shared.interfaces.ts`
- `src/composables/queries/{variables,hosts,commands,passkeys}.ts`
- `src/composables/useTableColumns.ts`
- `src/components/trash/*` (tabla de papelera compartida)
- `src/pages/dashboard/trash.vue` (página “Papelera” global) y pestañas en `src/pages/dashboard/{variables,hosts,commands,passkeys}/index.vue`
- `src/pages/dashboard/{variables,hosts,commands,passkeys}/[id]/(view).vue` (modo solo lectura)
- `src/loaders/*` (loader de papelera `isNotNull(deleted_at)` por entidad)
- `src/utils/interpolation/*` (`findVariableUsages`/escáner de referencias)
- `src/locales/{es,en}/notifications/*.ts`
- `src/locales/{es,en}/common.ts` o equivalente para acciones/confirmaciones (`common.actions.undo`)
- `src/composables/validation/*` si el chequeo de `internal` o de relaciones afecta a los formularios
- `src/drizzle/entities/hosts.ts` + migración de `onDelete: 'set null'` → `'restrict'` (`bun run drizzle:generate` → `migrations/` + flatten a `src-tauri/migrations/`)
- `src-tauri/src/ssh/connect.rs` y `src-tauri/src/commands/passkeys/export_public_key.rs` si se decide añadir la defensa `deleted_at IS NULL`
- `docs/content/es/008.variables/1.overview.md`
- `AGENTS.frontend.md`

---

## Verificación

La verificación es **manual** e incluye la comprobación estática y de build habitual (ver regla en `AGENTS.todo.md`) además de las pruebas funcionales.

> `bun test` no es fiable hoy: los tests de `tests/` importan módulos eliminados (`src/utils/schema-form/*`, `@/schemas/*.json`). No usar esa suite como criterio de aceptación hasta repararla.

### Manual en `bun run tauri:dev`

  1. Crear una entidad.
  2. Borrarla: desaparece del listado activo y aparece en la papelera.
  3. Restaurarla: vuelve al listado activo y sigue siendo utilizable.
  4. Volver a borrarla y purgarla con `remove(id, { purge: true })`: desaparece de la papelera y de la BD. Intentar purgar una fila activa debe devolver `false`.
  5. Intentar crear otra fila con el mismo `name`/`slug` antes de purgar: debe fallar por el `UNIQUE` global.
  6. Crear la misma fila después de purgar: debe funcionar.
  7. Variable secreta: borrar, restaurar y comprobar que el valor sigue descifrándose; purgar y comprobar que desaparece y que el vault sigue intacto.
  8. Passkey asignada a un host: intentar borrarla → diálogo con el host; **Desvincular y eliminar** deja `key_id = NULL` y la passkey en papelera; después se puede purgar.
  9. Fila `internal` (cuando exista): no se puede editar, borrar ni purgar; el seed/reset la deja con `deleted_at = null`.
  10. Comprobar la página global (agrupada por tabla) y la pestaña “Borrados” de cada listado (solo esa entidad).
  11. **Deshacer**: borrar una entidad y pulsar la acción del toast antes de que desaparezca; la fila vuelve al listado activo.
  12. **Purga masiva**: borrar varias filas, pulsar el botón de la tabla (**Vaciar papelera** en la página global, **Eliminar borrados** en la pestaña); confirmar el aviso irreversible y comprobar que solo desaparecen las de esa tabla. Intentar vaciar con una fila referenciada: queda en papelera y se informa como bloqueada.
  13. **Variable referenciada**: crear un comando con `{{global.<slug>}}`; al borrar la variable aparece el diálogo con ese comando; eliminar de todos modos y comprobar que ejecutar el comando falla con `unknown_variable`; restaurar la variable y comprobar que vuelve a funcionar.
  14. **FK `restrict`**: intentar purgar una passkey con un host asignado; la BD debe rechazar el `DELETE` si la aplicación no lo bloqueó antes.

---

## Criterios de aceptación

- [x] `remove(key, { purge: true })` es la única vía de purga y exige que la fila esté en la papelera.
- [x] `purgeDeleted()` vacía solo la papelera de una tabla, respeta referencias/`internal` e informa de `purged`/`blocked`.
- [x] `find()` acepta `onlyDeleted`/`includeDeleted` y ya no existe `findByKey()` privada.
- [x] Restaurar una fila la deja operativa.
- [x] El toast del borrado lógico ofrece **Deshacer** y llama a `restore(key)`; la purga no lo ofrece.
- [x] Las lecturas activas no muestran filas con `deleted_at`.
- [x] Las carreras entre `SELECT` y `UPDATE`/`DELETE` no permiten estados inconsistentes (`returning()`).
- [x] Una fila referenciada no se borra sin `unlink`; el diálogo lista las referencias.
- [x] Las FK no permiten desvincular en silencio: `hosts.key_id` migrado a `restrict`.
- [x] Borrar una variable avisa de los comandos que la usan mediante `findVariableUsages()`; ejecutar un comando con la variable borrada da `unknown_variable`.
- [x] Las filas `internal` nunca tienen `deleted_at` y no se pueden borrar.
- [x] No hay índices únicos parciales; las validaciones cuentan las filas en papelera.
- [x] La UI distingue claramente “Eliminar” de “Eliminar definitivamente”.
- [x] Existe una página “Papelera” global agrupada por tabla.
- [x] Cada listado tiene pestañas `Activos` / `Borrados` y comparte el componente de papelera.
- [x] Cada tabla permite la purga masiva (**Vaciar papelera** / **Eliminar borrados**) con confirmación doble e irreversible.
- [x] La vista de detalle de una fila borrada es solo lectura (restaurar/purgar) — ver desviación sobre fila expandible.
- [x] i18n completo en `es` y `en`.
- [x] La política de passkeys borradas está decidida, implementada y documentada.
- [x] La documentación de variables ya no dice que el borrado es físico y explica la papelera y las referencias rotas.
- [x] La comprobación estática y de build pasa (2026-11-15).

### Desviaciones

- **Detalle de una fila borrada:** no se reutiliza `[id]/(view).vue`. `variables/[id]/(view).vue` está vacía y `commands` solo tiene `edit.vue`, así que el detalle se implementa como **fila expandible** en `TrashTable` (`src/components/trash/TrashDetails.vue`), en modo solo lectura, con las acciones **Restaurar** y **Eliminar definitivamente** en la propia fila.
- **Borrado desde el detalle activo:** `useToolbarButtons` usa el mismo `useCrudDeleteConfirm` que los listados, de modo que borrar una passkey desde su vista también ofrece **Desvincular y eliminar**.
- **Purga secuencial:** el proxy Drizzle no expone transacciones, así que `purgeDeleted()` purga fila a fila; un fallo intermedio no revierte las anteriores.
- **Terminología:** la pestaña de cada listado se llama **Borrados** (no “Papelera”), su estado vacío titula **Sin borrados** y dice “No hay elementos borrados en esta tabla.”; la página global y la entrada del menú siguen llamándose **Papelera**, igual que su acción **Vaciar papelera** y su estado vacío **Papelera vacía**. En las listas, la purga masiva se llama **Eliminar borrados** y su diálogo usa textos propios (`TrashTable` recibe `context="list"`). Los toasts de `purgeAll` son neutros (**Eliminados elementos borrados.** / *Deleted items removed.*) porque la notificación se emite desde la API y vale para ambos contextos.

---

## Puntos abiertos

1. **`settings`** — **apartado por ahora** a petición de Iván. No entra en este plan; se retomará como tarea independiente si se decide. No bloquea la implementación del resto.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-12 | Plan creado a partir de `FUT-VAR-01` del backlog. Se documenta la implementación parcial existente y se separa el trabajo pendiente de papelera/purga. |
| 2026-11-13 | Revisión de la nota de Iván: se unifica `find`/`findByKey` con `CrudListOptions` y se descarta `findIncludingDeleted`. |
| 2026-11-13 | Se incorporan las nuevas notas: `remove` absorbe la purga, política de relaciones/desvincular, unicidad global sin índices parciales, `internal` siempre activo, aclaración ciphertext/vault y decisión de UI (página “Papelera” global + pestañas por listado). |
| 2026-11-13 | Se resuelven las respuestas 2–5: toast con **Deshacer**, **Vaciar papelera** por tabla con aviso irreversible, migración de `hosts.key_id` a `restrict` y aviso de variables referenciadas por texto (error `unknown_variable` al ejecutar). `settings` queda apartado. |
| 2026-11-15 | Terminología en listas: la pestaña pasa a **Borrados**, el estado vacío a **Sin borrados** / “No hay elementos borrados en esta tabla.” y la columna a **Fecha de borrado**; la página global y el menú conservan **Papelera** y **Papelera vacía**. |
| 2026-11-15 | La purga masiva de la pestaña pasa a **Eliminar borrados** con diálogo propio (**Confirmar eliminación**); la página global mantiene **Vaciar papelera**. `TrashTable` distingue el contexto con `context="list"`. Los toasts de `purgeAll` dejan de hablar de “papelera” y usan **Eliminados elementos borrados.** en ambos contextos. |
| 2026-11-16 | Plan cerrado como **Terminado** y archivado en `.agents/plans.done/`. Criterios de aceptación cumplidos, `vue-tsc` y `build` verdes. La prueba funcional manual en `bun run tauri:dev` queda pendiente y se hará aparte. `settings` sigue apartado. |
