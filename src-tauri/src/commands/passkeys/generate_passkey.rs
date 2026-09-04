use rand::rngs::SysRng;
use rand_core::UnwrapErr;
use russh::keys::ssh_key::{Algorithm, EcdsaCurve, HashAlg, LineEnding};
use russh::keys::PrivateKey;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use ts_rs::TS;

use crate::commands::passkeys::types::KeyType;
use crate::response::CommandResponse;

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
    /// Passphrase en texto plano. El INSERT vía `encrypt_mask` del proxy
    /// Drizzle cifra al persistir en BD. `None` si no se solicitó passphrase.
    pub passphrase: Option<String>,
}

// ---------------------------------------------------------------------------
// Comando Tauri
// ---------------------------------------------------------------------------

/// Genera un par de claves SSH (privada + pública) en el backend.
///
/// - La clave privada se devuelve en **texto plano** para que el frontend la
///   pase a `crud_create_passkey`, que se encarga de cifrarla.
/// - Si se proporcionó `passphrase`, esta se devuelve **en texto plano**;
///   el INSERT vía `encrypt_mask` (schema la marca como `encryptedText`)
///   cifra al persistir.
/// - No guarda nada en la base de datos.
#[tauri::command]
pub async fn generate_passkey(
    _app: AppHandle,
    input: GeneratePasskeyInput,
) -> Result<CommandResponse<GeneratedPasskey>, String> {
    // 1. Determinar el tipo de clave (Ed25519 por defecto)
    let key_type = input.key_type.unwrap_or(KeyType::Ed25519);

    // 2. Generar la clave privada
    let private_key = match generate_private_key(&key_type) {
        Ok(k) => k,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.errors.generation_failed",
                params!("reason" => e),
            ));
        }
    };

    // 3. Serializar la clave privada a formato OpenSSH
    let key_content = match private_key.to_openssh(LineEnding::LF) {
        Ok(s) => s.to_string(),
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.errors.serialization_failed",
                params!("reason" => e.to_string()),
            ));
        }
    };

    // 4. Obtener la clave pública en formato OpenSSH (para authorized_keys)
    let public_key_str = match private_key.public_key().to_openssh() {
        Ok(s) => s,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.errors.serialization_failed",
                params!("reason" => e.to_string()),
            ));
        }
    };

    // 5. Calcular el fingerprint SHA-256
    let fingerprint = private_key.fingerprint(HashAlg::Sha256).to_string();

    // 6. Extraer passphrase en claro (el cifrado lo hace encrypt_mask en DB)
    let passphrase = match input.passphrase {
        Some(ref pp) if !pp.trim().is_empty() => Some(pp.trim().to_string()),
        _ => None,
    };

    Ok(CommandResponse::ok(
        GeneratedPasskey {
            key_content,
            public_key: public_key_str,
            fingerprint,
            key_type,
            passphrase,
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
