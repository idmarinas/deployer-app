import { eq } from 'drizzle-orm'
import { deployer_settings } from '@/lib/schema'
import { db } from '@/lib/db'

export async function getDeployerSetting(key: string): Promise<string | null> {
	const row = await db.select({ value: deployer_settings.value })
		.from(deployer_settings)
		.where(eq(deployer_settings.key, key))
		.get()

	return row?.value ?? null
}

export async function setDeployerSetting(key: string, value: string): Promise<void> {
	await db.insert(deployer_settings)
		.values({ key, value })
		.onConflictDoUpdate({
			target: deployer_settings.key,
			set: { value },
		})
		.run()
}

export async function setDeployerSettings(settings: Record<string, string>): Promise<void> {
	for (const [key, value] of Object.entries(settings)) {
		await setDeployerSetting(key, value)
	}
}

export async function listDeployerSettings(): Promise<Record<string, string>> {
	const rows = await db.select({
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
	const result = await db.delete(deployer_settings)
		.where(eq(deployer_settings.key, key))
		.run()

	return (result as any).changes > 0
}
