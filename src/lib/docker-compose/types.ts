export interface ComposeFile {
	name?: string
	services: Record<string, ComposeService>
	volumes?: Record<string, ComposeVolume>
	networks?: Record<string, ComposeNetwork>
	secrets?: Record<string, ComposeSecret>
}

export interface ComposeService {
	image?: string
	container_name?: string
	restart?: 'no' | 'always' | 'unless-stopped' | 'on-failure'
	stop_grace_period?: string
	hostname?: string
	domainname?: string
	ports?: string[]
	volumes?: string[]
	environment?: Record<string, string>
	env_file?: string | string[]
	networks?: string[]
	labels?: Record<string, string>
	command?: string | string[]
	cap_add?: string[]
	security_opt?: string[]
	secrets?: string[]
	tty?: boolean
	privileged?: boolean
	healthcheck?: ComposeHealthcheck
	deploy?: ComposeDeploy
}

export interface ComposeHealthcheck {
	test?: string | string[]
	interval?: string
	timeout?: string
	retries?: number
	start_period?: string
}

export interface ComposeDeploy {
	resources?: {
		limits?: { memory?: string; cpus?: string }
		reservations?: { memory?: string; cpus?: string }
	}
}

export interface ComposeVolume {
	external?: boolean
	driver?: string
	name?: string
}

export interface ComposeNetwork {
	external?: boolean
	driver?: string
	name?: string
}

export interface ComposeSecret {
	environment?: string
	file?: string
}

export type ComposeMode = 'form' | 'yaml'
