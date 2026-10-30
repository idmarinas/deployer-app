import commandsList from '@/composables/deployer/seed_data/commands'
import { db } from '@/drizzle/drizzle'
import { commands } from '@/drizzle/schema'
import { i18n } from '@/i18n'
import { sql } from 'drizzle-orm'

export function useAppSeed() {
	const { t } = i18n.global

	async function commandsFn() {
		await db
			.insert(commands)
			.values(commandsList(t))
			.onConflictDoUpdate({
				target: commands.key,
				targetWhere: sql`custom = '0'`,
				set: {
					name: sql`excluded.name`,
					description: sql`excluded.description`,
					command: sql`excluded.command`,
					parser: sql`excluded.parser`,
					timeout: sql`excluded.timeout`,
					enabled: sql`excluded.enabled`,
					updated_at: sql`excluded.updated_at`,
				},
			})
	}

	async function execute() {
		await commandsFn()
	}

	return {
		execute,
	}
}
