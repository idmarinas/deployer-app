import { commands, hosts, passkeys, variables } from '@/drizzle/schema'

export type Command = typeof commands.$inferSelect

export type Passkey = typeof passkeys.$inferSelect

export type Host = typeof hosts.$inferSelect

export type Variable = typeof variables.$inferSelect

/** Paquete con una actualización disponible, detectado en el host remoto. */
export type HostPackage = {
	name: string
	current_version: string
	/** Revisión de empaquetado de la versión actual (ej: "1" en "29.9.2-1"). */
	current_revision: string | null
	available_version: string
	/** Revisión de empaquetado de la versión disponible. */
	available_revision: string | null
	/** Repositorio de origen (ej: "jammy-updates", "jammy-security"). */
	repo: string
	/** Tipo de actualización: "major", "minor", "patch", "packaging" o "unknown". */
	update_type: string
	/** True si el paquete proviene de un repositorio de seguridad. */
	is_security: boolean
	/** Prioridad: "high", "medium" o "low". */
	priority: string
}

/** Resumen de las actualizaciones disponibles en un host. */
export type HostUpdatesSummary = {
	total: number
	security: number
	major: number
	minor: number
	patch: number
	packaging: number
}

/** JSON almacenado en `deployer_hosts.server_updates`. */
export type HostServerUpdates = {
	packages: HostPackage[]
	summary: HostUpdatesSummary
	last_checked_at: string | null
}

/** Métricas dinámicas del servidor almacenadas como JSON en `status_info`. */
export type HostStatusMetrics = {
	/** Porcentaje de uso CPU (ej: "23.45"). */
	cpu_usage: string
	/** Porcentaje de uso RAM (ej: "67.89"). */
	ram_usage: string
	/** Porcentaje de uso disco (ej: "45.12"). */
	disk_usage: string
	/** Timestamp ISO 8601 de cuándo se capturaron estas métricas. */
	last_checked_at: string | null
}
