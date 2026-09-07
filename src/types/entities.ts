import { hosts, passkeys } from '@/drizzle/schema'

export type Passkey = typeof passkeys.$inferSelect

export type Host = typeof hosts.$inferSelect
