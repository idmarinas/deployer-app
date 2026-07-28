use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::deployer_settings::helpers::open_pool;
use crate::response::CommandResponse;

/// Inserta o actualiza (upsert) uno o varios pares clave-valor en una única
/// transacción. Pensado para sustituir las llamadas sueltas a
/// `set_deployer_setting` cuando hay que guardar varios ajustes a la vez
/// (p. ej. un formulario de configuración completo).
///
/// Si `settings` está vacío, no hace nada y responde OK.
/// Si cualquier upsert falla, se hace ROLLBACK de toda la operación.
#[tauri::command]
pub async fn set_deployer_settings(
    app: AppHandle,
    settings: HashMap<String, String>,
) -> Result<CommandResponse<()>, String> {
    if settings.is_empty() {
        return Ok(CommandResponse::ok_empty("deployer_settings.success.saved"));
    }

    let (pool, _) = match open_pool(&app).await {
        Ok(p) => p,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployer_settings.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployer_settings.errors.save_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    for (key, value) in settings.iter() {
        let result = sqlx::query(
            "INSERT INTO deployer_settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        )
        .bind(key)
        .bind(value)
        .execute(&mut *tx)
        .await;

        if let Err(e) = result {
            // Si falla un upsert, no dejamos la BD en un estado a medias.
            let _ = tx.rollback().await;
            return Ok(CommandResponse::err(
                "deployer_settings.errors.save_failed",
                HashMap::from([
                    ("reason".to_string(), e.to_string()),
                    ("key".to_string(), key.clone()),
                ]),
            ));
        }
    }

    match tx.commit().await {
        Ok(_) => Ok(CommandResponse::ok_empty("deployer_settings.success.saved")),
        Err(e) => Ok(CommandResponse::err(
            "deployer_settings.errors.save_failed",
            HashMap::from([("reason".to_string(), e.to_string())]),
        )),
    }
}
