use rand::rngs::SysRng;
use rand_core::UnwrapErr;
use russh::keys::ssh_key::{Algorithm, EcdsaCurve, HashAlg, LineEnding};
use russh::keys::PrivateKey;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use ts_rs::TS;

use crate::helpers::open_crypto_context;
use crate::commands::passkeys::types::KeyType;
use crate::response::CommandResponse;
use crate::crypto;

use crate::params;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct GeneratePasskeyInput {
    /// Tipo de clave a generar. Por defecto: Ed25519.
    pub key_type: Option<KeyType>,
    /// Passphrase para proteger la clave privada.
    /// `None` o cadena vacía = sin passphrase.
    pub passphrase: Option<String>,
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct GeneratedPasskey {
    /// Clave privada en formato OpenSSH (texto plano).
    /// El cifrado lo aplica `crud_create_passkey` al guardar en BD.
    pub key_content: String,
    /// Clave pública en formato OpenSSH (para añadir al servidor remoto).
    pub public_key: String,
    /// Fingerprint SHA-256 de la clave (formato `SHA256:...`).
    pub fingerprint: String,
    /// Tipo de clave generada.
    pub key_type: KeyType,
    /// Passphrase ya cifrada con AES-256-GCM, lista para pasar directamente
    /// a `crud_create_passkey`. `None` si no se solicitó passphrase.
    pub passphrase: Option<String>,
}

// ---------------------------------------------------------------------------
// Comando Tauri
// ---------------------------------------------------------------------------

/// Genera un par de claves SSH (privada + pública) en el backend.
///
/// - La clave privada se devuelve en **texto plano** para que el frontend la
///   pase a `crud_create_passkey`, que se encarga de cifrarla.
/// - Si se proporcionó `passphrase`, esta se devuelve **ya cifrada** con
///   AES-256-GCM (prefijo `ENC:`), lista para pasar directamente al CRUD
///   sin que el frontend la vea en texto plano de vuelta.
/// - No guarda nada en la base de datos.
#[tauri::command]
pub async fn generate_passkey(
    app: AppHandle,
    input: GeneratePasskeyInput,
) -> Result<CommandResponse<GeneratedPasskey>, String> {
    // 1. Obtener la clave maestra (necesaria para pre-cifrar la passphrase)
    let (_pool, master_key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.errors.context_failed",
                params!("reason" => e),
            ));
        }
    };

    // 2. Determinar el tipo de clave (Ed25519 por defecto)
    let key_type = input.key_type.unwrap_or(KeyType::Ed25519);

    // 3. Generar la clave privada
    let private_key = match generate_private_key(&key_type) {
        Ok(k) => k,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.errors.generation_failed",
                params!("reason" => e),
            ));
        }
    };

    // 4. Serializar la clave privada a formato OpenSSH
    let key_content = match private_key.to_openssh(LineEnding::LF) {
        Ok(s) => s.to_string(),
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.errors.serialization_failed",
                params!("reason" => e.to_string()),
            ));
        }
    };

    // 5. Obtener la clave pública en formato OpenSSH (para authorized_keys)
    let public_key_str = match private_key.public_key().to_openssh() {
        Ok(s) => s,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.errors.serialization_failed",
                params!("reason" => e.to_string()),
            ));
        }
    };

    // 6. Calcular el fingerprint SHA-256
    let fingerprint = private_key.fingerprint(HashAlg::Sha256).to_string();

    // 7. Pre-cifrar la passphrase si se proporcionó y no está vacía
    let passphrase_encrypted = match input.passphrase {
        Some(ref pp) if !pp.trim().is_empty() => match crypto::encrypt(pp, &master_key) {
            Ok(enc) => Some(enc),
            Err(e) => {
                return Ok(CommandResponse::err(
                    "tauri.passkeys.errors.encryption_failed",
                    params!("reason" => e.to_string()),
                ));
            }
        },
        _ => None,
    };

    Ok(CommandResponse::ok(
        GeneratedPasskey {
            key_content,
            public_key: public_key_str,
            fingerprint,
            key_type,
            passphrase: passphrase_encrypted,
        },
        "tauri.passkeys.success.generated",
    ))
}

// ---------------------------------------------------------------------------
// Funciones auxiliares
// ---------------------------------------------------------------------------

/// Genera una `PrivateKey` del tipo solicitado.
/// Usa `rand_core 0.10` (misma versión que `russh 0.61` internamente) para
/// satisfacer el bound `CryptoRng` de `PrivateKey::random`.
fn generate_private_key(key_type: &KeyType) -> Result<PrivateKey, String> {
    let mut rng = UnwrapErr(SysRng);

    match key_type {
        KeyType::Ed25519 => PrivateKey::random(&mut rng, Algorithm::Ed25519)
            .map_err(|e| format!("Error generando clave Ed25519: {}", e)),

        KeyType::Rsa => PrivateKey::random(&mut rng, Algorithm::Rsa { hash: None })
            .map_err(|e| format!("Error generando clave RSA-4096: {}", e)),

        KeyType::Ecdsa => PrivateKey::random(
            &mut rng,
            Algorithm::Ecdsa {
                curve: EcdsaCurve::NistP256,
            },
        )
        .map_err(|e| format!("Error generando clave ECDSA P-256: {}", e)),
    }
}