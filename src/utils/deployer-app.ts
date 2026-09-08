import { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'

import { hosts, passkeys } from '@/drizzle/schema'

export enum ModulesName {
	Default = 'default',
	Hosts = 'hosts',
	Passkeys = 'passkeys',
}

export function getSqliteTableByModuleName(module: ModulesName): SQLiteTableWithColumns<any> | undefined {
	switch (module) {
		case ModulesName.Hosts:
			return hosts
		case ModulesName.Passkeys:
			return passkeys
		default:
			return undefined
	}
}
