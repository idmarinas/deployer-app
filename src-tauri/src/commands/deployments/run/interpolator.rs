use sqlx::SqlitePool;
use std::collections::HashMap;

use crate::commands::deployments::types::Deployment;
use crate::commands::global_variables::types::GlobalVariable;
use crate::commands::hosts::types::Host;
use crate::commands::projects::types::Project;
use crate::commands::projects::variables::types::ProjectVariable;
use crate::db::{self, DbEntity, EncryptionConfigCache};

use super::types::VariableSnapshot;

/// Construye el snapshot de variables para un deployment.
///
/// Precedencia (mayor a menor, el más alto sobreescribe):
///   1. Variables de proyecto (project_variables)
///   2. Variables globales (global_variables)
///   3. Variables de sistema (inyectadas por el runner)
///
/// Las variables secretas se incluyen descifradas en el snapshot (uso interno del runner,
/// nunca se envían al frontend directamente).
pub async fn build_snapshot(
    pool: &SqlitePool,
    cache: &EncryptionConfigCache,
    key: &[u8],
    deployment: &Deployment,
    project: &Project,
    host: &Host,
) -> Result<VariableSnapshot, String> {
    let mut vars: HashMap<String, String> = HashMap::new();

    // ── 1. Variables de sistema (menor precedencia) ──────────────────────────
    vars.insert("deployment_id".to_string(), deployment.id.to_string());
    vars.insert("version".to_string(), deployment.version.clone());
    vars.insert("tag".to_string(), deployment.tag.clone());
    vars.insert("build".to_string(), deployment.build.to_string());
    vars.insert("host".to_string(), host.host.clone());
    vars.insert("host_user".to_string(), host.username.clone());

    if let Some(ref rwd) = project.remote_working_dir {
        vars.insert("remote_working_dir".to_string(), rwd.clone());
    }
    if let Some(ref lwd) = project.local_working_dir {
        vars.insert("local_working_dir".to_string(), lwd.clone());
    }

    // ── 2. Variables globales ────────────────────────────────────────────────
    // Usamos patrón manual (from_row + apply_decryption) porque GlobalVariable.value
    // usa #[db_conditional_encrypt(condition = "is_secret")], que se gestiona por
    // el macro y no por encryption_config. db::fetch_all solo descifra por
    // encryption_config, por lo que no resuelve correctamente campos condicionales.
    let sql = format!("SELECT * FROM {}", GlobalVariable::table_name());
    let rows = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error al cargar variables globales: {}", e))?;

    for row in rows {
        let mut entity = GlobalVariable::from_row(&row)
            .map_err(|e| format!("Error al leer global_variable: {}", e))?;

        let mut fields = entity.to_fields_all();
        db::apply_decryption::<GlobalVariable>(&mut fields, cache, pool, key)
            .await
            .map_err(|e| format!("Error al descifrar global_variable: {}", e))?;

        entity = GlobalVariable::from_fields(fields)
            .map_err(|e| format!("Error al reconstruir global_variable: {}", e))?;

        vars.insert(entity.name.clone(), entity.value.clone());
    }

    // ── 3. Variables de proyecto (mayor precedencia) ─────────────────────────
    let sql = format!(
        "SELECT * FROM {} WHERE project_id = ?1",
        ProjectVariable::table_name()
    );

    let rows = sqlx::query(&sql)
        .bind(deployment.project_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error al cargar variables de proyecto: {}", e))?;

    for row in rows {
        let mut entity = ProjectVariable::from_row(&row)
            .map_err(|e| format!("Error al leer project_variable: {}", e))?;

        let mut fields = entity.to_fields_all();
        db::apply_decryption::<ProjectVariable>(&mut fields, cache, pool, key)
            .await
            .map_err(|e| format!("Error al descifrar project_variable: {}", e))?;

        entity = ProjectVariable::from_fields(fields)
            .map_err(|e| format!("Error al reconstruir project_variable: {}", e))?;

        vars.insert(entity.name.clone(), entity.value.clone());
    }

    Ok(VariableSnapshot::new(vars))
}

/// Evalúa una condición simple de la forma `{{var}} == valor` o `{{var}} != valor`.
/// Devuelve `true` si la condición se cumple (la task debe ejecutarse).
/// Si la condición no puede parsearse, devuelve `true` (safe default: ejecutar).
pub fn evaluate_condition(condition: &str, snapshot: &VariableSnapshot) -> bool {
    let interpolated = snapshot.interpolate(condition);
    let trimmed = interpolated.trim();

    if let Some(pos) = trimmed.find("==") {
        let left = trimmed[..pos].trim();
        let right = trimmed[pos + 2..].trim();
        return left == right;
    }

    if let Some(pos) = trimmed.find("!=") {
        let left = trimmed[..pos].trim();
        let right = trimmed[pos + 2..].trim();
        return left != right;
    }

    match trimmed.to_lowercase().as_str() {
        "true" | "1" | "yes" => true,
        "false" | "0" | "no" => false,
        _ => true,
    }
}
