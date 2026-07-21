import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

import type { ComposeDeploy, ComposeFile, ComposeService } from './types'

function normalizeEnvironment(
	env: Record<string, string> | string[] | undefined,
): Record<string, string> | undefined {
	if (!env) return undefined
	if (Array.isArray(env)) {
		const result: Record<string, string> = {}
		for (const item of env) {
			const idx = item.indexOf('=')
			if (idx > 0) {
				result[item.slice(0, idx)] = item.slice(idx + 1)
			}
		}
		return result
	}
	return env
}

function normalizeLabels(
	labels: Record<string, string> | string[] | undefined,
): Record<string, string> | undefined {
	return normalizeEnvironment(labels)
}

function normalizeService(raw: Record<string, unknown>): ComposeService {
	const service: ComposeService = {}

	if (typeof raw.image === 'string') service.image = raw.image
	if (typeof raw.container_name === 'string') service.container_name = raw.container_name
	if (typeof raw.restart === 'string') service.restart = raw.restart as ComposeService['restart']
	if (typeof raw.stop_grace_period === 'string') service.stop_grace_period = raw.stop_grace_period
	if (typeof raw.hostname === 'string') service.hostname = raw.hostname
	if (typeof raw.domainname === 'string') service.domainname = raw.domainname
	if (typeof raw.tty === 'boolean') service.tty = raw.tty
	if (typeof raw.privileged === 'boolean') service.privileged = raw.privileged

	if (Array.isArray(raw.ports)) service.ports = raw.ports.filter((p): p is string => typeof p === 'string')
	if (Array.isArray(raw.volumes)) service.volumes = raw.volumes.filter((v): v is string => typeof v === 'string')
	if (Array.isArray(raw.networks)) service.networks = raw.networks.filter((n): n is string => typeof n === 'string')
	if (Array.isArray(raw.cap_add)) service.cap_add = raw.cap_add.filter((c): c is string => typeof c === 'string')
	if (Array.isArray(raw.security_opt)) service.security_opt = raw.security_opt.filter((s): s is string => typeof s === 'string')
	if (Array.isArray(raw.secrets)) service.secrets = raw.secrets.filter((s): s is string => typeof s === 'string')

	if (typeof raw.env_file === 'string' || Array.isArray(raw.env_file)) service.env_file = raw.env_file as string | string[]

	if (raw.environment && typeof raw.environment === 'object') service.environment = normalizeEnvironment(raw.environment as Record<string, string> | string[])
	if (raw.labels && typeof raw.labels === 'object') service.labels = normalizeLabels(raw.labels as Record<string, string> | string[])

	if (typeof raw.command === 'string' || Array.isArray(raw.command)) service.command = raw.command as string | string[]

	if (raw.healthcheck && typeof raw.healthcheck === 'object') {
		const hc = raw.healthcheck as Record<string, unknown>
		service.healthcheck = {}
		if (typeof hc.test === 'string' || Array.isArray(hc.test)) service.healthcheck.test = hc.test as string | string[]
		if (typeof hc.interval === 'string') service.healthcheck.interval = hc.interval
		if (typeof hc.timeout === 'string') service.healthcheck.timeout = hc.timeout
		if (typeof hc.retries === 'number') service.healthcheck.retries = hc.retries
		if (typeof hc.start_period === 'string') service.healthcheck.start_period = hc.start_period
	}

	if (raw.deploy && typeof raw.deploy === 'object') {
		const deploy = raw.deploy as Record<string, unknown>
		const resources: ComposeDeploy['resources'] = {}
		if (deploy.resources && typeof deploy.resources === 'object') {
			const res = deploy.resources as Record<string, unknown>
			if (res.limits && typeof res.limits === 'object') {
				const lim = res.limits as Record<string, unknown>
				resources.limits = {}
				if (typeof lim.memory === 'string') resources.limits.memory = lim.memory
				if (typeof lim.cpus === 'string') resources.limits.cpus = lim.cpus
			}
			if (res.reservations && typeof res.reservations === 'object') {
				const rsv = res.reservations as Record<string, unknown>
				resources.reservations = {}
				if (typeof rsv.memory === 'string') resources.reservations.memory = rsv.memory
				if (typeof rsv.cpus === 'string') resources.reservations.cpus = rsv.cpus
			}
		}
		service.deploy = { resources }
	}

	return service
}

export function parseComposeYaml(yamlString: string): ComposeFile {
	if (!yamlString || !yamlString.trim()) {
		return { services: {} }
	}

	let parsed: Record<string, unknown>
	try {
		parsed = parseYaml(yamlString) as Record<string, unknown>
	} catch {
		return { services: {} }
	}

	if (!parsed || typeof parsed !== 'object') {
		return { services: {} }
	}

	const compose: ComposeFile = { services: {} }

	if (typeof parsed.name === 'string') compose.name = parsed.name

	if (parsed.services && typeof parsed.services === 'object') {
		for (const [name, raw] of Object.entries(parsed.services as Record<string, unknown>)) {
			if (raw && typeof raw === 'object') {
				compose.services[name] = normalizeService(raw as Record<string, unknown>)
			}
		}
	}

	if (parsed.volumes && typeof parsed.volumes === 'object') {
		compose.volumes = {}
		for (const [name, raw] of Object.entries(parsed.volumes as Record<string, unknown>)) {
			if (raw && typeof raw === 'object') {
				const vol = raw as Record<string, unknown>
				compose.volumes[name] = {}
				if (typeof vol.external === 'boolean') compose.volumes[name].external = vol.external
				if (typeof vol.driver === 'string') compose.volumes[name].driver = vol.driver
				if (typeof vol.name === 'string') compose.volumes[name].name = vol.name
			} else {
				compose.volumes[name] = {}
			}
		}
	}

	if (parsed.networks && typeof parsed.networks === 'object') {
		compose.networks = {}
		for (const [name, raw] of Object.entries(parsed.networks as Record<string, unknown>)) {
			if (raw && typeof raw === 'object') {
				const net = raw as Record<string, unknown>
				compose.networks[name] = {}
				if (typeof net.external === 'boolean') compose.networks[name].external = net.external
				if (typeof net.driver === 'string') compose.networks[name].driver = net.driver
				if (typeof net.name === 'string') compose.networks[name].name = net.name
			} else {
				compose.networks[name] = {}
			}
		}
	}

	if (parsed.secrets && typeof parsed.secrets === 'object') {
		compose.secrets = {}
		for (const [name, raw] of Object.entries(parsed.secrets as Record<string, unknown>)) {
			if (raw && typeof raw === 'object') {
				const sec = raw as Record<string, unknown>
				compose.secrets[name] = {}
				if (typeof sec.environment === 'string') compose.secrets[name].environment = sec.environment
				if (typeof sec.file === 'string') compose.secrets[name].file = sec.file
			}
		}
	}

	return compose
}

function serviceToYaml(service: ComposeService): Record<string, unknown> {
	const out: Record<string, unknown> = {}

	if (service.image) out.image = service.image
	if (service.container_name) out.container_name = service.container_name
	if (service.restart) out.restart = service.restart
	if (service.stop_grace_period) out.stop_grace_period = service.stop_grace_period
	if (service.hostname) out.hostname = service.hostname
	if (service.domainname) out.domainname = service.domainname
	if (service.ports && service.ports.length > 0) out.ports = service.ports
	if (service.volumes && service.volumes.length > 0) out.volumes = service.volumes
	if (service.environment && Object.keys(service.environment).length > 0) out.environment = service.environment
	if (service.env_file) out.env_file = service.env_file
	if (service.networks && service.networks.length > 0) out.networks = service.networks
	if (service.labels && Object.keys(service.labels).length > 0) out.labels = service.labels
	if (service.command) out.command = service.command
	if (service.cap_add && service.cap_add.length > 0) out.cap_add = service.cap_add
	if (service.security_opt && service.security_opt.length > 0) out.security_opt = service.security_opt
	if (service.secrets && service.secrets.length > 0) out.secrets = service.secrets
	if (service.tty) out.tty = true
	if (service.privileged) out.privileged = true

	if (service.healthcheck) {
		const hc: Record<string, unknown> = {}
		if (service.healthcheck.test) hc.test = service.healthcheck.test
		if (service.healthcheck.interval) hc.interval = service.healthcheck.interval
		if (service.healthcheck.timeout) hc.timeout = service.healthcheck.timeout
		if (service.healthcheck.retries) hc.retries = service.healthcheck.retries
		if (service.healthcheck.start_period) hc.start_period = service.healthcheck.start_period
		if (Object.keys(hc).length > 0) out.healthcheck = hc
	}

	if (service.deploy) {
		const deploy: Record<string, unknown> = {}
		const resources: Record<string, Record<string, string>> = {}
		if (service.deploy.resources?.limits) {
			const lim = service.deploy.resources.limits
			if (lim.memory || lim.cpus) {
				const limits: Record<string, string> = {}
				if (lim.memory) limits.memory = lim.memory
				if (lim.cpus) limits.cpus = lim.cpus
				resources.limits = limits
			}
		}
		if (service.deploy.resources?.reservations) {
			const rsv = service.deploy.resources.reservations
			if (rsv.memory || rsv.cpus) {
				const reservations: Record<string, string> = {}
				if (rsv.memory) reservations.memory = rsv.memory
				if (rsv.cpus) reservations.cpus = rsv.cpus
				resources.reservations = reservations
			}
		}
		if (Object.keys(resources).length > 0) deploy.resources = resources
		if (Object.keys(deploy).length > 0) out.deploy = deploy
	}

	return out
}

export function serializeComposeYaml(compose: ComposeFile): string {
	const doc: Record<string, unknown> = {}

	if (compose.name) doc.name = compose.name

	if (compose.services && Object.keys(compose.services).length > 0) {
		doc.services = {}
		for (const [name, service] of Object.entries(compose.services)) {
			const serialized = serviceToYaml(service)
			if (Object.keys(serialized).length > 0) {
				;(doc.services as Record<string, unknown>)[name] = serialized
			}
		}
		if (Object.keys(doc.services as Record<string, unknown>).length === 0) {
			delete doc.services
		}
	}

	if (compose.volumes && Object.keys(compose.volumes).length > 0) {
		const volumes: Record<string, unknown> = {}
		for (const [name, vol] of Object.entries(compose.volumes)) {
			const entries: Record<string, unknown> = {}
			if (vol.external) entries.external = true
			if (vol.driver) entries.driver = vol.driver
			if (vol.name) entries.name = vol.name
			volumes[name] = Object.keys(entries).length > 0 ? entries : null
		}
		doc.volumes = volumes
	}

	if (compose.networks && Object.keys(compose.networks).length > 0) {
		const networks: Record<string, unknown> = {}
		for (const [name, net] of Object.entries(compose.networks)) {
			const entries: Record<string, unknown> = {}
			if (net.external) entries.external = true
			if (net.driver) entries.driver = net.driver
			if (net.name) entries.name = net.name
			networks[name] = Object.keys(entries).length > 0 ? entries : null
		}
		doc.networks = networks
	}

	if (compose.secrets && Object.keys(compose.secrets).length > 0) {
		const secrets: Record<string, unknown> = {}
		for (const [name, sec] of Object.entries(compose.secrets)) {
			const entries: Record<string, unknown> = {}
			if (sec.environment) entries.environment = sec.environment
			if (sec.file) entries.file = sec.file
			secrets[name] = entries
		}
		doc.secrets = secrets
	}

	return stringifyYaml(doc, {
		indent: 2,
		lineWidth: 0,
	}).trim()
}

export function createEmptyService(): ComposeService {
	return { image: '' }
}

export function createEmptyComposeFile(): ComposeFile {
	return {
		services: { web: createEmptyService() },
	}
}
