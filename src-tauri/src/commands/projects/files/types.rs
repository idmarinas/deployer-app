use serde::Deserialize;
use ts_rs::TS;

use crate::files::FilesTableId;

/// Entrada de un archivo a sincronizar. Común a cualquier módulo que utilice el
/// patrón "_files" (solo cambia el `module_id` y la tabla, que van en
/// [`SyncModuleFilesInput`]).
#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct ModuleFileInput {
    #[ts(optional)]
    pub id: Option<i64>,
    pub file_path: String,
    #[ts(optional = nullable)]
    pub content: Option<String>,
    pub is_binary: bool,
    pub name: String,
    #[ts(optional = nullable)]
    pub mime_type: Option<String>,
    pub file_type: String,
    #[ts(optional = nullable)]
    pub size: Option<i64>,
    #[ts(optional = nullable)]
    pub last_modified: Option<i64>,
    #[ts(optional = nullable)]
    pub webkit_relative_path: Option<String>,
    #[ts(optional = nullable)]
    pub icon: Option<String>,
}

/// Identificador de tabla "_files" por defecto (la de Docker Compose).
fn default_table() -> FilesTableId {
    FilesTableId::DockerComposeFiles
}

/// Entrada del comando `sync_module_files`: el `module_id` del módulo padre,
/// la `table` "_files" a usar y la lista de archivos.
#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct SyncModuleFilesInput {
    pub module_id: i64,
    #[serde(default = "default_table")]
    pub table: FilesTableId,
    pub files: Vec<ModuleFileInput>,
}
