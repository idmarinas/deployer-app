import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const DRIZZLE_DIR = join(import.meta.dir, '..', 'drizzle', 'migrations')
const SQLX_DIR = join(import.meta.dir, '..', 'src-tauri', 'migrations')

function parseArgs() {
	const args = process.argv.slice(2)
	const idx = args.indexOf('--name')
	if (idx !== -1 && args[idx + 1]) return args[idx + 1]
	return undefined
}

async function generateAndFlatten() {
	const name = parseArgs()

	const cmd = name
		? `bunx drizzle-kit generate --name ${name}`
		: 'bunx drizzle-kit generate'

	console.log(`> ${cmd}`)
	execSync(cmd, { stdio: 'inherit', cwd: join(import.meta.dir, '..') })

	const dirs = await readdir(DRIZZLE_DIR, { withFileTypes: true })
	let count = 0

	for (const dir of dirs) {
		if (!dir.isDirectory()) continue

		const src = join(DRIZZLE_DIR, dir.name, 'migration.sql')
		const dest = join(SQLX_DIR, `${dir.name}.sql`)

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

generateAndFlatten()
