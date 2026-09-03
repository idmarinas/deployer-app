import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Añadir docker compose',
		edit: 'Editar docker compose',
	},
	name: {
		label: 'Nombre',
		help: 'Nombre único que identificará el docker compose',
	},
	description: {
		label: 'Descripción',
		help: 'Descripción opcional para recordar el propósito del compose',
	},
	host_id: {
		label: 'Servidor',
		help: 'Servidor donde se ejecutará el docker compose',
	},
	remote_path: {
		label: 'Ruta remota',
		help: 'Directorio en el servidor donde se subirán todos los archivos del compose',
	},
	files: {
		principal: 'Principal',
		secondary: 'Secundario',
		env_add: 'Añadir variable',
		create_compose: 'Crear compose.yaml',
		compose_missing: 'Falta el archivo compose.yaml principal',
		compose_missing_hint: 'Crea un archivo compose.yaml en la raíz para poder guardar el docker compose.',
		create: {
			compose_already_exists: 'Ya existe un archivo compose principal',
		},
	},
	compose_content: {
		label: 'Contenido YAML',
		help: 'Contenido del docker-compose.yml',
	},
	enabled: {
		label: 'Habilitado',
		help: 'Indica si el docker compose está habilitado',
	},
	mode: {
		label: 'Modo de edición',
		form: 'Formulario',
		yaml: 'YAML',
	},
	services: {
		label: 'Servicios',
		add: 'Añadir servicio',
		empty: 'No hay servicios definidos',
		service_name: 'Nombre del servicio',
	},
	service: {
		image: {
			label: 'Imagen',
			help: 'Imagen Docker (ej: nginx:latest, traefik:v3.7.5)',
			placeholder: 'Buscar imagen en Docker Hub...',
			tag_placeholder: 'Buscar tag...',
			tag_disabled: 'Selecciona una imagen primero',
			version_placeholder: 'Versión...',
			version_disabled: 'Selecciona una imagen',
			variant_placeholder: 'Variante...',
			variant_empty: 'Sin variantes',
			variant_count: '1 variante | {count} variantes',
		},
		container_name: {
			label: 'Nombre del contenedor',
			help: 'Nombre personalizado del contenedor',
		},
		restart: {
			label: 'Reinicio',
			help: 'Política de reinicio del contenedor',
			options: {
				no: 'No',
				always: 'Siempre',
				unless_stopped: 'A menos que se detenga',
				on_failure: 'En caso de fallo',
			},
		},
		stop_grace_period: {
			label: 'Tiempo de parada',
			help: 'Tiempo de espera antes de forzar la parada (ej: 30s, 1m)',
		},
		hostname: {
			label: 'Hostname',
			help: 'Hostname del contenedor',
		},
		domainname: {
			label: 'Dominio',
			help: 'Dominio del contenedor',
		},
		ports: {
			label: 'Puertos',
			add: 'Añadir puerto',
			help: 'Mapeo de puertos host:container',
			host: 'Host',
			container: 'Contenedor',
			placeholder: '80:80',
		},
		volumes: {
			label: 'Volúmenes',
			add: 'Añadir volumen',
			help: 'Montajes de volumen (source:destination)',
			source: 'Origen',
			target: 'Destino',
			options: {
				rw: 'Lectura/Escritura',
				ro: 'Solo lectura',
			},
		},
		environment: {
			label: 'Variables de entorno',
			add: 'Añadir variable',
			help: 'Variables de entorno KEY=VALUE',
			key: 'Clave',
			value: 'Valor',
		},
		env_file: {
			label: 'Archivo de entorno',
			help: 'Ruta al archivo .env (ej: mailserver.env)',
		},
		networks: {
			label: 'Redes',
			add: 'Añadir red',
			help: 'Redes a las que se conecta el servicio',
			placeholder: 'proxy',
		},
		labels: {
			label: 'Etiquetas',
			add: 'Añadir etiqueta',
			help: 'Etiquetas KEY=VALUE (ej: traefik labels)',
			key: 'Clave',
			value: 'Valor',
		},
		command: {
			label: 'Comando',
			help: 'Comando personalizado o override del entrypoint',
			placeholder: 'docker-entrypoint.sh',
		},
		healthcheck: {
			label: 'Health check',
			help: 'Configuración de verificación de salud',
			enabled: 'Habilitar health check',
			test: 'Test',
			interval: 'Intervalo',
			timeout: 'Timeout',
			retries: 'Reintentos',
			start_period: 'Periodo de inicio',
			test_placeholder: "curl -f http://localhost/ {'||'} exit 1",
			interval_placeholder: '30s',
			timeout_placeholder: '10s',
			start_period_placeholder: '30s',
		},
		deploy: {
			label: 'Deploy',
			help: 'Configuración de despliegue y recursos',
			enabled: 'Habilitar deploy',
			memory_limit: 'Límite de memoria',
			cpu_limit: 'Límite de CPU',
			memory_reservation: 'Reserva de memoria',
			cpu_reservation: 'Reserva de CPU',
			memory_placeholder: '512m',
			cpu_placeholder: '0.5',
		},
		advanced: {
			label: 'Opciones avanzadas',
			cap_add: {
				label: 'Capacidades (cap_add)',
				help: 'Capacidades Linux adicionales',
				placeholder: 'NET_ADMIN',
			},
			security_opt: {
				label: 'Opciones de seguridad',
				help: 'Opciones de seguridad del contenedor',
				placeholder: 'no-new-privileges:true',
			},
			tty: {
				label: 'TTY',
				help: 'Asignar pseudo-TTY',
			},
			privileged: {
				label: 'Privilegiado',
				help: 'Ejecutar en modo privilegiado (danger)',
			},
		},
	},
	volumes: {
		label: 'Volúmenes',
		add: 'Añadir volumen',
		empty: 'No hay volúmenes definidos',
		name: 'Nombre',
		external: 'Externo',
		driver: 'Driver',
	},
	networks: {
		label: 'Redes',
		add: 'Añadir red',
		empty: 'No hay redes definidas',
		name: 'Nombre',
		external: 'Externa',
		driver: 'Driver',
	},
} satisfies LocaleMessageValue
