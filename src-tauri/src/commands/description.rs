use serde_json::Value;

/// Longitud máxima del JSON serializado en caracteres.
const MAX_LENGTH: usize = 50_000;

/// Profundidad máxima del árbol JSONContent.
const MAX_DEPTH: usize = 10;

/// Nodos permitidos en el árbol JSONContent.
const ALLOWED_NODE_TYPES: &[&str] = &[
    "doc",
    "paragraph",
    "text",
    // "heading",
    "bulletList",
    "orderedList",
    "listItem",
    // "blockquote",
    // "codeBlock",
    "hardBreak",
    // "horizontalRule",
];

/// Marks (formatos inline) permitidos.
const ALLOWED_MARK_TYPES: &[&str] = &[
    "bold", "italic", "underline", "strike", "code", "link",
];

/// Valida un string de descripción JSONContent.
/// Devuelve Ok(()) si es válido, o Err(String) con la clave de error.
pub fn validate_description(raw: &str) -> Result<(), String> {
    if raw.len() > MAX_LENGTH {
        return Err("description_too_long".to_string());
    }

    let value: Value = serde_json::from_str(raw)
        .map_err(|_| "description_invalid_json".to_string())?;

    validate_node(&value, 0)
}

/// Valida recursivamente un nodo JSONContent.
fn validate_node(node: &Value, depth: usize) -> Result<(), String> {
    if depth > MAX_DEPTH {
        return Err("description_too_deep".to_string());
    }

    let obj = node.as_object()
        .ok_or_else(|| "description_invalid_node".to_string())?;

    // Validar tipo de nodo
    let node_type = obj.get("type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "description_missing_type".to_string())?;

    if !ALLOWED_NODE_TYPES.contains(&node_type) {
        return Err("description_invalid_node_type".to_string());
    }

    // Validar hijos recursivamente
    if let Some(content) = obj.get("content").and_then(|v| v.as_array()) {
        for child in content {
            validate_node(child, depth + 1)?;
        }
    }

    // Validar marks
    if let Some(marks) = obj.get("marks").and_then(|v| v.as_array()) {
        for mark in marks {
            validate_mark(mark)?;
        }
    }

    Ok(())
}

/// Valida un mark (formato inline).
fn validate_mark(mark: &Value) -> Result<(), String> {
    let obj = mark.as_object()
        .ok_or_else(|| "description_invalid_mark".to_string())?;

    let mark_type = obj.get("type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "description_missing_mark_type".to_string())?;

    if !ALLOWED_MARK_TYPES.contains(&mark_type) {
        return Err("description_invalid_mark_type".to_string());
    }

    // Validar attrs si existe
    if let Some(attrs) = obj.get("attrs") {
        if !attrs.is_object() {
            return Err("description_invalid_mark_attrs".to_string());
        }
    }

    Ok(())
}

/// Valida un campo `Option<String>` de descripción.
/// Si es `Some`, valida el contenido JSONContent; si es `None`, no hace nada.
pub fn validate_description_opt(desc: &Option<String>) -> Result<(), String> {
    if let Some(s) = desc {
        validate_description(s)?;
    }
    Ok(())
}

/// Valida un campo `Patch<String>` de descripción.
/// Si es `Value`, valida el contenido JSONContent; `Null` y `Unset` se ignoran.
pub fn validate_description_patch(desc: &crate::commands::Patch<String>) -> Result<(), String> {
    if let crate::commands::Patch::Value(s) = desc {
        validate_description(s)?;
    }
    Ok(())
}

/// Trait para validar `description` en inputs CRUD.
/// Default: `Ok(())` — los tipos sin campo description usan impls vacías.
pub trait ValidateDescription {
    fn validate_create(&self) -> Result<(), String> { Ok(()) }
    fn validate_update(&self) -> Result<(), String> { Ok(()) }
}

use super::passkeys::types::{CreatePasskeyInput, UpdatePasskeyInput};
use super::hosts::types::{CreateHostInput, UpdateHostInput};
use super::global_variables::types::{CreateGlobalVariableInput, UpdateGlobalVariableInput};
use super::projects::types::{CreateProjectInput, UpdateProjectInput};
use super::tasks::types::{CreateTaskInput, UpdateTaskInput};
use super::projects::variables::types::{CreateProjectVariableInput, UpdateProjectVariableInput};
use super::projects::framework_configs::types::{CreateFrameworkConfigInput, UpdateFrameworkConfigInput};
use super::deployments::types::{CreateDeploymentInput, UpdateDeploymentInput};
use super::deployments::executions::types::{CreateDeploymentExecutionInput, UpdateDeploymentExecutionInput};
use super::deployments::rollbacks::types::{CreateDeploymentRollbackInput, UpdateDeploymentRollbackInput};
use super::projects::hosts::types::{CreateProjectHostInput, UpdateProjectHostInput};
use super::projects::tasks::types::{CreateProjectTaskInput, UpdateProjectTaskInput};
use super::tasks::dependencies::types::{CreateTaskDependencyInput, UpdateTaskDependencyInput};
use super::docker_composes::types::{CreateDockerComposeInput, UpdateDockerComposeInput};

impl ValidateDescription for CreatePasskeyInput {
    fn validate_create(&self) -> Result<(), String> { validate_description_opt(&self.description) }
}
impl ValidateDescription for UpdatePasskeyInput {
    fn validate_update(&self) -> Result<(), String> { validate_description_patch(&self.description) }
}
impl ValidateDescription for CreateHostInput {
    fn validate_create(&self) -> Result<(), String> { validate_description_opt(&self.description) }
}
impl ValidateDescription for UpdateHostInput {
    fn validate_update(&self) -> Result<(), String> { validate_description_patch(&self.description) }
}
impl ValidateDescription for CreateGlobalVariableInput {
    fn validate_create(&self) -> Result<(), String> { validate_description_opt(&self.description) }
}
impl ValidateDescription for UpdateGlobalVariableInput {
    fn validate_update(&self) -> Result<(), String> { validate_description_patch(&self.description) }
}
impl ValidateDescription for CreateProjectInput {
    fn validate_create(&self) -> Result<(), String> { validate_description_opt(&self.description) }
}
impl ValidateDescription for UpdateProjectInput {
    fn validate_update(&self) -> Result<(), String> { validate_description_patch(&self.description) }
}
impl ValidateDescription for CreateTaskInput {
    fn validate_create(&self) -> Result<(), String> { validate_description_opt(&self.description) }
}
impl ValidateDescription for UpdateTaskInput {
    fn validate_update(&self) -> Result<(), String> { validate_description_patch(&self.description) }
}
impl ValidateDescription for CreateProjectVariableInput {
    fn validate_create(&self) -> Result<(), String> { validate_description_opt(&self.description) }
}
impl ValidateDescription for UpdateProjectVariableInput {
    fn validate_update(&self) -> Result<(), String> { validate_description_patch(&self.description) }
}
impl ValidateDescription for CreateFrameworkConfigInput {
    fn validate_create(&self) -> Result<(), String> { validate_description_opt(&self.description) }
}
impl ValidateDescription for UpdateFrameworkConfigInput {
    fn validate_update(&self) -> Result<(), String> { validate_description_patch(&self.description) }
}

impl ValidateDescription for CreateDeploymentInput {}
impl ValidateDescription for UpdateDeploymentInput {}
impl ValidateDescription for CreateDeploymentExecutionInput {}
impl ValidateDescription for UpdateDeploymentExecutionInput {}
impl ValidateDescription for CreateDeploymentRollbackInput {}
impl ValidateDescription for UpdateDeploymentRollbackInput {}
impl ValidateDescription for CreateProjectHostInput {}
impl ValidateDescription for UpdateProjectHostInput {}
impl ValidateDescription for CreateProjectTaskInput {}
impl ValidateDescription for UpdateProjectTaskInput {}
impl ValidateDescription for CreateTaskDependencyInput {}
impl ValidateDescription for UpdateTaskDependencyInput {}

impl ValidateDescription for CreateDockerComposeInput {
    fn validate_create(&self) -> Result<(), String> { validate_description_opt(&self.description) }
}
impl ValidateDescription for UpdateDockerComposeInput {
    fn validate_update(&self) -> Result<(), String> { validate_description_patch(&self.description) }
}
