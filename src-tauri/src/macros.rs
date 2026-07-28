/// Genera los 5 comandos CRUD (`create`, `get`, `list`, `update`, `delete`)
/// para una entidad Tauri, eliminando toda la duplicación de boilerplate.
///
/// # Parámetros
///
/// | Parámetro | Obligatorio | Descripción |
/// |---|---|---|
/// | `entity` | Sí | Tipo de la entidad (implementa `DbEntity`) |
/// | `fun` | Sí | Prefijo snake_case para los nombres de función (create/get/update/delete) |
/// | `list_fun` | Sí | Prefijo snake_case para el comando `list` (usualmente plural) |
/// | `i18n` | Sí | Prefijo de claves i18n (ej. `"global_variables"`) |
/// | `create` | Sí | Input type + método de conversión (`Input => into_entity`) |
/// | `update` | Sí | Input type + función de construcción de fields |
/// | `conditional_encrypt` | No | Campo valor y campo condición para cifrado condicional |
/// | `list_filter` | No | Nombre de columna y tipo para filtrar el listado |
///
/// # Ejemplo
///
/// ```ignore
/// // Simple (sin cifrado condicional, sin filtro)
/// crud_commands! {
///     pub struct TaskCrud {
///         entity: Task,
///         fun: task,
///         list_fun: tasks,
///         i18n: "tasks",
///         create: CreateTaskInput => into_task,
///         update: UpdateTaskInput => build_task_update,
///     }
/// }
///
/// // Con cifrado condicional
/// crud_commands! {
///     pub struct GlobalVariableCrud {
///         entity: GlobalVariable,
///         fun: global_variable,
///         list_fun: global_variables,
///         i18n: "global_variables",
///         create: CreateGlobalVariableInput => into_global_variable,
///         update: UpdateGlobalVariableInput => build_global_variable_update,
///         conditional_encrypt: value => is_secret,
///     }
/// }
///
/// // Con filtro en listado (ej. project_id)
/// crud_commands! {
///     pub struct ProjectVariableCrud {
///         entity: ProjectVariable,
///         fun: project_variable,
///         list_fun: project_variables,
///         i18n: "project_variables",
///         create: CreateProjectVariableInput => into_project_variable,
///         update: UpdateProjectVariableInput => build_project_variable_update,
///         conditional_encrypt: value => is_secret,
///         list_filter: project_id: i64,
///     }
/// }
/// ```
#[macro_export]
macro_rules! crud_commands {
    // ====================================================================
    // Arm 1: Sin cifrado condicional, Sin filtro en listado
    // ====================================================================
    (
        $(#[$meta:meta])*
        $vis:vis struct $name:ident {
            entity: $entity:ty,
            fun: $fun:ident,
            list_fun: $list_fun:ident,
            i18n: $i18n:expr,
            create: $create_input:ty => $into:ident,
            update: $update_input:ty => $build:ident,
        }
    ) => {
        deployer_macros::ident_concat! {
            #[allow(non_snake_case, unused_imports)]
            mod [<crud_ $name>] {
                use super::*;
                use std::collections::HashMap;
                use serde_json::Value;
                use tauri::AppHandle;
                use $crate::response::CommandResponse;
                use $crate::description::ValidateDescription;
                use $crate::helpers::open_crypto_context;
                use $crate::crud::{self as db, DbEntity};

                // ---- CREATE ----
                #[tauri::command]
                pub async fn [<crud_create_ $fun>](
                    app: AppHandle,
                    input: $create_input,
                ) -> Result<CommandResponse<i64>, String> {
                    if let Err(e) = input.validate_create() {
                        return Ok(CommandResponse::err(
                            concat!($i18n, ".errors.validation_failed"),
                            HashMap::from([("reason".to_string(), e)]),
                        ));
                    }
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    let entity = input.$into();
                    match db::insert::<$entity>(&pool, &entity, &key).await {
                        Ok(id) => Ok(CommandResponse::ok(id, concat!($i18n, ".success.created"))),
                        Err(e) => Ok(db::error_to_response($i18n, "create_failed", e)),
                    }
                }

                // ---- GET ----
                #[tauri::command]
                pub async fn [<crud_get_ $fun>](
                    app: AppHandle,
                    id: i64,
                ) -> Result<CommandResponse<$entity>, String> {
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    match db::fetch_one_frontend::<$entity>(&pool, id, &key).await {
                        Ok(Some(entity)) => Ok(CommandResponse::ok(entity, concat!($i18n, ".success.fetched"))),
                        Ok(None) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "fetch_failed", e)),
                    }
                }

                // ---- LIST ----
                #[tauri::command]
                pub async fn [<crud_list_ $list_fun>](
                    app: AppHandle,
                ) -> Result<CommandResponse<Vec<$entity>>, String> {
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    match db::fetch_all_frontend::<$entity>(&pool, &key).await {
                        Ok(entities) => Ok(CommandResponse::ok(entities, concat!($i18n, ".success.listed"))),
                        Err(e) => Ok(db::error_to_response($i18n, "list_failed", e)),
                    }
                }

                // ---- UPDATE ----
                #[tauri::command]
                pub async fn [<crud_update_ $fun>](
                    app: AppHandle,
                    id: i64,
                    input: $update_input,
                ) -> Result<CommandResponse<()>, String> {
                    if let Err(e) = input.validate_update() {
                        return Ok(CommandResponse::err(
                            concat!($i18n, ".errors.validation_failed"),
                            HashMap::from([("reason".to_string(), e)]),
                        ));
                    }
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };

                    let mut fields: Vec<(String, Value)> = Vec::new();
                    $build(&input, &mut fields);

                    match db::update_fields::<$entity>(&pool, id, fields, &key).await {
                        Ok(true) => Ok(CommandResponse::ok_empty(concat!($i18n, ".success.updated"))),
                        Ok(false) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "update_failed", e)),
                    }
                }

                // ---- DELETE ----
                #[tauri::command]
                pub async fn [<crud_delete_ $fun>](
                    app: AppHandle,
                    id: i64,
                ) -> Result<CommandResponse<()>, String> {
                    let (pool, _) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    match db::delete(&pool, <$entity as DbEntity>::table_name(), id).await {
                        Ok(true) => Ok(CommandResponse::ok_empty(concat!($i18n, ".success.deleted"))),
                        Ok(false) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "delete_failed", e)),
                    }
                }
            }

            pub use [<crud_ $name>]::*;
        }
    };

    // ====================================================================
    // Arm 2: Con cifrado condicional, Sin filtro en listado
    // ====================================================================
    (
        $(#[$meta:meta])*
        $vis:vis struct $name:ident {
            entity: $entity:ty,
            fun: $fun:ident,
            list_fun: $list_fun:ident,
            i18n: $i18n:expr,
            create: $create_input:ty => $into:ident,
            update: $update_input:ty => $build:ident,
            conditional_encrypt: $cond_val:ident => $cond_field:ident,
        }
    ) => {
        deployer_macros::ident_concat! {
            #[allow(non_snake_case, unused_imports)]
            mod [<crud_ $name>] {
                use super::*;
                use std::collections::HashMap;
                use serde_json::Value;
                use tauri::AppHandle;
                use $crate::response::CommandResponse;
                use $crate::description::ValidateDescription;
                use $crate::helpers::open_crypto_context;
                use $crate::crud::{self as db, DbEntity};

                // ---- CREATE ----
                #[tauri::command]
                pub async fn [<crud_create_ $fun>](
                    app: AppHandle,
                    input: $create_input,
                ) -> Result<CommandResponse<i64>, String> {
                    if let Err(e) = input.validate_create() {
                        return Ok(CommandResponse::err(
                            concat!($i18n, ".errors.validation_failed"),
                            HashMap::from([("reason".to_string(), e)]),
                        ));
                    }
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    let entity = input.$into();
                    match db::insert::<$entity>(&pool, &entity, &key).await {
                        Ok(id) => Ok(CommandResponse::ok(id, concat!($i18n, ".success.created"))),
                        Err(e) => Ok(db::error_to_response($i18n, "create_failed", e)),
                    }
                }

                // ---- GET ----
                #[tauri::command]
                pub async fn [<crud_get_ $fun>](
                    app: AppHandle,
                    id: i64,
                ) -> Result<CommandResponse<$entity>, String> {
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    match db::fetch_one_frontend::<$entity>(&pool, id, &key).await {
                        Ok(Some(entity)) => Ok(CommandResponse::ok(entity, concat!($i18n, ".success.fetched"))),
                        Ok(None) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "fetch_failed", e)),
                    }
                }

                // ---- LIST ----
                #[tauri::command]
                pub async fn [<crud_list_ $list_fun>](
                    app: AppHandle,
                ) -> Result<CommandResponse<Vec<$entity>>, String> {
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    match db::fetch_all_frontend::<$entity>(&pool, &key).await {
                        Ok(entities) => Ok(CommandResponse::ok(entities, concat!($i18n, ".success.listed"))),
                        Err(e) => Ok(db::error_to_response($i18n, "list_failed", e)),
                    }
                }

                // ---- UPDATE (con cifrado condicional) ----
                #[tauri::command]
                pub async fn [<crud_update_ $fun>](
                    app: AppHandle,
                    id: i64,
                    input: $update_input,
                ) -> Result<CommandResponse<()>, String> {
                    if let Err(e) = input.validate_update() {
                        return Ok(CommandResponse::err(
                            concat!($i18n, ".errors.validation_failed"),
                            HashMap::from([("reason".to_string(), e)]),
                        ));
                    }
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };

                    let mut fields: Vec<(String, Value)> = Vec::new();

                    // Campos no condicionales (vía función del usuario)
                    $build(&input, &mut fields);

                    // Campos condicionales (resolución + validación is_secret)
                    {
                        let cond_value = input.$cond_val;
                        let cond_is_secret = input.$cond_field;
                        if cond_value.is_some() || cond_is_secret.is_some() {
                            let cond_fields = db::resolve_conditional_fields(
                                &pool,
                                id,
                                <$entity as DbEntity>::table_name(),
                                stringify!($cond_val),
                                stringify!($cond_field),
                                cond_value,
                                cond_is_secret,
                            )
                            .await?;
                            fields.extend(cond_fields);
                        }
                    }

                    match db::update_fields::<$entity>(&pool, id, fields, &key).await {
                        Ok(true) => Ok(CommandResponse::ok_empty(concat!($i18n, ".success.updated"))),
                        Ok(false) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "update_failed", e)),
                    }
                }

                // ---- DELETE ----
                #[tauri::command]
                pub async fn [<crud_delete_ $fun>](
                    app: AppHandle,
                    id: i64,
                ) -> Result<CommandResponse<()>, String> {
                    let (pool, _) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    match db::delete(&pool, <$entity as DbEntity>::table_name(), id).await {
                        Ok(true) => Ok(CommandResponse::ok_empty(concat!($i18n, ".success.deleted"))),
                        Ok(false) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "delete_failed", e)),
                    }
                }
            }

            pub use [<crud_ $name>]::*;
        }
    };

    // ====================================================================
    // Arm 3: Sin cifrado condicional, Con filtro en listado
    // ====================================================================
    (
        $(#[$meta:meta])*
        $vis:vis struct $name:ident {
            entity: $entity:ty,
            fun: $fun:ident,
            list_fun: $list_fun:ident,
            i18n: $i18n:expr,
            create: $create_input:ty => $into:ident,
            update: $update_input:ty => $build:ident,
            list_filter: $filter_col:ident: $filter_ty:ty,
        }
    ) => {
        deployer_macros::ident_concat! {
            #[allow(non_snake_case, unused_imports)]
            mod [<crud_ $name>] {
                use super::*;
                use std::collections::HashMap;
                use serde_json::Value;
                use tauri::AppHandle;
                use $crate::response::CommandResponse;
                use $crate::description::ValidateDescription;
                use $crate::helpers::open_crypto_context;
                use $crate::crud::{self as db, DbEntity};

                // ---- CREATE ----
                #[tauri::command]
                pub async fn [<crud_create_ $fun>](
                    app: AppHandle,
                    input: $create_input,
                ) -> Result<CommandResponse<i64>, String> {
                    if let Err(e) = input.validate_create() {
                        return Ok(CommandResponse::err(
                            concat!($i18n, ".errors.validation_failed"),
                            HashMap::from([("reason".to_string(), e)]),
                        ));
                    }
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    let entity = input.$into();
                    match db::insert::<$entity>(&pool, &entity, &key).await {
                        Ok(id) => Ok(CommandResponse::ok(id, concat!($i18n, ".success.created"))),
                        Err(e) => Ok(db::error_to_response($i18n, "create_failed", e)),
                    }
                }

                // ---- GET ----
                #[tauri::command]
                pub async fn [<crud_get_ $fun>](
                    app: AppHandle,
                    id: i64,
                ) -> Result<CommandResponse<$entity>, String> {
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    match db::fetch_one_frontend::<$entity>(&pool, id, &key).await {
                        Ok(Some(entity)) => Ok(CommandResponse::ok(entity, concat!($i18n, ".success.fetched"))),
                        Ok(None) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "fetch_failed", e)),
                    }
                }

                // ---- LIST (con filtro) ----
                #[tauri::command]
                pub async fn [<crud_list_ $list_fun>](
                    app: AppHandle,
                    $filter_col: $filter_ty,
                ) -> Result<CommandResponse<Vec<$entity>>, String> {
                    let (pool, _) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    let sql = format!(
                        "SELECT * FROM {} WHERE {} = ?1",
                        <$entity as DbEntity>::table_name(),
                        stringify!($filter_col),
                    );
                    let bind_value = serde_json::to_value(&$filter_col).unwrap_or_default();
                    match db::fetch_all_where_frontend::<$entity>(&pool, &sql, &bind_value).await {
                        Ok(entities) => Ok(CommandResponse::ok(entities, concat!($i18n, ".success.listed"))),
                        Err(e) => Ok(db::error_to_response($i18n, "list_failed", e)),
                    }
                }

                // ---- UPDATE ----
                #[tauri::command]
                pub async fn [<crud_update_ $fun>](
                    app: AppHandle,
                    id: i64,
                    input: $update_input,
                ) -> Result<CommandResponse<()>, String> {
                    if let Err(e) = input.validate_update() {
                        return Ok(CommandResponse::err(
                            concat!($i18n, ".errors.validation_failed"),
                            HashMap::from([("reason".to_string(), e)]),
                        ));
                    }
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };

                    let mut fields: Vec<(String, Value)> = Vec::new();
                    $build(&input, &mut fields);

                    match db::update_fields::<$entity>(&pool, id, fields, &key).await {
                        Ok(true) => Ok(CommandResponse::ok_empty(concat!($i18n, ".success.updated"))),
                        Ok(false) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "update_failed", e)),
                    }
                }

                // ---- DELETE ----
                #[tauri::command]
                pub async fn [<crud_delete_ $fun>](
                    app: AppHandle,
                    id: i64,
                ) -> Result<CommandResponse<()>, String> {
                    let (pool, _) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    match db::delete(&pool, <$entity as DbEntity>::table_name(), id).await {
                        Ok(true) => Ok(CommandResponse::ok_empty(concat!($i18n, ".success.deleted"))),
                        Ok(false) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "delete_failed", e)),
                    }
                }
            }

            pub use [<crud_ $name>]::*;
        }
    };

    // ====================================================================
    // Arm 4: Con cifrado condicional, Con filtro en listado
    // ====================================================================
    (
        $(#[$meta:meta])*
        $vis:vis struct $name:ident {
            entity: $entity:ty,
            fun: $fun:ident,
            list_fun: $list_fun:ident,
            i18n: $i18n:expr,
            create: $create_input:ty => $into:ident,
            update: $update_input:ty => $build:ident,
            conditional_encrypt: $cond_val:ident => $cond_field:ident,
            list_filter: $filter_col:ident: $filter_ty:ty,
        }
    ) => {
        deployer_macros::ident_concat! {
            #[allow(non_snake_case, unused_imports)]
            mod [<crud_ $name>] {
                use super::*;
                use std::collections::HashMap;
                use serde_json::Value;
                use tauri::AppHandle;
                use $crate::response::CommandResponse;
                use $crate::description::ValidateDescription;
                use $crate::helpers::open_crypto_context;
                use $crate::crud::{self as db, DbEntity};

                // ---- CREATE ----
                #[tauri::command]
                pub async fn [<crud_create_ $fun>](
                    app: AppHandle,
                    input: $create_input,
                ) -> Result<CommandResponse<i64>, String> {
                    if let Err(e) = input.validate_create() {
                        return Ok(CommandResponse::err(
                            concat!($i18n, ".errors.validation_failed"),
                            HashMap::from([("reason".to_string(), e)]),
                        ));
                    }
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    let entity = input.$into();
                    match db::insert::<$entity>(&pool, &entity, &key).await {
                        Ok(id) => Ok(CommandResponse::ok(id, concat!($i18n, ".success.created"))),
                        Err(e) => Ok(db::error_to_response($i18n, "create_failed", e)),
                    }
                }

                // ---- GET ----
                #[tauri::command]
                pub async fn [<crud_get_ $fun>](
                    app: AppHandle,
                    id: i64,
                ) -> Result<CommandResponse<$entity>, String> {
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    match db::fetch_one_frontend::<$entity>(&pool, id, &key).await {
                        Ok(Some(entity)) => Ok(CommandResponse::ok(entity, concat!($i18n, ".success.fetched"))),
                        Ok(None) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "fetch_failed", e)),
                    }
                }

                // ---- LIST (con filtro) ----
                #[tauri::command]
                pub async fn [<crud_list_ $list_fun>](
                    app: AppHandle,
                    $filter_col: $filter_ty,
                ) -> Result<CommandResponse<Vec<$entity>>, String> {
                    let (pool, _) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    let sql = format!(
                        "SELECT * FROM {} WHERE {} = ?1",
                        <$entity as DbEntity>::table_name(),
                        stringify!($filter_col),
                    );
                    let bind_value = serde_json::to_value(&$filter_col).unwrap_or_default();
                    match db::fetch_all_where_frontend::<$entity>(&pool, &sql, &bind_value).await {
                        Ok(entities) => Ok(CommandResponse::ok(entities, concat!($i18n, ".success.listed"))),
                        Err(e) => Ok(db::error_to_response($i18n, "list_failed", e)),
                    }
                }

                // ---- UPDATE (con cifrado condicional) ----
                #[tauri::command]
                pub async fn [<crud_update_ $fun>](
                    app: AppHandle,
                    id: i64,
                    input: $update_input,
                ) -> Result<CommandResponse<()>, String> {
                    if let Err(e) = input.validate_update() {
                        return Ok(CommandResponse::err(
                            concat!($i18n, ".errors.validation_failed"),
                            HashMap::from([("reason".to_string(), e)]),
                        ));
                    }
                    let (pool, key) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };

                    let mut fields: Vec<(String, Value)> = Vec::new();

                    // Campos no condicionales (vía función del usuario)
                    $build(&input, &mut fields);

                    // Campos condicionales (resolución + validación is_secret)
                    {
                        let cond_value = input.$cond_val;
                        let cond_is_secret = input.$cond_field;
                        if cond_value.is_some() || cond_is_secret.is_some() {
                            let cond_fields = db::resolve_conditional_fields(
                                &pool,
                                id,
                                <$entity as DbEntity>::table_name(),
                                stringify!($cond_val),
                                stringify!($cond_field),
                                cond_value,
                                cond_is_secret,
                            )
                            .await?;
                            fields.extend(cond_fields);
                        }
                    }

                    match db::update_fields::<$entity>(&pool, id, fields, &key).await {
                        Ok(true) => Ok(CommandResponse::ok_empty(concat!($i18n, ".success.updated"))),
                        Ok(false) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "update_failed", e)),
                    }
                }

                // ---- DELETE ----
                #[tauri::command]
                pub async fn [<crud_delete_ $fun>](
                    app: AppHandle,
                    id: i64,
                ) -> Result<CommandResponse<()>, String> {
                    let (pool, _) = match open_crypto_context(&app).await {
                        Ok(ctx) => ctx,
                        Err(e) => {
                            return Ok(CommandResponse::err(
                                concat!($i18n, ".errors.context_failed"),
                                HashMap::from([("reason".to_string(), e)]),
                            ))
                        }
                    };
                    match db::delete(&pool, <$entity as DbEntity>::table_name(), id).await {
                        Ok(true) => Ok(CommandResponse::ok_empty(concat!($i18n, ".success.deleted"))),
                        Ok(false) => Ok(CommandResponse::err(
                            concat!($i18n, ".errors.not_found"),
                            HashMap::from([("id".to_string(), id.to_string())]),
                        )),
                        Err(e) => Ok(db::error_to_response($i18n, "delete_failed", e)),
                    }
                }
            }

            pub use [<crud_ $name>]::*;
        }
    };
}
