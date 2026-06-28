/**
 * copy-drizzle-schema.ts
 *
 * Copia drizzle/schema.ts y drizzle/relations.ts (generados por
 * `drizzle-kit introspect`) a src/lib/, que es donde los importa el resto
 * de la app (src/lib/db.ts, los composables de src/composables/queries/...).
 *
 * Se ejecuta automáticamente al final de "dev:db:generate" (ver package.json),
 * o manualmente con: bun run dev:db:copy-schema
 *
 * Por qué un script y no `cp`/`copy` directo en package.json: los comandos
 * de copia de shell no son portables entre Windows (copy/xcopy) y
 * Linux/Mac (cp) — node:fs sí lo es, igual que en generate-i18n-schema.ts.
 *
 * NO EDITAR src/lib/schema.ts ni src/lib/relations.ts a mano: se
 * sobreescriben en cada ejecución de este script.
 */

import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const DRIZZLE_DIR = join(ROOT, 'drizzle')
const TARGET_DIR = join(ROOT, 'src/lib')

const FILES = ['schema.ts', 'relations.ts']

let copied = 0

for (const file of FILES) {
	const source = join(DRIZZLE_DIR, file)
	const target = join(TARGET_DIR, file)

	if (!existsSync(source)) {
		console.warn(`[drizzle] ⚠️  No se encontró "${source}". ¿Has ejecutado "bun run dev:db:introspect" antes?`)
		continue
	}

	copyFileSync(source, target)
	copied++
	console.log(`[drizzle] ✅ ${file} copiado a src/lib/`)
}

if (copied === 0) {
	console.error('[drizzle] ❌ No se copió ningún archivo. Revisa que drizzle/ contenga schema.ts y relations.ts.')
	process.exit(1)
}
