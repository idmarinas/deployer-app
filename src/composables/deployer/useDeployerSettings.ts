import { db } from '@/lib/db'
import { settings as deployer_settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function getDeployerSetting(key: string, _default: string | null = null): Promise<string | null> {
	const row = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).get()

	return row?.value ?? _default
}

export async function setDeployerSetting(key: string, value: string): Promise<void> {
	await db
		.insert(settings)
		.values({ key, value })
		.onConflictDoUpdate({
			target: settings.key,
			set: { value: sql.raw(`excluded.${settings.value.name}`) },
		})
		.run()
}

export async function setDeployerSettings(values: { key: string; value: string }[]): Promise<void> {
	await db
		.insert(settings)
		.values(values)
		.onConflictDoUpdate({
			target: settings.key,
			set: { value: sql.raw(`excluded.${settings.value.name}`) },
		})
}

export async function listDeployerSettings(): Promise<Record<string, string>> {
	const rows = await db
		.select({
			key: deployer_settings.key,
			value: deployer_settings.value,
		})
		.from(deployer_settings)
		.all()

	const result: Record<string, string> = {}
	for (const row of rows) {
		if (row.value !== null) {
			result[row.key] = row.value
		}
	}
	return result
}

export async function deleteDeployerSetting(key: string): Promise<boolean> {
	const result = await db.delete(deployer_settings).where(eq(deployer_settings.key, key)).run()

	return (result as any).changes > 0
}
