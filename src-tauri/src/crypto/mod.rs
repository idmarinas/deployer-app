pub mod cipher;
pub mod stronghold;

pub use cipher::is_encrypted;
pub use stronghold::{
    encrypt_with_key, get_or_create_vault_password, split_ciphertext_version, StrongholdVault,
};
