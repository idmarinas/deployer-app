# Plan: Revisión del plan Stronghold (¿completable?)

## Estado

**Completado** — revisión terminada y confirmada por el usuario; discrepancias documentadas en `AGENTS.md`, `AGENTS.frontend.md` y `AGENTS.backend.md` (reestructuración `src/lib/*` → `src/drizzle/*` y rotación/escaneo en JS, no comandos Rust). Plan archivado en `.agents/plans.done/`.

---

## Instrucciones dadas (verbatim)

> Extraído de `AGENTS.todo.md` (tarea 2 de `### Tareas`):
>
> 2. Revisa el plan marcado como *Ejecutando* ¿Se puede marcar como completado?

---

## Objetivo

Revisar el plan `AGENTS.stronghold-crypto.PLAN.md` (estado **Ejecutando**: "Fases 1-7 y 9 implementadas; falta verificación funcional Fase 8") contrastando lo declarado en el plan con el estado **real** del código, y determinar si está en condiciones de marcarse como **completado**.

**Importante (regla AGENTS.todo.md §5):** el agente **no** puede dar por completado un plan. Solo el usuario lo hace cuando está implementado y verificado. Por tanto, este plan produce un **informe de verificación** con conclusión (puede/no puede completarse, y qué falta) para que el usuario decida.

## Alcance de la revisión

### Fases declaradas en el plan vs código real

| Fase | Declaración del plan | Qué revisar en el código |
|---|---|---|
| 1 — Configuración | Plugin registrado en `lib.rs` con Argon2 | `src-tauri/src/lib.rs:45-53` (registro en `setup()` con `Builder::with_argon2(&salt_path)`) |
| 2 — Módulo Rust | `crypto/stronghold.rs`: `StrongholdVault::open`, `get_key_for_version`, `decrypt_value`, password del vault en keychain, comandos `get_vault_password`/`get_vault_path` | `src-tauri/src/crypto/stronghold.rs` y `src-tauri/src/commands/stronghold.rs` |
| 3 — Módulo JS | `stronghold-crypto.ts` con claves versionadas, `encrypt`/`decrypt`/`rotateKey` | **Nota:** el plan indica `src/lib/stronghold-crypto.ts`, el real es `src/drizzle/lib/stronghold.ts` y el proxy `src/drizzle/drizzle.ts` (la reestructuración movió `lib/` → `drizzle/lib/`). Verificar funciones equivalentes. |
| 4 — Proxy Drizzle | `db.ts` cifra/descifra; `query_raw.rs` simplificado | `src/drizzle/drizzle.ts` (proxy) y `src-tauri/src/commands/database/query_raw.rs` (solo SQL, sin cripto) |
| 5 — SSH/export_public_key | `decrypt_host_credentials` usa `StrongholdVault` | `src-tauri/src/ssh/session.rs`, `src-tauri/src/ssh/connect.rs`, `src-tauri/src/commands/passkeys/export_public_key.rs` |
| 6 — Rotación | Comando `rotate_encryption_key` + UI | **Nota:** el plan dice comando Rust; el real parece gestionarse en JS vía `rotateKey` + `request mort`. Verificar si existe comando o solo JS. |
| 7 — Limpieza | `cipher.rs` reducido, `keyring.rs` eliminado, `helpers.rs` sin `open_crypto_context` | `src-tauri/src/crypto/cipher.rs`, ausencia de `keyring.rs`, `src-tauri/src/helpers.rs` |
| 8 — Verificación funcional | End-to-end (crear host → cifrado, SSH, listas, rotación, persistencia) | **Pendiente según el plan** — es la revisión funcional que este plan debe ejecutar |
| 9 — Claves versionadas + panel seguridad | `TabSecurity.vue`, `ENCRYPTED_FIELDS`, `scanAndReencrypt`, rotación no destructiva | `src/components/pages/app/tabs/TabSecurity.vue`, `src/drizzle/lib/stronghold.ts` |

### Discrepancias a anotar (ya detectadas en el reconocimiento previo)

1. **Ruta del módulo JS:** el plan dice `src/lib/stronghold-crypto.ts`; el archivo real es `src/drizzle/lib/stronghold.ts`. Actualizar el plan o documentarlo.
2. **Comando de rotación:** el plan (Fase 6) menciona comando Rust `rotate_encryption_key`; `lib.rs` NO lo registra y `commands/stronghold.rs` solo tiene `get_vault_password`/`get_vault_path`. La rotación se ejecuta en JS (`rotateKey` en `stronghold.ts` vía plugin de Stronghold) — correcto según el principio "el frontend es el único escritor del vault". Verificar que realmente es así y corregir el plan.
3. **`scan_and_reencrypt`:** el plan (Fase 9) dice comando Rust `commands/stronghold.rs`; el real parece ser JS (`scanAndReencrypt` en `stronghold.ts`). Verificar y anotar.
4. **Estructura `src/drizzle/`:** el plan y `AGENTS.md` referencian `src/lib/*`; la estructura real usa `src/drizzle/*`. Revisar si hay que actualizar `AGENTS.md`/`AGENTS.backend.md`/`AGENTS.frontend.md` (regla 6 del todo).

### Verificaciones de compilación

- `cargo check` en `src-tauri/` (sin errores).
- `vue-tsc --noEmit` / `bun run build` (sin errores TS).

### Verificación funcional (Fase 8, pendiente)

A ejecutar en este plan (o delegada al usuario si requiere entorno manual):
1. Crear host con password → comprobar `ENC:{v}:...` en SQLite y que la lista lo enmascara (`BLANK_VALUE`).
2. Con `withDecryption(true)` → texto plano.
3. Conexión SSH → descifrado vía Rust (`StrongholdVault::decrypt_value`).
4. Passkey con `key_content`/`passphrase`.
5. Rotar clave desde `TabSecurity.vue` → nueva versión, re-cifrado, purga.
6. Reiniciar app → vault persiste.

## Entregable

Informe en el propio plan (sección «Resultado de la revisión») con:
- Tabla fase por fase: ✅ implementado / ❌ incompleto / ⚠️ discrepa con el plan.
- Conclusión: **sí / no / con matices** se puede marcar como completado.
- Discrepancias del plan corregidas.
- Actualización de `AGENTS.todo.md`/`AGENTS.*.md` si procede.

**El cambio de estado (Ejecutando → Completado) lo hace SIEMPRE el usuario.**

## Resultado de la revisión

Contraste entre las fases de `AGENTS.stronghold-crypto.PLAN.md` y el código real:

| Fase | Verificación |
|---|---|
| 1 — Configuración | ✅ Plugin registrado en `src-tauri/src/lib.rs` (`setup()`, `Builder::with_argon2(&salt_path)`); `Cargo.toml` con `rust-argon2`/`iota-stronghold` |
| 2 — Módulo Rust | ✅ `StrongholdVault::open`, `get_or_create_vault_password`; comandos `get_vault_password`/`get_vault_path` en `commands/stronghold.rs` |
| 3 — Módulo JS | ✅ `src/drizzle/lib/stronghold.ts` (el plan decía `src/lib/stronghold-crypto.ts`) |
| 4 — Proxy Drizzle | ✅ `src/drizzle/drizzle.ts` (el plan decía `src/lib/db.ts`); `query_raw.rs` solo ejecuta SQL, sin cripto |
| 5 — SSH / export_public_key | ✅ `ssh/session.rs`, `ssh/connect.rs`, `export_public_key.rs` usan `StrongholdVault` |
| 6 — Rotación | ⚠️ **Discrepancia corregida:** el plan indica comando Rust `rotate_encryption_key`; **no existe** en `lib.rs`. La rotación es **JS** (`rotateKey` en `src/drizzle/lib/stronghold.ts`) — coherente con "el frontend es el único escritor del vault" |
| 7 — Limpieza | ✅ `cipher.rs` reducido a `is_encrypted`; sin `keyring.rs`; sin `open_crypto_context`/`get_master_key` |
| 8 — Verificación funcional | Delegada al usuario |
| 9 — Claves versionadas + panel seguridad | ⚠️ **Discrepancia corregida:** `scan_and_reencrypt` también era comando Rust según el plan; el real es **JS** (`scanAndReencrypt`/`reencryptScope` en `stronghold.ts`). UI en `TabSecurity.vue` |

**Conclusión:** el plan `AGENTS.stronghold-crypto.PLAN.md` es **completable**. Las discrepancias eran de **rutas** (`src/lib/*` → `src/drizzle/*`) y de **quién ejecuta** la rotación/escaneo (JS y no comandos Rust). Actualizada la documentación en `AGENTS.md`, `AGENTS.frontend.md` y `AGENTS.backend.md` (todas las referencias `src/lib/*`/`@/lib/*` → `src/drizzle/*`/`@/drizzle/*`).

## Pasos

1. Leer el plan completo `AGENTS.stronghold-crypto.PLAN.md`.
2. Contrastar fases 1-7 y 9 con el código real (listado en el alcance).
3. Ejecutar `cargo check` (src-tauri) y `bun run build`.
4. Verificación funcional Fase 8 (manual o asistida).
5. Escribir el informe y la conclusión en el plan.
6. Actualizar el plan/docus con las discrepancias detectadas.
7. Informar al usuario para que decida el cambio de estado.