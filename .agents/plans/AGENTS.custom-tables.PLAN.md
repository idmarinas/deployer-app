# Plan: Sistema de Tablas Personalizadas (tipo Airtable)

## Resumen

Sistema que permite a los usuarios crear tablas reales en SQLite, con columnas dinámicas. Cada tabla se persiste como una tabla SQLite nativa con nombre `z_{nombre}_{random}` para organizarlas al final de la BD y evitar conflictos. Los usuarios gestionan datos mediante un grid editable inline (tipo Airtable).

## Decisiones tomadas

| Decisión | Elección | Razón |
| --- | --- | --- |
| Grid editable | UTable/TanStack Table (ya en proyecto) | Sin dependencias nuevas, integrado con Nuxt UI v4 |
| Persistencia | Auto-save por celda | UX fluida, sin botón guardar |
| Almacenamiento | Tablas reales en SQLite (no EAV/JSON) | Rendimiento nativo, queries SQL estándar |
| Naming de tablas | `z_{nombre_sanitizado}_{8hex}` | Prefijo `z_` organiza al final, random evita conflictos |
| Columnas por defecto | `id`, `created_at`, `updated_at` (+ trigger) | Siempre presentes en toda tabla |
| Tipos de columna | text, number, boolean, date, json | Sin select (omitido) |
| Metadata | 2 tablas estáticas (crud_commands! macro) | Definición de tablas y columnas |
| Datos dinámicos | Comandos Tauri custom con sqlx raw | DDL/DML sobre tablas creadas en runtime |

---

## Arquitectura

```
┌──────────────────────────┐     ┌──────────────────────────────┐
│ deployer_custom_tables    │────▶│ deployer_custom_columns       │
│ (metadata: nombre,        │     │ (metadata: column_name,       │
│  real_table_name, etc.)   │     │  column_type, sort_order...)  │
└──────────────────────────┘     └──────────────────────────────┘
            │
            │ CREATE TABLE / INSERT / UPDATE / DELETE
            ▼
┌──────────────────────────┐
│ z_{name}_{random}         │  ← Tabla SQLite real creada en runtime
│ (id, col1, col2, ...,     │
│  created_at, updated_at)  │
└──────────────────────────┘
```

**Flujo de datos:**

- **READ**: Frontend → Tauri command → sqlx query sobre `z_*` → resultados
- **WRITE**: Frontend → Tauri command → validación contra metadata → sqlx query sobre `z_*`
- **DDL**: Frontend → Tauri command → CREATE/ALTER/DROP TABLE + actualizar metadata

---

## FASE 1: Base de Datos

**Archivo migración**: `src-tauri/migrations/0002_custom_tables.up.sql`

### `deployer_custom_tables` (metadata)

```sql
CREATE TABLE deployer_custom_tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  real_table_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER deployer_custom_tables_updated_at
  AFTER UPDATE ON deployer_custom_tables
  FOR EACH ROW
  WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE deployer_custom_tables SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
```

### `deployer_custom_columns` (metadata)

```sql
CREATE TABLE deployer_custom_columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id INTEGER NOT NULL REFERENCES deployer_custom_tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  column_type TEXT NOT NULL CHECK (column_type IN ('text','number','boolean','date','json')),
  options TEXT,
  default_value TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(table_id, name),
  UNIQUE(table_id, column_name)
);

CREATE INDEX idx_custom_columns_table_id ON deployer_custom_columns(table_id);

CREATE TRIGGER deployer_custom_columns_updated_at
  AFTER UPDATE ON deployer_custom_columns
  FOR EACH ROW
  WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE deployer_custom_columns SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
```

### Tablas dinámicas (`z_*`)

Cada tabla creada por el usuario tiene esta estructura base:

```sql
CREATE TABLE z_{sanitized_name}_{random8hex} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- columnas definidas por el usuario aquí --
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para auto-update de updated_at
CREATE TRIGGER z_{name}_{hex}_updated_at
  AFTER UPDATE ON z_{sanitized_name}_{random8hex}
  FOR EACH ROW
  WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE z_{sanitized_name}_{random8hex} SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
```

---

## FASE 2: Backend Rust

### Estructura de módulos

```tree
src-tauri/src/commands/custom_tables/
├── mod.rs          # Re-export de todos los comandos
├── types.rs        # Entidades metadata + inputs
├── crud.rs         # CRUD de metadata (tablas y columnas) con crud_commands!
├── ddl.rs          # DDL: CREATE TABLE, ALTER TABLE ADD/DROP COLUMN, DROP TABLE
├── dml.rs          # DML: INSERT, UPDATE, DELETE sobre z_* tables
└── helpers.rs      # open_pool, generación de nombres, validación
```

### Entidades metadata (`types.rs`)

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("deployer_custom_tables")]
pub struct CustomTable {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub real_table_name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("deployer_custom_columns")]
pub struct CustomColumn {
    pub id: i64,
    pub table_id: i64,
    pub name: String,
    pub column_name: String,
    #[db_rename("column_type")]
    pub column_type_: String,
    pub options: Option<String>,
    pub default_value: Option<String>,
    pub required: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}
```

### Inputs metadata

```rust
// Crear tabla (metadata + DDL)
pub struct CreateCustomTableInput {
    pub name: String,
    pub description: Option<String>,
    pub columns: Vec<CreateCustomColumnInput>,
}

// Actualizar metadata de tabla
pub struct UpdateCustomTableInput {
    pub name: Option<String>,
    pub description: Option<String>,
}

// Añadir columna (metadata + DDL)
pub struct CreateCustomColumnInput {
    pub name: String,
    #[serde(rename = "type")]
    pub column_type: String,
    pub options: Option<String>,
    pub default_value: Option<String>,
    pub required: Option<bool>,
    pub sort_order: Option<i32>,
}

// Actualizar metadata de columna
pub struct UpdateCustomColumnInput {
    pub name: Option<String>,
    #[serde(rename = "type")]
    pub column_type: Option<String>,
    pub options: Option<String>,
    pub default_value: Option<String>,
    pub required: Option<bool>,
    pub sort_order: Option<i32>,
}

// Datos de fila para DML
pub struct CustomRowData {
    pub data: serde_json::Value,  // {"column_name": value, ...}
}

// Batch update para auto-save
pub struct BulkUpdateRowsInput {
    pub updates: Vec<CustomRowUpdate>,
}

pub struct CustomRowUpdate {
    pub id: i64,
    pub data: serde_json::Value,
}
```

### Helpers (`helpers.rs`)

```rust
/// Genera nombre real de tabla: z_{sanitizado}_{8hex}
pub fn generate_real_table_name(name: &str) -> String {
    let sanitized = sanitize_name(name);
    let random_hex: String = rand_hex(8);
    format!("z_{}_{}", sanitized, random_hex)
}

/// Sanitiza nombre: solo [a-z0-9_], max 50 chars, snake_case
fn sanitize_name(name: &str) -> String { ... }

/// Genera nombre de columna: solo [a-z0-9_], snake_case
pub fn sanitize_column_name(name: &str) -> String { ... }

/// Convierte tipo de columna a SQLite type
pub fn column_type_to_sqlite(column_type: &str) -> &str {
    match column_type {
        "text" => "TEXT",
        "number" => "REAL",
        "boolean" => "INTEGER",  -- 0/1
        "date" => "TEXT",        -- ISO 8601 string
        "json" => "TEXT",        -- JSON string
        _ => "TEXT",
    }
}

/// Valida datos contra definición de columnas
pub fn validate_row_data(data: &serde_json::Value, columns: &[CustomColumn]) -> Result<(), String> {
    // Validar required fields
    // Validar tipos (number → f64, boolean → 0/1, date → ISO string)
    // Validar que no haya columnas inexistentes
}
```

### Comandos DDL (`ddl.rs`)

| Comando | Descripción | SQL generado |
| --- | --- | --- |
| `custom_table_create` | Crea tabla real + metadata | `CREATE TABLE z_* (...)` + trigger + INSERT metadata |
| `custom_table_add_column` | Añade columna real + metadata | `ALTER TABLE z_* ADD COLUMN col TYPE` + INSERT metadata |
| `custom_table_drop_column` | Elimina columna metadata (SQLite 3.35+ DROP COLUMN) | `ALTER TABLE z_* DROP COLUMN col` + DELETE metadata |
| `custom_table_drop` | Elimina tabla real + metadata | `DROP TABLE z_*` + `DROP TRIGGER z_*_updated_at` + DELETE metadata |

### Comandos DML (`dml.rs`)

| Comando | Descripción | SQL generado |
| --- | --- | --- |
| `custom_table_list_rows` | Lista filas de una tabla | `SELECT * FROM z_* ORDER BY id` |
| `custom_table_get_row` | Obtiene una fila | `SELECT * FROM z_* WHERE id = ?` |
| `custom_table_insert_row` | Inserta fila (validada) | `INSERT INTO z_* (col1, col2, ...) VALUES (?, ?, ...)` |
| `custom_table_update_row` | Actualiza fila (validada) | `UPDATE z_* SET col1 = ?, col2 = ? WHERE id = ?` |
| `custom_table_delete_row` | Elimina fila | `DELETE FROM z_* WHERE id = ?` |
| `custom_table_bulk_update` | Batch update para auto-save | Múltiples `UPDATE z_* SET ... WHERE id = ?` en transacción |
| `custom_table_insert_rows` | Batch insert | `INSERT INTO z_* (...) VALUES (...), (...), (...)` |

### Flujo de creación de tabla

```
1. Frontend envía: { name: "Mi Tabla", columns: [{name: "Nombre", type: "text"}, ...] }
2. Rust genera: real_table_name = "z_mi_tabla_a1b2c3d4"
3. Rust genera column_name para cada columna: "nombre", "precio", etc.
4. Ejecuta CREATE TABLE con columnas + defaults + triggers
5. INSERT en deployer_custom_tables (name, real_table_name)
6. INSERT en deployer_custom_columns (table_id, name, column_name, column_type, ...)
7. Retorna la tabla creada con su real_table_name
```

### Flujo de auto-save por celda

```
1. Frontend detecta cambio en celda: { row_id: 5, column: "precio", value: 29.99 }
2. Frontend invoca: custom_table_bulk_update({ updates: [{ id: 5, data: { precio: 29.99 } }] })
3. Rust valida: precio es tipo number → OK
4. Ejecuta: UPDATE z_mi_tabla_a1b2c3d4 SET precio = 29.99 WHERE id = 5
5. Retorna success
```

---

## FASE 3: Frontend — Rutas y Páginas

### Rutas (unplugin-vue-router)

```
dashboard/custom_tables.vue                # Layout panel
  custom_tables/index.vue                  # Listado de tablas (cards)
  custom_tables/add.vue                    # Crear tabla + columnas
  custom_tables/[id].vue                   # Grid editable (vista principal)
  custom_tables/[id]/edit.vue              # Editar estructura de tabla
  custom_tables/[...path].vue              # 404 catch-all
```

### Página: Listado (`index.vue`)

- Cards con: nombre, descripción, conteo de columnas/filas
- Botón "Crear tabla" en toolbar
- Click en card → `[id].vue`
- EmptyList cuando no hay tablas

### Página: Grid editable (`[id].vue`)

- Carga: invoke `custom_table_list_rows` + metadata de columnas
- Toolbar: nombre de tabla + botón editar estructura + agregar fila
- `<EditableGrid>` con columnas y filas
- Fila vacía al final para añadir registros
- EmptyState cuando no hay filas

### Página: Crear tabla (`add.vue`)

- Form: nombre, descripción
- `<ColumnEditor>` embebido para definir columnas iniciales
- Al submit: invoke `custom_table_create` → redirect a `[id].vue`

### Página: Editar estructura (`[id]/edit.vue`)

- Carga definición actual
- `<ColumnEditor>` con drag-and-drop
- Puede: renombrar, cambiar tipo, añadir/eliminar columnas
- Confirmación si se elimina una columna con datos

---

## FASE 4: Frontend — Componentes

### `EditableGrid.vue`

Wrapper de UTable con celdas editables.

```
Props:
  columns: CustomColumn[]    # definición de columnas (metadata)
  rows: any[]                # filas de datos (de z_* table)
  tableId: number            # id de la tabla metadata
  realTableName: string      # nombre real de la tabla

Comportamiento:
  - Genera columnas TanStack desde CustomColumn[]
  - Cada celda renderiza cell editor según column_type
  - Click en celda → activa modo edición
  - Tab → siguiente celda
  - Enter → guardar + siguiente fila
  - Escape → cancelar edición
  - Fila vacía al final
  - Auto-save: al perder foco → invoke custom_table_bulk_update
```

### Cell Editors

| Tipo | Componente | Render | Edit |
| --- | --- | --- | --- |
| `text` | `EditTextCell.vue` | Texto truncado | `<UInput>` |
| `number` | `EditNumberCell.vue` | Formateado | `<UInput type="number">` |
| `boolean` | `EditBooleanCell.vue` | `<UBadge>` (Sí/No) | `<UToggle>` |
| `date` | `EditDateCell.vue` | Fecha formateada | `<UDatePicker>` |
| `json` | `EditJsonCell.vue` | Preview JSON truncado | Modal `<UTextarea>` |

### `ColumnEditor.vue`

Editor de estructura de columnas con drag-and-drop.

```
Props:
  modelValue: CreateCustomColumnInput[]
  existingColumns?: CustomColumn[]  # para edición

Funcionalidad:
  - Lista reordenable (SortableJS, forceFallback: true)
  - Form inline: nombre, tipo, required
  - Botones: añadir, eliminar
  - Emits: update:modelValue
```

### Composables

```typescript
// src/composables/queries/custom_tables.ts
useCustomTableList()              // Drizzle → deployer_custom_tables
useCustomTableById(id)            // Drizzle → deployer_custom_tables
useCustomColumns(tableId)         // Drizzle → deployer_custom_columns

// Para datos dinámicos (z_* tables) — no usa Drizzle
// Se hace invoke directo en los componentes

// src/composables/useEditableGrid.ts
useEditableGrid(columns, rows, tableId, realTableName)
  // Estado: editingCell, dirtyCells
  // Métodos: startEdit, cancelEdit, saveCell, addRow, deleteRow
  // Auto-save: debounced bulk_update via invoke
```

---

## FASE 5: Integración

### Sidebar

```typescript
{
  label: 'Tablas',
  icon: 'i-lucide-table',
  to: '/dashboard/custom_tables'
}
```

### i18n

```json
{
  "custom_tables": {
    "title": "Tablas Personalizadas",
    "create": "Crear Tabla",
    "edit": "Editar Tabla",
    "name": "Nombre",
    "description": "Descripción",
    "columns": "Columnas",
    "add_column": "Añadir Columna",
    "delete_column": "Eliminar Columna",
    "rows": "Filas",
    "add_row": "Añadir Fila",
    "empty": "No hay tablas creadas",
    "empty_rows": "Añade tu primera fila",
    "types": {
      "text": "Texto",
      "number": "Número",
      "boolean": "Booleano",
      "date": "Fecha",
      "json": "JSON"
    }
  }
}
```

---

## Orden de implementación

| # | Paso | Archivos | Dependencias |
| --- | --- | --- | --- |
| 1 | Migración SQL (metadata tables) | `0002_custom_tables.up.sql` | Ninguna |
| 2 | Rust helpers (nombres, validación) | `custom_tables/helpers.rs` | Ninguna |
| 3 | Rust types metadata | `custom_tables/types.rs` | Ninguna |
| 4 | Rust crud metadata (macro) | `custom_tables/crud.rs` | #1, #3 |
| 5 | Rust DDL commands | `custom_tables/ddl.rs` | #2, #3 |
| 6 | Rust DML commands | `custom_tables/dml.rs` | #2, #3 |
| 7 | Rust mod.rs + re-exports | `custom_tables/mod.rs` | #4, #5, #6 |
| 8 | Registrar en lib.rs | `lib.rs` | #7 |
| 9 | Drizzle schema auto-generado | `bun run dev:db:generate` | #1 |
| 10 | i18n keys | `src/locales/es/*.json` | Ninguna |
| 11 | Composables metadata loaders | `src/composables/queries/custom_tables.ts` | #9 |
| 12 | Cell editor components | `src/components/custom-table/cells/*.vue` | Ninguna |
| 13 | ColumnEditor | `src/components/custom-table/ColumnEditor.vue` | Ninguna |
| 14 | EditableGrid | `src/components/custom-table/EditableGrid.vue` | #12, #13 |
| 15 | Página listado | `src/pages/dashboard/custom_tables/index.vue` | #11 |
| 16 | Página crear tabla | `src/pages/dashboard/custom_tables/add.vue` | #11, #13 |
| 17 | Página grid editable | `src/pages/dashboard/custom_tables/[id].vue` | #11, #14 |
| 18 | Página editar estructura | `src/pages/dashboard/custom_tables/[id]/edit.vue` | #11, #13 |
| 19 | Layout + sidebar | `custom_tables.vue`, sidebar config | #15 |
| 20 | Página 404 | `custom_tables/[...path].vue` | Ninguna |
| 21 | Verificar build | `bun run build` | Todos |

---

## Notas importantes

- **Tablas reales**: Cada tabla de usuario es una tabla SQLite real con `z_` prefijo. No EAV ni JSON.
- **Sin cifrado**: Las tablas personalizadas no manejan datos sensibles.
- **Naming**: `z_{sanitizado}_{hex8}` — el `z_` organiza al final de la BD en herramientas de.inspección.
- **Columnas por defecto**: Toda tabla tiene `id`, `created_at`, `updated_at` + trigger.
- **Tipos**: Solo text, number, boolean, date, json (sin select).
- **Drizzle**: Solo para metadata tables (static schema). Para datos dinámicos, invoke directo.
- **SortableJS**: Usar `forceFallback: true` (obligatorio en Tauri webview).
- **Vite watch**: Ignora `src-tauri/`, cambios en Rust requieren rebuild manual.
- **Schema Drizzle**: Nunca editar `schema.ts`/`relations.ts` a mano — siempre via `bun run dev:db:generate`.
- **Bulk update**: `custom_table_bulk_update` ejecuta múltiples UPDATEs en transacción.
- **SQLite DROP COLUMN**: Requiere SQLite 3.35+. Si no está disponible, solo marcar columna como obsoleta en metadata.
