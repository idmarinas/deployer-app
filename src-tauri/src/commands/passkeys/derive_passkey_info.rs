use russh::keys::ssh_key::{Algorithm, HashAlg};
use russh::keys::PrivateKey;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::crypto;
use crate::response::CommandResponse;

use super::types::KeyType;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DerivePasskeyInfoInput {
    /// Contenido de la clave privada OpenSSH (texto plano).
    pub key_content: String,
    /// Passphrase para descifrar la clave si está protegida.
    pub passphrase: Option<String>,
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DerivePasskeyInfo {
    /// Fingerprint SHA-256 derivado de la clave (formato `SHA256:...`).
    pub fingerprint: Option<String>,
    /// Tipo real del algoritmo de la clave.
    pub key_type: Option<KeyType>,
}

// ---------------------------------------------------------------------------
// Comando Tauri
// ---------------------------------------------------------------------------

/// Valida una clave privada OpenSSH y deriva su fingerprint y tipo real.
///
/// - Si la clave está cifrada con passphrase, intenta descifrarla.
/// - Las passphrases ya cifradas (prefijo `ENC:`) se ignoran.
/// - Devuelve el fingerprint SHA-256 y el tipo de algoritmo real de la clave.
#[tauri::command]
pub async fn derive_passkey_info(
    input: DerivePasskeyInfoInput,
) -> Result<CommandResponse<DerivePasskeyInfo>, String> {
    // 1) Parsear la clave OpenSSH — valida que sea una clave válida
    let key = match PrivateKey::from_openssh(input.key_content.as_bytes()) {
        Ok(k) => k,
        Err(_) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.errors.invalid_key_content",
                crate::params!(),
            ));
        }
    };

    // 2) Filtrar passphrase: ignorar vacías y las que vienen cifradas (prefijo ENC:)
    let usable_passphrase = input
        .passphrase
        .filter(|p| !p.trim().is_empty() && !crypto::is_encrypted(p));

    // 3) Intenta descifrar si hay passphrase usable; manejar "already decrypted"
    let key = match usable_passphrase {
        Some(pp) => match key.decrypt(pp.as_bytes()) {
            Ok(k) => k,
            Err(e) if e.to_string().contains("already decrypted") => key,
            Err(_) => {
                return Ok(CommandResponse::err(
                    "tauri.passkeys.errors.invalid_passphrase",
                    crate::params!(),
                ));
            }
        },
        None => {
            if key.is_encrypted() {
                return Ok(CommandResponse::err(
                    "tauri.passkeys.errors.key_passphrase_required",
                    crate::params!(),
                ));
            }
            key
        }
    };

    // 4) Extraer tipo real del algoritmo
    let key_type = match key.algorithm() {
        Algorithm::Ed25519 => KeyType::Ed25519,
        Algorithm::Rsa { .. } => KeyType::Rsa,
        Algorithm::Ecdsa { .. } => KeyType::Ecdsa,
        _ => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.errors.unsupported_key_type",
                crate::params!(),
            ));
        }
    };

    // 5) Calcular fingerprint SHA-256
    let fingerprint = key.fingerprint(HashAlg::Sha256).to_string();

    Ok(CommandResponse::ok(
        DerivePasskeyInfo {
            fingerprint: Some(fingerprint),
            key_type: Some(key_type),
        },
        "tauri.passkeys.success.derived",
    ))
}
