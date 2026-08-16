# Plan: Simplificar `src/lib/docker-compose/files.ts` (solo lo exclusivo de compose)

## Estado

**Completado** (14 ago 2026)

---

## Instrucciones dadas (verbatim)

> Extraído de `AGENTS.todo.md` (tarea 1 de `### Tareas`):
>
> 1. src\lib\docker-compose\files.ts
>    1. Proposito de las funciones, entiendo que estas funciones al estar en el lib de docker-compose, es que solo sirven en docker-compose. Pero las únicas que las interpreto como que son exclusivas de docker compose son: isMainComposeFile y isSecondaryComposeFile
>    2. Hay que hacer las funciones un poco más simples, por lo que veo, se les pasa el filePath, para hacer ciertas comprobaciones, y en su mayoria solo es necesario el nombre del archivo, el cual está disponible en la fila del archivo.

---

## Resumen

`src/lib/docker-compose/files.ts` contiene 4 utilidades. Dos de ellas (`isComposeFile`, `isEnvFilePath`) son reconocedores de nombres de archivo genéricos y no tienen lógica propia de compose; se mueven a la librería genérica `src/lib/files.ts` y pasan a recibir el **nombre** del archivo (basename, ya disponible en `ManagedFile.name`) en vez del `file_path` completo. Las otras dos (`isMainComposeFile`, `isSecondaryComposeFile`) sí son exclusivas de compose porque codifican el concepto "archivo compose principal en la raíz del proyecto vs secundario en una subcarpeta", así que permanecen en la librería de compose.

## Propósito de cada función (análisis)

| Función | Propósito | ¿Exclusiva de compose? | ¿Qué necesita? |
| --- | --- | --- | --- |
| `isComposeFile(filePath)` | Reconoce nombres de archivo compose (`compose.yaml`, `compose.yml`, `docker-compose.yaml`, `docker-compose.yml`) sin importar la carpeta | No | Solo el **nombre** del archivo |
| `isEnvFilePath(filePath)` | Reconoce archivos `.env` (`.env`, `*.env`, `.env.*`) sin importar la carpeta | No | Solo el **nombre** del archivo |
| `isMainComposeFile(filePath)` | Indica que el archivo es compose **y está en la raíz** del proyecto (sin carpeta) | Sí | El `file_path` (para saber si está en la raíz) + el nombre |
| `isSecondaryComposeFile(filePath)` | Indica que el archivo es compose **y está en una subcarpeta** | Sí | El `file_path` (para saber la carpeta) + el nombre |

## Decisiones tomadas

| Decisión | Elección | Razón |
| --- | --- | --- |
| `isComposeFile` → genérico | `src/lib/files.ts`, recibe `name` | Es un reconocedor de nombre de archivo; sin lógica de compose. En la lib genérica ya existe el mapping de iconos de compose por nombre (`iconForName`). |
| `isEnvFilePath` → genérico | `src/lib/files.ts` como `isEnvFile`, recibe `name` | Igual que el anterior. Es útil para cualquier módulo con archivos `.env`. |
| `isMainComposeFile`/`isSecondaryComposeFile` | Se quedan en `src/lib/docker-compose/files.ts`, siguen recibiendo `file_path` | Codifican "compose principal en la raíz vs secundario en subcarpeta": necesitan saber si hay carpeta. La raíz del proyecto compose es la raíz de `file_path` (sin `/`). |
| Internamente reutilizan `isComposeFile` genérico | `isMainComposeFile`/`isSecondaryComposeFile` extraen el basename y delegan en `isComposeFile` | Una sola fuente de verdad para los nombres compose; sin duplicar la lista de nombres. |
| Callers pasan `name` donde aplica | `f.name`/`entry.name`/`item.label` (basename del nodo) | La fila del archivo ya tiene el nombre; no hace falta parsear la ruta. |

## Cambios concretos

### 1. `src/lib/files.ts` (nuevas funciones genéricas)

```ts
export function isComposeFile(name: string): boolean {
	const lower = name.toLowerCase()
	return (
		lower === 'compose.yaml' ||
		lower === 'compose.yml' ||
		lower === 'docker-compose.yaml' ||
		lower === 'docker-compose.yml'
	)
}

export function isEnvFile(name: string): boolean {
	const lower = name.toLowerCase()
	return lower === '.env' || lower.endsWith('.env') || lower.startsWith('.env')
}
```

- Misma lógica exacta que las actuales, pero asumiendo que el argumento es el **nombre** (basename), no la ruta.
- `isEnvFilePath` se renombra a `isEnvFile` (ya no recibe un "path").

### 2. `src/lib/docker-compose/files.ts` (solo lo exclusivo)

```ts
import { isComposeFile } from '@/lib/files'

export function isMainComposeFile(filePath: string): boolean {
	const name = filePath.split('/').filter(Boolean).pop() ?? ''
	return isComposeFile(name) && !filePath.includes('/')
}

export function isSecondaryComposeFile(filePath: string): boolean {
	const name = filePath.split('/').filter(Boolean).pop() ?? ''
	return isComposeFile(name) && filePath.includes('/')
}
```

- Se eliminan `isComposeFile` e `isEnvFilePath` (movidas al genérico).

### 3. Callers actualizados

| Archivo | Cambio |
| --- | --- |
| `src/components/form/inputs/docker-compose/ComposeTreeFilesUpload.vue` | Importa `isComposeFile`/`isEnvFile` de `@/lib/files`; `isMainComposeFile` de `@/lib/docker-compose/files`. `isComposeFile(entry.file_path)` → `isComposeFile(entry.name)`; `isEnvFilePath(entry.file_path)` → `isEnvFile(entry.name)`; en `#tree-badges`, `isComposeFile(item.key)` → `isComposeFile(item.label)` (basename del nodo). `isMainComposeFile` sigue recibiendo `file_path`/`key`. |
| `src/pages/dashboard/docker_composes/add.vue` | `isComposeFile as isComposeFilePath(f.file_path)` → `isComposeFile(f.name)` (import desde `@/lib/files`); se ajusta la anotación de tipo de la fila. |
| `src/pages/dashboard/docker_composes/index.vue` | Sin cambios (solo `isMainComposeFile(f.file_path)`). |
| `src/pages/dashboard/docker_composes/[id]/edit.vue` | Sin cambios (solo `isMainComposeFile(f.file_path)`). |

---

## Orden de implementación

| # | Paso | Archivos | Dependencias |
| --- | --- | --- | --- |
| 1 | Añadir `isComposeFile`/`isEnvFile` a la lib genérica | `src/lib/files.ts` | Ninguna |
| 2 | Reducir la lib de compose a main/secondary | `src/lib/docker-compose/files.ts` | #1 |
| 3 | Actualizar callers | `ComposeTreeFilesUpload.vue`, `add.vue` | #2 |
| 4 | Verificar | `bunx vue-tsc --noEmit`, `bun run build` | #3 |

## Notas

- No hay cambios de BD, Rust ni i18n.
- `_archived.dist/` se ignora (prohibido por AGENTS); sus referencias antiguas quedan como historial.
- `isSecondaryComposeFile` no tiene consumidores activos (los badges usan el ternario de `isMainComposeFile`), pero se conserva por ser la utilidad exclusiva de compose que pide el usuario.
