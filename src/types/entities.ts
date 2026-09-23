import { commands, hosts, passkeys } from '@/drizzle/schema'

export type Command = typeof commands.$inferSelect

export type Passkey = typeof passkeys.$inferSelect

export type Host = typeof hosts.$inferSelect
