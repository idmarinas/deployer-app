import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const DRIZZLE_MIGRATIONS = join(import.meta.dir, '..', 'migrations')
const SQLX_MIGRATIONS = join(import.meta.dir, '..', 'src-tauri', 'migrations')

async function flatten() {
	const dirs = await readdir(DRIZZLE_MIGRATIONS, { withFileTypes: true })
	let count = 0

	for (const dir of dirs) {
		if (!dir.isDirectory()) continue

		const src = join(DRIZZLE_MIGRATIONS, dir.name, 'migration.sql')
		const dest = join(SQLX_MIGRATIONS, `${dir.name}.sql`)

		try {
			const sql = await readFile(src, 'utf-8')
			await writeFile(dest, sql, 'utf-8')
			count++
			console.log(`✓ ${dir.name}.sql`)
		} catch {
			console.log(`· skip ${dir.name} (no migration.sql)`)
		}
	}

	console.log(`\nAplanadas ${count} migración(es) a src-tauri/migrations/.`)
}

flatten()
