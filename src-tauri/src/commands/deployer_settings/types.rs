use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Par clave-valor de la tabla `deployer_settings`.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DeployerSetting {
    pub key: String,
    pub value: Option<String>,
}
