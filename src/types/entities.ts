import { hosts, passkeys } from '@/lib/schema'

export type Passkey = typeof passkeys.$inferSelect

export type Host = typeof hosts.$inferSelect
