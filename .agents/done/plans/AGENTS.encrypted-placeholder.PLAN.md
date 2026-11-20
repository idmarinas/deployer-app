# PLAN · Placeholder para valores cifrados (`BLANK_VALUE`)

> Estado: **completado**. Ejecutado y verificado (`cargo check` 0 warnings, `bun run build` OK).
> Última actualización: 2026-08-25

## 1. Problema y diagnóstico

- `cargo check`: único warning → `constant BLANK_VALUE is never used`
  (`src-tauri/src/crypto/mod.rs:10`). Es el centinela del sistema antiguo que
  sustituía `ENC:<ciphertext>` antes de enviar datos al frontend.
- Estado actual:
  - Backend: `query_raw` devuelve el valor crudo de SQLite (`ENC:...`) salvo que
    se pase `decrypt_fields`.
  - Frontend: `DEFAULT_DECRYPT = false` y `withDecryption()` sin usos
    (`src/lib/db.ts`) → el frontend siempre recibe ciphertext real y lo enmascara
    en UI vía `isEncryptedValue()` (`src/utils/crypto.ts`). El string `ENC:...`
    llega incluso a ser el valor literal del input de contraseña.
      - Nota Iván: aunque `DEFAULT_DECRYPT = false` y `withDecryption()` no tenga usos ahora mismo, en un futuro si los tendrá.
- Objetivo: restaurar el placeholder (el frontend nunca ve `ENC:`), replicando el
  comportamiento del antiguo `crud.rs` pero adaptado al proxy Drizzle.

## 2. Decisiones de diseño (acordadas)

1. **Guardar sin tocar un campo secreto = ignorar la columna**, no restaurarla en
   backend. `query_raw` recibe SQL ya montado por Drizzle; preservar desde Rust
   exigiría read-modify-write genérico (complejo y frágil).
2. **El strip se hace centralizado en `db.ts` reescribiendo el SQL**, no en cada
   composable. Reutiliza el parseo de columnas cifradas que ya hace
   `buildEncryptMask`. Cualquier `.set()`/`.values()` futuro queda protegido solo.
   Drizzle omite columnas si las quitamos del SQL + params.
3. **Sin param `decrypt_enabled`**: dos listas opcionales excluyentes.
   - `_decryptEnabled == false` (hoy siempre) → `mask_fields` → Rust sustituye
     `ENC:` por `BLANK_VALUE` (no necesita master key, basta pool).
   - `_decryptEnabled == true` (futuro, vía `withDecryption`) → `decrypt_fields`
     (rama Rust actual, sin cambios).
4. **Regla única de strip (sin excepciones)**: en UPDATE e INSERT se elimina toda
   asignación a columna cifrada cuyo valor sea `BLANK_VALUE` o empiece por `ENC:`.
5. **`generate_passkey` deja de pre-cifrar la passphrase**: la devuelve en claro;
   el INSERT vía `encrypt_mask` (schema ya la marca como `encryptedText`) cifra al
   persistir. Consistente con `key_content`, que ya hoy se devuelve claro. Con esto
   ya no existe caso legítimo de persistir `ENC:` desde el frontend.
6. **Backend sin comprobaciones nuevas**: el guard existente `skip ENC:` del bucle
   de cifrado de escrituras se conserva tal cual (red de seguridad pasiva, código
   ya presente).
7. Componentes UI sin cambios: `isEncryptedValue()` ya contempla el centinela.

## 3. Cambios por archivo

### Backend (Rust)

| Archivo | Cambio |
| --- | --- |
| `src-tauri/src/crypto/mod.rs` | Borrar `is_blank_value` (quedaría muerta). Mantener `BLANK_VALUE`; actualizar doc comment (ahora sirve para enmascarar lecturas). |
| `src-tauri/src/commands/database/query_raw.rs` | Nuevo param opcional `mask_fields: Option<Vec<String>>`. Si `is_read && !mask_fields.is_empty()`: abrir solo pool (sin crypto context) y sustituir valores con prefijo `ENC:` por `BLANK_VALUE` en las columnas listadas. Rama `decrypt_fields` y escrituras intactas. |
| `src-tauri/src/commands/passkeys/generate_passkey.rs` | Eliminar el cifrado de la passphrase antes de la respuesta (~L119-130); devolver texto plano. Actualizar doc comments (~L44, L55-62). |

Sin tocar: `derive_passkey_info.rs`, `export_public_key.rs` (descifran desde BD,
patrón interno intacto), locales i18n (ya no hace falta clave de error).

### Frontend (TS)

| Archivo | Cambio |
| --- | --- |
| `src/lib/db.ts` | Factorizar el parseo de columnas cifradas de `buildEncryptMask` en helper compartido. Nuevo `stripEncryptedValues(sql, params, encryptedFields)` aplicado a escrituras antes del `invoke`: quita asignaciones `"col" = ?` cuyo valor sea centinela o `ENC:*` y reindexa params (cuidado con comas y primer parámetro). Lecturas: enviar `maskFields: [...encrypt, ...conditionalEncrypt]` cuando `_decryptEnabled == false`; `decryptFields` solo cuando esté activado (incluir también condicionales). JSDoc de `withDecryption` actualizada (`false` → placeholder, `true` → plano). |

Sin cambios: componentes (`ValueViewer.vue`, `PasswordInput.vue`,
`PasskeyForm.vue`, tablas hosts/passkeys — usan `isEncryptedValue`),
`add.vue` / `GeneratePasskeyDialog.vue` (verificar abajo).

## 4. Riesgos / verificaciones durante la ejecución

- Grep de consumidores de `generate_passkey().passphrase` que dependan de recibir
  `ENC:`; verificar si el diálogo muestra la passphrase (con texto claro ahora
  puede mostrarse/copiarse realmente).
- Confirmar que NO existe flujo de clonado/duplicado de filas que haga INSERT con
  valores leídos de BD (rompería con el strip uniforme).
- Parseo del strip: Drizzle sqlite cita identificadores con `"`; manejar caso de
  primera columna vs intermedia en el SET / lista de columnas INSERT.
- `conditionalEncrypt` pasa a incluirse también en `decrypt_fields` (hoy solo va
  `.encrypt`): comportamiento correcto porque esas columnas están `ENC:` en BD.

## 5. Docs a actualizar

- `AGENTS.backend.md` §4 (Sistema de Cifrado Transparente): nuevo contrato —
  lecturas enmascaradas vía `mask_fields`, `BLANK_VALUE` como centinela,
  strip responsable en `db.ts`, guard `skip ENC:` como red pasiva,
  `generate_passkey` devuelve passphrase en claro.
- `AGENTS.frontend.md` (~L271-273, ~L470): eliminar referencias a `crud_get_*` /
  descifrado-en-lectura del modelo antiguo; describir flujo actual
  (Drizzle + mask_fields + placeholder en UI).

## 6. Verificación final

1. `cargo check` → 0 warnings (usa `BLANK_VALUE`; `is_blank_value` eliminada).
2. `bun run build` (vue-tsc + vite) OK.
3. Revisión manual: editar host/passkey sin tocar campo secreto → guardar → el
   valor en BD no cambia; tablas muestran máscara, nunca `ENC:`; generar passkey
   nueva → passphrase persiste cifrada y SSH funciona.
