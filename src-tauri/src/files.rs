// ---------------------------------------------------------------------------
// ARCHIVO AUTOGENERADO por scripts/generate-table-names.ts — NO EDITAR A MANO.
// Se regenera con: bun run tables:generate
//
// Schema de tablas con patrón "_files" y struct común de retorno.
// Columnas y struct derivados de file_table en src/lib/columns.helpers.ts;
// lo único que varía por entidad es el nombre de la tabla y la columna FK
// que referencia al módulo padre (por defecto "module_id").
// ---------------------------------------------------------------------------

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;

use crate::tables;

/// Columnas editables en INSERT/UPDATE (excluye PK y timestamps; la FK va primera).
pub const FILES_EDITABLE: &[&str] = &[
    "module_id",
    "file_path",
    "content",
    "is_binary",
    "name",
    "mime_type",
    "file_type",
    "size",
    "last_modified",
    "webkit_relative_path",
    "icon",
];

/// Descripción de una tabla con patrón "_files".
pub struct FilesTable {
    /// Nombre de la tabla (constante de crate::tables).
    pub table: &'static str,
    /// Columna que referencia al módulo padre.
    pub fk: &'static str,
}

/// Struct común de retorno para las tablas con patrón "_files".
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct ModuleFile {
    pub id: i64,
    pub module_id: i64,
    pub file_path: String,
    pub content: String,
    pub is_binary: bool,
    pub name: String,
    pub mime_type: Option<String>,
    pub file_type: String,
    pub size: Option<i64>,
    pub last_modified: Option<i64>,
    pub webkit_relative_path: Option<String>,
    pub icon: String,
    pub updated_at: String,
    pub created_at: String,
    pub deleted_at: Option<String>,
}

// ── Instancias por entidad ─────────────────────────────────────────
/// Tabla _files de: projects_docker_compose_files.ts
pub const DOCKER_COMPOSE_FILES: FilesTable = FilesTable {
    table: tables::TABLE_PROJECTS_DOCKER_COMPOSE_FILES,
    fk: "module_id",
};

/// Identificador de una tabla "_files". Serde lo serializa en snake_case del
/// variante (p.ej. DockerComposeFiles -> "docker_compose_files"), el mismo
/// valor string que usaba el frontend como id de tabla.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[serde(rename_all = "snake_case")]
pub enum FilesTableId {
    DockerComposeFiles,
}

impl FilesTableId {
    /// FilesTable correspondiente a este identificador.
    pub fn schema(self) -> &'static FilesTable {
        match self {
            Self::DockerComposeFiles => &DOCKER_COMPOSE_FILES,
        }
    }
}
