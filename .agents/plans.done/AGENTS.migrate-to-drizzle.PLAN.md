# Plan: Migración de lógica SQL de Rust a Drizzle — Opción D (Híbrido)

## Estado: Completado

---

## Instrucciones dadas

1. Trasladar la lógica de SQL (select, insert, update, delete) de Rust a Drizzle
2. Mantener el cifrado/descifrado en Rust (Opción D Híbrido)
3. Usar `encryptedText()` como marcador declarativo de campos cifrados
4. Cada tabla es una entidad en `src/lib/entities/`
5. Migraciones con Drizzle

---

## Arquitectura

```
Frontend (Drizzle) → SQL → Rust (cifra/descifra) → SQLite
                     ↑
            encryptedText() marca campos
```

---

## Archivos clave

| Archivo | Descripción |
| --- | --- |
| `src/lib/schema-types.ts` | `encryptedText()` |
| `src/lib/entities/*.ts` | Una entidad por tabla |
| `src/lib/schema.ts` | Barrel export |
| `src/lib/db.ts` | Proxy con detección automática |
| `src-tauri/src/commands/database/query_raw_with_encryption.rs` | Nuevo comando |

---

## Fases

1. Crear `src/lib/schema-types.ts` ✅
2. Crear `src/lib/entities/` con todas las tablas ✅
3. Implementar `query_raw_with_encryption.rs` ✅
4. Modificar `src/lib/db.ts` ✅
5. Migrar loaders y components de invoke a Drizzle (30+ archivos)
6. Eliminar CRUD genérico y macros
7. Testing

---

*Plan recreado: 2026-08-17*
