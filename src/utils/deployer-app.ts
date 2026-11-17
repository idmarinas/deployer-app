import { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'

import { commands, hosts, passkeys, variables } from '@/drizzle/schema'

export enum ModulesName {
	Default = 'default',
	Hosts = 'hosts',
	Passkeys = 'passkeys',
	Commands = 'commands',
	Variables = 'variables',
}

export function getSqliteTableByModuleName(module: ModulesName): SQLiteTableWithColumns<any> | undefined {
	switch (module) {
		case ModulesName.Hosts:
			return hosts
		case ModulesName.Passkeys:
			return passkeys
		case ModulesName.Commands:
			return commands
		case ModulesName.Variables:
			return variables
		default:
			return undefined
	}
}
