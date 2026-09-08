import { db } from '@/drizzle/drizzle'
import { settings } from '@/drizzle/schema'
import { eq, sql } from 'drizzle-orm'

export async function getAppSetting(key: string, _default: string | null = null): Promise<string | null> {
	const row = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).get()

	return row?.value ?? _default
}

export async function setAppSetting(key: string, value: string): Promise<void> {
	await db
		.insert(settings)
		.values({ key, value })
		.onConflictDoUpdate({
			target: settings.key,
			set: { value: sql.raw(`excluded.${settings.value.name}`) },
		})
		.run()
}

export async function setAppSettings(values: { key: string; value: string }[]): Promise<void> {
	await db
		.insert(settings)
		.values(values)
		.onConflictDoUpdate({
			target: settings.key,
			set: { value: sql.raw(`excluded.${settings.value.name}`) },
		})
}

export async function listAppSettings(): Promise<Record<string, string>> {
	const rows = await db
		.select({
			key: settings.key,
			value: settings.value,
		})
		.from(settings)
		.all()

	const result: Record<string, string> = {}
	for (const row of rows) {
		if (row.value !== null) {
			result[row.key] = row.value
		}
	}
	return result
}

export async function deleteAppSetting(key: string): Promise<boolean> {
	const result = await db.delete(settings).where(eq(settings.key, key)).run()

	return (result as any).changes > 0
}
