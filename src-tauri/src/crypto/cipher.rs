use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::{rngs::SysRng, TryRng};

use super::keyring::ENCRYPTED_PREFIX;

/// Cifra un valor de texto plano con AES-256-GCM.
///
/// Formato resultado: `ENC:<base64(nonce_12_bytes + ciphertext)>`
/// El nonce se antepone al ciphertext para recuperarlo al descifrar.
pub fn encrypt(plaintext: &str, key: &[u8]) -> Result<String, String> {
    if plaintext.starts_with(ENCRYPTED_PREFIX) {
        return Ok(plaintext.to_string());
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Error al inicializar el cifrado: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    SysRng
        .try_fill_bytes(&mut nonce_bytes)
        .map_err(|e| format!("Error al generar nonce: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Error al cifrar: {}", e))?;

    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);

    Ok(format!("{}{}", ENCRYPTED_PREFIX, BASE64.encode(&combined)))
}

/// Descifra un valor cifrado con AES-256-GCM.
///
/// Si el valor no tiene el prefijo `ENC:`, se devuelve tal cual.
pub fn decrypt(ciphertext: &str, key: &[u8]) -> Result<String, String> {
    if !ciphertext.starts_with(ENCRYPTED_PREFIX) {
        return Ok(ciphertext.to_string());
    }

    let encoded = &ciphertext[ENCRYPTED_PREFIX.len()..];
    let combined = BASE64
        .decode(encoded)
        .map_err(|e| format!("Error al decodificar base64: {}", e))?;

    if combined.len() < 12 {
        return Err("Datos cifrados corruptos: longitud insuficiente".to_string());
    }

    let (nonce_bytes, encrypted_data) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Error al inicializar el cifrado: {}", e))?;

    let plaintext_bytes = cipher
        .decrypt(nonce, encrypted_data)
        .map_err(|_| "Error al descifrar: clave incorrecta o datos corruptos".to_string())?;

    String::from_utf8(plaintext_bytes)
        .map_err(|e| format!("Error al decodificar texto descifrado: {}", e))
}

/// Indica si un valor ya está cifrado.
pub fn is_encrypted(value: &str) -> bool {
    value.starts_with(ENCRYPTED_PREFIX)
}
