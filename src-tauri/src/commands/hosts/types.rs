use serde::{Deserialize, Serialize};
use ts_rs::TS;

// ============================================================================
// Enum AuthType
// ============================================================================

/// Tipo de autenticación SSH soportado por la aplicación.
/// Solo puede ser `password` (contraseña) o `key` (clave privada).
#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::Type, Default)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "TEXT", rename_all = "lowercase")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum AuthType {
    #[default]
    Password,
    Key,
}

impl std::fmt::Display for AuthType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuthType::Password => write!(f, "password"),
            AuthType::Key => write!(f, "key"),
        }
    }
}

impl std::str::FromStr for AuthType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "password" => Ok(AuthType::Password),
            "key" => Ok(AuthType::Key),
            other => Err(format!("Tipo de autenticación no válido: '{}'", other)),
        }
    }
}

// ============================================================================
// Información del sistema (JSON almacenado en deployer_hosts.system_info)
// ============================================================================

/// Información del sistema detectada vía SSH, almacenada como JSON en `system_info`.
/// Contiene tanto la info estática (hardware, SO) como la del gestor de paquetes.
#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct HostSystemInfo {
    pub package_manager: String,
    pub package_manager_version: String,
    pub kernel: String,
    pub arch: String,
    /// Distribución del SO detectada vía SSH (ej: "Ubuntu 22.04 LTS").
    #[serde(default)]
    pub distribution: String,
    /// Número de cores CPU (ej: "8").
    #[serde(default)]
    pub cpu_cores: String,
    /// RAM total (ej: "16Gi").
    #[serde(default)]
    pub memory_total: String,
    /// Disco total (ej: "500G").
    #[serde(default)]
    pub disk_total: String,
    /// SO y versión (ej: "Ubuntu 22.04 LTS").
    #[serde(default)]
    pub os_release: String,
    /// Timestamp ISO 8601 de la última vez que se obtuvo esta información.
    #[serde(default)]
    pub last_checked_at: Option<String>,
}

// ============================================================================
// Métricas dinámicas (JSON almacenado en deployer_hosts.status_info)
// ============================================================================

/// Métricas dinámicas del servidor capturadas en un momento dado.
/// Almacenada como JSON en `status_info`.
#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct HostStatusMetrics {
    /// Porcentaje de uso CPU (ej: "23.45").
    #[serde(default)]
    pub cpu_usage: String,
    /// Porcentaje de uso RAM (ej: "67.89").
    #[serde(default)]
    pub ram_usage: String,
    /// Porcentaje de uso disco (ej: "45.12").
    #[serde(default)]
    pub disk_usage: String,
    /// Timestamp ISO 8601 de cuándo se capturaron estas métricas.
    #[serde(default)]
    pub last_checked_at: Option<String>,
}
