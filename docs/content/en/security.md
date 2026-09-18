---
title: Security Policy
description: How {{project_name}} protects your SSH credentials and how to report vulnerabilities
navigation: false
ogImage:
  props:
    icon: i-tabler-shield-check
---

::note
**:vars{n="project"}** is a local desktop application: your data stays on your machine and there are no intermediate servers. This page describes how your credentials are protected and how to report security issues.
::

## Credential encryption

The most sensitive SSH access data is stored **encrypted in the local SQLite database**. The SSH connection password of each host and the private key with its passphrase are susceptible to encryption.

Encryption uses **AES-256-GCM** with a random 12-byte nonce per operation. The flow works as follows:

1. The **frontend** always operates in plain text and is the **only writer** of the vault: it encrypts data on save and decrypts or masks it on read.
2. Encrypted values are persisted with the prefix `ENC:{version}:<base64>`.
3. The **Rust backend** opens the vault in **read-only mode** to decrypt credentials when establishing the SSH/SFTP connection.

## Stronghold Vault

- The vault (`vault.hold`) is stored in the application's local data directory, alongside the 32-byte *salt*.
- The **vault password** is randomly generated (64 hex characters) on the first run and persisted in the **operating system keychain** using the `keyring` crate.
- The vault key is derived with **Argon2** from the password and the *salt*.
- Encryption keys are **versioned** per field (`encrypt:{table}.{col}:{version}`): when a key is rotated, previous versions are preserved and data encrypted with older versions can be re-encrypted with the current version without data loss.

## Supported versions

Not all branches of this project are supported. To know which branches are supported and which are not, see the table below:

:list-branch-security

## Reporting a vulnerability

1) If the issue is caused by one of the project's dependencies ([Tauri](https://tauri.app), [russh](https://github.com/Eugeny/russh), [sqlx](https://github.com/launchbadge/sqlx), etc.), report it to the corresponding project first following their security guidelines.

2) If you find a vulnerability in **:vars{n="project"}**, report it **privately** using the tool GitHub provides in :vars{n="security_advisories_url" text="Security > Advisories"}.

3) Do not publish sensitive information about vulnerabilities on GitHub Issues until the issue has been fixed and a patch has been released.