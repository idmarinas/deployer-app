import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Especificación de Compose',
	description: 'El archivo Compose es un archivo YAML que define una aplicación basada en múltiples contenedores.',
	properties: {
		version: {
			label: 'Versión',
			description: 'declarada por compatibilidad con versiones anteriores; se ignora. Por favor, elimínala.'
		},
		name: {
			label: 'Nombre',
			description: 'define el nombre del proyecto Compose, hasta que el usuario defina uno explícitamente.'
		},
		include: {
			label: 'Incluir',
			description: 'subproyectos compose a incluir.'
		},
		services: {
			label: 'Servicios',
			description: 'Los servicios que usará tu aplicación.'
		},
		models: {
			label: 'Modelos',
			description: 'Modelos de lenguaje que usará tu aplicación.'
		},
		networks: {
			label: 'Redes',
			description: 'Redes que se comparten entre varios servicios.'
		},
		volumes: {
			label: 'Volúmenes',
			description: 'Volúmenes con nombre que se comparten entre varios servicios.'
		},
		secrets: {
			label: 'Secrets',
			description: 'Secrets que se comparten entre varios servicios.'
		},
		configs: {
			label: 'Configs',
			description: 'Configuraciones que se comparten entre varios servicios.'
		}
	},
	$defs: {
		service: {
			description: 'Configuración para un servicio.',
			properties: {
				build: {
					description: 'Opciones de configuración para compilar la imagen del servicio.',
					oneOf: {
						"0": {
							description: 'Ruta al contexto de compilación. Puede ser una ruta relativa o una URL.'
						},
						"1": {
							properties: {
								context: {
									description: 'Ruta al contexto de compilación. Puede ser una ruta relativa o una URL.'
								},
								dockerfile: {
									description: 'Nombre del Dockerfile a usar para compilar la imagen.'
								},
								dockerfile_inline: {
									description: 'Contenido inline de Dockerfile a usar en lugar de un Dockerfile del contexto de compilación.'
								},
								entitlements: {
									description: 'Lista de privilegios adicionales a conceder al proceso de compilación.'
								},
								args: {
									description: 'Variables de tiempo de compilación, especificadas como un mapa o una lista de pares KEY=VAL.'
								},
								ssh: {
									description: 'Socket o claves del agente SSH a exponer a la compilación. El formato es una cadena o una lista de \'default|<id>[=<socket>|<key>[,<key>]]\'.'
								},
								labels: {
									description: 'Etiquetas a aplicar a la imagen construida.'
								},
								cache_from: {
									description: 'Lista de fuentes que el builder de imágenes debe usar para la resolución de caché.'
								},
								cache_to: {
									description: 'Destinos de caché para la caché de compilación.'
								},
								no_cache: {
									description: 'No usa caché al compilar la imagen.'
								},
								no_cache_filter: {
									description: 'No usa caché de compilación para las etapas especificadas.'
								},
								additional_contexts: {
									description: 'Contextos de compilación adicionales a usar, especificados como un mapa de nombre a ruta de contexto o URL.'
								},
								network: {
									description: 'Modo de red a usar para la compilación. Las opciones incluyen \'default\', \'none\', \'host\' o un nombre de red.'
								},
								provenance: {
									description: 'Añade una attestación de procedencia (provenance).'
								},
								sbom: {
									description: 'Añade una attestación SBOM.'
								},
								pull: {
									description: 'Siempre intenta descargar una versión más nueva de la imagen.'
								},
								target: {
									description: 'Etapa de compilación a la que apuntar en un Dockerfile multi-etapa.'
								},
								shm_size: {
									description: 'Tamaño de /dev/shm para el contenedor de compilación. Un valor de cadena puede usar sufijos como \'2g\' para 2 gigabytes.'
								},
								extra_hosts: {
									description: 'Añade mapeos de hostname para el contenedor de compilación.'
								},
								isolation: {
									description: 'Tecnología de aislamiento de contenedor a usar para el proceso de compilación.'
								},
								privileged: {
									description: 'Concede privilegios extendidos al contenedor de compilación.'
								},
								secrets: {
									description: 'Secrets a exponer a la compilación. Son accesibles en tiempo de compilación.'
								},
								tags: {
									description: 'Tags adicionales a aplicar a la imagen construida.'
								},
								ulimits: {
									description: 'Sobrescribe los ulimits predeterminados para el contenedor de compilación.'
								},
								platforms: {
									description: 'Plataformas para las que compilar, p. ej., \'linux/amd64\', \'linux/arm64\' o \'windows/amd64\'.'
								}
							}
						}
					}
				},
				blkio_config: {
					description: 'Configuración de IO de bloque para el servicio.',
					properties: {
						device_read_bps: {
							description: 'Limita la tasa de lectura (bytes por segundo) desde un dispositivo.'
						},
						device_read_iops: {
							description: 'Limita la tasa de lectura (IO por segundo) desde un dispositivo.'
						},
						device_write_bps: {
							description: 'Limita la tasa de escritura (bytes por segundo) hacia un dispositivo.'
						},
						device_write_iops: {
							description: 'Limita la tasa de escritura (IO por segundo) hacia un dispositivo.'
						},
						weight: {
							description: 'Peso de IO de bloque (peso relativo) para el servicio, entre 10 y 1000.'
						},
						weight_device: {
							description: 'Peso de IO de bloque (peso relativo) para dispositivos específicos.'
						}
					}
				},
				cap_add: {
					description: 'Añade capacidades de Linux. Por ejemplo, \'CAP_SYS_ADMIN\', \'SYS_ADMIN\' o \'NET_ADMIN\'.'
				},
				cap_drop: {
					description: 'Elimina capacidades de Linux. Por ejemplo, \'CAP_SYS_ADMIN\', \'SYS_ADMIN\' o \'NET_ADMIN\'.'
				},
				cgroup: {
					description: 'Especifica el namespace de cgroup al que unirse. Usa \'host\' para usar el namespace de cgroup del host, o \'private\' para usar un namespace de cgroup privado.'
				},
				cgroup_parent: {
					description: 'Especifica un cgroup padre opcional para el contenedor.'
				},
				command: {
					description: 'Sobrescribe el comando predeterminado declarado por la imagen del contenedor, por ejemplo \'CMD\' en el Dockerfile.'
				},
				configs: {
					description: 'Concede acceso a los Configs por servicio.'
				},
				container_name: {
					description: 'Especifica un nombre de contenedor personalizado, en lugar de un nombre predeterminado generado.'
				},
				cpu_count: {
					description: 'Número de CPUs utilizables.'
				},
				cpu_percent: {
					description: 'Porcentaje de recursos de CPU a usar.'
				},
				cpu_shares: {
					description: 'Shares de CPU (peso relativo) para el contenedor.'
				},
				cpu_quota: {
					description: 'Limita la cuota de CFS (Completely Fair Scheduler) de la CPU.'
				},
				cpu_period: {
					description: 'Limita el período de CFS (Completely Fair Scheduler) de la CPU.'
				},
				cpu_rt_period: {
					description: 'Limita el período de tiempo real de la CPU en microsegundos o en formato de duración.'
				},
				cpu_rt_runtime: {
					description: 'Limita el tiempo de ejecución en tiempo real de la CPU en microsegundos o en formato de duración.'
				},
				cpus: {
					description: 'Número de CPUs a usar. Se admite un valor de coma flotante para solicitar CPUs parciales.'
				},
				cpuset: {
					description: 'CPUs en las que permitir la ejecución (0-3, 0,1).'
				},
				credential_spec: {
					description: 'Configura la especificación de credenciales para la cuenta de servicio gestionada.',
					properties: {
						config: {
							description: 'El nombre del Config de especificación de credenciales a usar.'
						},
						file: {
							description: 'Ruta a un archivo de especificación de credenciales.'
						},
						registry: {
							description: 'Ruta a una especificación de credenciales en el registro de Windows.'
						}
					}
				},
				depends_on: {
					description: 'Expresa la dependencia entre servicios. Las dependencias entre servicios hacen que los servicios se inicien en orden de dependencia. El servicio dependiente esperará a que la dependencia esté lista antes de iniciarse.',
					oneOf: {
						"1": {
							patternProperties: {
								"^[a-zA-Z0-9._-]+$": {
									properties: {
										restart: {
											description: 'Indica si se reinician los servicios dependientes cuando se reinicia este servicio.'
										},
										required: {
											description: 'Indica si la dependencia es necesaria para que el servicio dependiente se inicie.'
										},
										condition: {
											description: 'Condición por la que esperar. \'service_started\' espera hasta que el servicio ha iniciado, \'service_healthy\' espera hasta que el servicio está saludable (según su healthcheck), \'service_completed_successfully\' espera hasta que el servicio ha completado correctamente.'
										}
									}
								}
							}
						}
					}
				},
				device_cgroup_rules: {
					description: 'Añade reglas a la lista de dispositivos permitidos del cgroup.'
				},
				devices: {
					description: 'Lista de mapeos de dispositivos para el contenedor.',
					items: {
						oneOf: {
							"1": {
								properties: {
									source: {
										description: 'Ruta en el host hacia el dispositivo.'
									},
									target: {
										description: 'Ruta en el contenedor donde se mapeará el dispositivo.'
									},
									permissions: {
										description: 'Permisos de cgroup para el dispositivo (rwm).'
									}
								}
							}
						}
					}
				},
				dns: {
					description: 'Servidores DNS personalizados para el contenedor del servicio.'
				},
				dns_opt: {
					description: 'Opciones DNS personalizadas para pasar al resolver DNS del contenedor.'
				},
				dns_search: {
					description: 'Dominios de búsqueda DNS personalizados para el contenedor del servicio.'
				},
				domainname: {
					description: 'Nombre de dominio personalizado para el contenedor del servicio.'
				},
				entrypoint: {
					description: 'Sobrescribe el entrypoint predeterminado declarado por la imagen del contenedor, por ejemplo \'ENTRYPOINT\' en el Dockerfile.'
				},
				env_file: {
					description: 'Añade variables de entorno desde uno o varios archivos. Puede ser una única ruta de archivo o una lista de rutas.'
				},
				label_file: {
					description: 'Añade metadatos a los contenedores usando archivos que contienen etiquetas Docker.'
				},
				environment: {
					description: 'Añade variables de entorno. Puedes usar una matriz o una lista de pares KEY=VAL.'
				},
				expose: {
					description: 'Expone puertos sin publicarlos en la máquina host: solo serán accesibles para los servicios enlazados.'
				},
				extends: {
					description: 'Extiende otro servicio, en el archivo actual o en otro archivo.',
					oneOf: {
						"1": {
							properties: {
								service: {
									description: 'El nombre del servicio a extender.'
								},
								file: {
									description: 'La ruta del archivo donde está definido el servicio a extender.'
								}
							}
						}
					}
				},
				provider: {
					description: 'Especifica un servicio que Compose no gestionará directamente, y delega su gestión a un proveedor externo.',
					properties: {
						type: {
							description: 'Componente externo usado por Compose para gestionar el ciclo de vida de creación y destrucción del servicio.'
						},
						options: {
							description: 'Opciones específicas del proveedor.'
						}
					}
				},
				external_links: {
					description: 'Enlaza a servicios iniciados fuera de esta aplicación Compose. Especifica los servicios como <service_name>:<alias>.'
				},
				extra_hosts: {
					description: 'Añade mapeos de hostname a la configuración de la interfaz de red del contenedor.'
				},
				gpus: {
					description: 'Define los dispositivos GPU a usar. Puede establecerse en \'all\' para usar todas las GPUs, o una lista de dispositivos GPU específicos.'
				},
				group_add: {
					description: 'Añade grupos adicionales de los que el usuario dentro del contenedor debe ser miembro.'
				},
				healthcheck: {
					description: 'Configura un health check para el contenedor y monitorizar su estado de salud.'
				},
				hostname: {
					description: 'Define un hostname personalizado para el contenedor del servicio.'
				},
				image: {
					description: 'Especifica la imagen desde la que iniciar el contenedor. Puede ser un repositorio/tag, un digest o un ID de imagen local.'
				},
				init: {
					description: 'Ejecuta como proceso init dentro del contenedor que reenvía señales y recolecta procesos.'
				},
				ipc: {
					description: 'Modo de compartición de IPC para el contenedor del servicio. Usa \'host\' para compartir el namespace de IPC del host, \'service:[service_name]\' para compartir con otro servicio, o \'shareable\' para permitir que otros servicios compartan el namespace de IPC de este servicio.'
				},
				isolation: {
					description: 'Tecnología de aislamiento de contenedor a usar. Los valores admitidos dependen de la plataforma.'
				},
				labels: {
					description: 'Añade metadatos a los contenedores usando etiquetas Docker. Puedes usar una matriz o una lista.'
				},
				links: {
					description: 'Enlaza a contenedores en otro servicio. Especifica el nombre del servicio y un alias de enlace (SERVICE:ALIAS), o solo el nombre del servicio.'
				},
				logging: {
					description: 'Configuración de logging para el servicio.',
					properties: {
						driver: {
							description: 'Driver de logging a usar, como \'json-file\', \'syslog\', \'journald\', etc.'
						},
						options: {
							description: 'Opciones para el driver de logging.'
						}
					}
				},
				mac_address: {
					description: 'Dirección MAC del contenedor a establecer.'
				},
				mem_limit: {
					description: 'Límite de memoria para el contenedor. Un valor de cadena puede usar sufijos como \'2g\' para 2 gigabytes.'
				},
				mem_reservation: {
					description: 'Reserva de memoria para el contenedor.'
				},
				mem_swappiness: {
					description: 'Swappiness de memoria del contenedor como porcentaje (0 a 100).'
				},
				memswap_limit: {
					description: 'Cantidad de memoria que el contenedor puede intercambiar (swap) al disco. Ponlo a -1 para habilitar swap ilimitado.'
				},
				network_mode: {
					description: 'Modo de red. Los valores pueden ser \'bridge\', \'host\', \'none\', \'service:[service name]\' o \'container:[container name]\'.'
				},
				models: {
					description: 'Modelos de IA a usar, que referencian entradas de la clave models de nivel superior.',
					oneOf: {
						"1": {
							patternProperties: {
								"^[a-zA-Z0-9._-]+$": {
									oneOf: {
										"0": {
											properties: {
												endpoint_var: {
													description: 'Variable de entorno establecida con el endpoint del modelo de IA.'
												},
												model_var: {
													description: 'Variable de entorno establecida con el nombre del modelo de IA.'
												}
											}
										}
									}
								}
							}
						}
					}
				},
				networks: {
					description: 'Redes a las que unirse, que referencian entradas de la clave networks de nivel superior. Puede ser una lista de nombres de red o un mapeo de nombre de red a configuración de red.',
					oneOf: {
						"1": {
							patternProperties: {
								"^[a-zA-Z0-9._-]+$": {
									oneOf: {
										"0": {
											properties: {
												aliases: {
													description: 'Hostnames alternativos para este servicio en la red.'
												},
												interface_name: {
													description: 'Nombre de la interfaz de red usada para conectarse a la red.'
												},
												ipv4_address: {
													description: 'Especifica una dirección IPv4 estática para este servicio en esta red.'
												},
												ipv6_address: {
													description: 'Especifica una dirección IPv6 estática para este servicio en esta red.'
												},
												link_local_ips: {
													description: 'Lista de IPs link-local.'
												},
												mac_address: {
													description: 'Especifica una dirección MAC para este servicio en esta red.'
												},
												driver_opts: {
													description: 'Opciones del driver para esta red.'
												},
												priority: {
													description: 'Especifica la prioridad para la conexión de red.'
												},
												gw_priority: {
													description: 'Especifica la prioridad del gateway para la conexión de red.'
												}
											}
										}
									}
								}
							}
						}
					}
				},
				oom_kill_disable: {
					description: 'Deshabilita el OOM Killer para el contenedor.'
				},
				oom_score_adj: {
					description: 'Ajusta las preferencias OOM del host para el contenedor (acepta de -1000 a 1000).'
				},
				pid: {
					description: 'Modo PID para el contenedor.'
				},
				pids_limit: {
					description: 'Ajusta el límite de PIDs de un contenedor. Ponlo a -1 para PIDs ilimitados.'
				},
				platform: {
					description: 'Plataforma de destino en la que ejecutar, p. ej., \'linux/amd64\', \'linux/arm64\' o \'windows/amd64\'.'
				},
				ports: {
					description: 'Expone puertos del contenedor. Formato corto ([HOST:]CONTAINER[/PROTOTOCOLO]).',
					items: {
						oneOf: {
							"2": {
								properties: {
									name: {
										description: 'Un nombre legible para este mapeo de puertos.'
									},
									mode: {
										description: 'El modo de enlace del puerto, ya sea \'host\' para publicar un puerto del host o \'ingress\' para balanceo de carga.'
									},
									host_ip: {
										description: 'La IP del host a la que vincularse.'
									},
									target: {
										description: 'El puerto dentro del contenedor.'
									},
									published: {
										description: 'El puerto publicado públicamente.'
									},
									protocol: {
										description: 'El protocolo del puerto (tcp o udp).'
									},
									app_protocol: {
										description: 'Protocolo de aplicación a usar con el puerto (p. ej., http, https, mysql).'
									}
								}
							}
						}
					}
				},
				pre_start: {
					description: 'Contenedores init que se ejecutan hasta completarse antes de iniciar el contenedor del servicio. Cada paso se ejecuta en su propio contenedor efímero, en el orden declarado; una salida distinta de cero falla el arranque del servicio y sus dependientes.'
				},
				post_start: {
					description: 'Comandos a ejecutar tras iniciar el contenedor. Si falla algún comando, el contenedor se detiene.'
				},
				pre_stop: {
					description: 'Comandos a ejecutar antes de que el contenedor se detenga. Si falla algún comando, se aborta la detención del contenedor.'
				},
				privileged: {
					description: 'Concede privilegios extendidos al contenedor del servicio.'
				},
				profiles: {
					description: 'Lista de perfiles para este servicio. Cuando se especifican perfiles, los servicios solo se inician cuando el perfil está activado.'
				},
				pull_policy: {
					description: 'Política para la descarga de imágenes. Las opciones incluyen: \'always\', \'never\', \'if_not_present\', \'missing\', \'build\' o políticas de actualización basadas en tiempo.'
				},
				pull_refresh_after: {
					description: 'Tiempo tras el cual actualizar la imagen. Se usa con pull_policy=refresh.'
				},
				read_only: {
					description: 'Monta el sistema de archivos del contenedor como solo lectura.'
				},
				restart: {
					description: 'Política de reinicio para el contenedor del servicio. Las opciones incluyen: \'no\', \'always\', \'on-failure\' y \'unless-stopped\'.'
				},
				runtime: {
					description: 'Runtime a usar para este contenedor, p. ej., \'runc\'.'
				},
				scale: {
					description: 'Número de contenedores a desplegar para este servicio.'
				},
				security_opt: {
					description: 'Sobrescribe el esquema de etiquetado predeterminado para cada contenedor.'
				},
				shm_size: {
					description: 'Tamaño de /dev/shm. Un valor de cadena puede usar sufijos como \'2g\' para 2 gigabytes.'
				},
				secrets: {
					description: 'Concede acceso a los Secrets por servicio.'
				},
				sysctls: {
					description: 'Parámetros del kernel a establecer en el contenedor. Puedes usar una matriz o una lista.'
				},
				stdin_open: {
					description: 'Mantiene STDIN abierto aunque no esté conectado.'
				},
				stop_grace_period: {
					description: 'Tiempo de espera para que el contenedor se detenga correctamente antes de enviar SIGKILL (p. ej., \'1s\', \'1m30s\').'
				},
				stop_signal: {
					description: 'Señal para detener el contenedor (p. ej., \'SIGTERM\', \'SIGINT\').'
				},
				storage_opt: {
					description: 'Opciones de driver de almacenamiento para el contenedor.'
				},
				tmpfs: {
					description: 'Monta un sistema de archivos temporal (tmpfs) dentro del contenedor. Puede ser un valor único o una lista.'
				},
				tty: {
					description: 'Asigna un pseudo-TTY al contenedor del servicio.'
				},
				ulimits: {
					description: 'Sobrescribe los ulimits predeterminados para un contenedor.'
				},
				use_api_socket: {
					description: 'Monta el socket de la API de Docker y la autenticación requerida (bind mount).'
				},
				user: {
					description: 'Nombre de usuario o UID con el que ejecutar el proceso del contenedor.'
				},
				uts: {
					description: 'Namespace UTS a usar. \'host\' comparte el namespace UTS del host.'
				},
				userns_mode: {
					description: 'Namespace de usuario a usar. \'host\' comparte el namespace de usuario del host.'
				},
				volumes: {
					description: 'Monta rutas del host o volúmenes con nombre accesibles para el contenedor. Sintaxis corta (VOLUME:CONTAINER_PATH[:MODE]).',
					items: {
						oneOf: {
							"1": {
								properties: {
									type: {
										description: 'El tipo de montaje: bind para montar directorios del host, volume para volúmenes con nombre, tmpfs para sistemas de archivos temporales, cluster para volúmenes de clúster, npipe para named pipes, o image para montar desde una imagen.'
									},
									source: {
										description: 'El origen del montaje: una ruta en el host para un bind mount, una referencia de imagen Docker para un image mount, o el nombre de un volumen definido en la clave volumes de nivel superior. No aplica a un montaje tmpfs.'
									},
									target: {
										description: 'La ruta en el contenedor donde se monta el volumen.'
									},
									read_only: {
										description: 'Indica si establecer el volumen como solo lectura.'
									},
									consistency: {
										description: 'Los requisitos de consistencia para el montaje. Los valores disponibles dependen de la plataforma.'
									},
									bind: {
										description: 'Configuración específica para montajes bind.',
										properties: {
											propagation: {
												description: 'El modo de propagación para el bind mount: \'shared\', \'slave\', \'private\', \'rshared\', \'rslave\' o \'rprivate\'.'
											},
											create_host_path: {
												description: 'Crea la ruta del host si no existe.'
											},
											recursive: {
												description: 'Monta recursivamente el directorio de origen.'
											},
											selinux: {
												description: 'Opciones de reetiquetado SELinux: \'z\' para contenido compartido, \'Z\' para contenido privado no compartido.'
											}
										}
									},
									volume: {
										description: 'Configuración específica para montajes de volumen.',
										properties: {
											labels: {
												description: 'Etiquetas a aplicar al volumen.'
											},
											nocopy: {
												description: 'Indica si se deshabilita la copia de datos desde un contenedor cuando se crea un volumen.'
											},
											subpath: {
												description: 'Ruta dentro del volumen a montar en lugar de la raíz del volumen.'
											}
										}
									},
									tmpfs: {
										description: 'Configuración específica para montajes tmpfs.',
										properties: {
											size: {
												description: 'Tamaño del montaje tmpfs en bytes.'
											},
											mode: {
												description: 'Modo de archivo del tmpfs en octal.'
											}
										}
									},
									image: {
										description: 'Configuración específica para montajes de imagen.',
										properties: {
											subpath: {
												description: 'Ruta dentro de la imagen a montar en lugar de la raíz de la imagen.'
											}
										}
									}
								}
							}
						}
					}
				},
				volumes_from: {
					description: 'Monta volúmenes desde otro servicio o contenedor. Opcionalmente especifica acceso de solo lectura (ro) o lectura/escritura (rw).'
				},
				working_dir: {
					description: 'El directorio de trabajo en el que se ejecutará el entrypoint o el comando.'
				}
			}
		},
		healthcheck: {
			description: 'Opciones de configuración para determinar si el contenedor está saludable.',
			properties: {
				disable: {
					description: 'Deshabilita cualquier healthcheck especificado en el contenedor. Ponlo a true para deshabilitarlo.'
				},
				interval: {
					description: 'Tiempo entre comprobaciones (p. ej., \'1s\', \'1m30s\'). Predeterminado: 30s.'
				},
				retries: {
					description: 'Número de fallos consecutivos necesarios para considerar el contenedor no saludable. Predeterminado: 3.'
				},
				test: {
					description: 'El test a realizar para comprobar la salud del contenedor. Puede ser una cadena o una lista. El primer elemento es NONE, CMD o CMD-SHELL. Si es CMD, el resto del comando se ejecuta directamente. Si es CMD-SHELL, el resto se ejecuta en el shell.'
				},
				timeout: {
					description: 'Tiempo máximo para que se ejecute una comprobación (p. ej., \'1s\', \'1m30s\'). Predeterminado: 30s.'
				},
				start_period: {
					description: 'Período de inicio para que el contenedor se inicialice antes de empezar la cuenta atrás de reintentos de salud (p. ej., \'1s\', \'1m30s\'). Predeterminado: 0s.'
				},
				start_interval: {
					description: 'Tiempo entre comprobaciones durante el período de inicio (p. ej., \'1s\', \'1m30s\'). Predeterminado: el valor de interval.'
				}
			}
		},
		development: {
			description: 'Configuración de desarrollo para el servicio, usada en los flujos de trabajo de desarrollo.',
			properties: {
				watch: {
					description: 'Configura el modo watch del servicio, que monitoriza los cambios de archivos y ejecuta acciones en respuesta.',
					items: {
						properties: {
							ignore: {
								description: 'Patrones a excluir de la vigilancia.'
							},
							include: {
								description: 'Patrones a incluir en la vigilancia.'
							},
							path: {
								description: 'Ruta a vigilar en busca de cambios.'
							},
							action: {
								description: 'Acción a tomar cuando se detecta un cambio: reconstruir el contenedor, sincronizar archivos, reiniciar el contenedor, sincronizar y reiniciar, o sincronizar y ejecutar un comando.'
							},
							target: {
								description: 'Ruta de destino en el contenedor para las operaciones de sincronización.'
							},
							exec: {
								description: 'Comando a ejecutar cuando se detecta un cambio y la acción es sync+exec.'
							},
							initial_sync: {
								description: 'Garantiza que se realice una sincronización inicial antes de iniciar el modo watch para los triggers sync+x.'
							}
						}
					}
				}
			}
		},
		deployment: {
			description: 'Configuración de despliegue para el servicio.',
			properties: {
				mode: {
					description: 'Modo de despliegue para el servicio: \'replicated\' (predeterminado) o \'global\'.'
				},
				endpoint_mode: {
					description: 'Modo de endpoint para el servicio: \'vip\' (predeterminado) o \'dnsrr\'.'
				},
				replicas: {
					description: 'Número de réplicas del contenedor del servicio a ejecutar.'
				},
				labels: {
					description: 'Etiquetas a aplicar al servicio.'
				},
				rollback_config: {
					description: 'Configuración para revertir (rollback) una actualización de servicio.',
					properties: {
						parallelism: {
							description: 'El número de contenedores a revertir a la vez. Si se establece en 0, todos los contenedores se revierten simultáneamente.'
						},
						delay: {
							description: 'El tiempo de espera entre el rollback de cada grupo de contenedores (p. ej., \'1s\', \'1m30s\').'
						},
						failure_action: {
							description: 'Acción a tomar si falla un rollback: \'continue\', \'pause\'.'
						},
						monitor: {
							description: 'Duración para monitorizar cada tarea en busca de fallos tras crearse (p. ej., \'1s\', \'1m30s\').'
						},
						max_failure_ratio: {
							description: 'Tasa de fallos tolerable durante un rollback.'
						},
						order: {
							description: 'Orden de operaciones durante los rollbacks: \'stop-first\' (predeterminado) o \'start-first\'.'
						}
					}
				},
				update_config: {
					description: 'Configuración para actualizar un servicio.',
					properties: {
						parallelism: {
							description: 'El número de contenedores a actualizar a la vez.'
						},
						delay: {
							description: 'El tiempo de espera entre la actualización de un grupo de contenedores (p. ej., \'1s\', \'1m30s\').'
						},
						failure_action: {
							description: 'Acción a tomar si falla una actualización: \'continue\', \'pause\', \'rollback\'.'
						},
						monitor: {
							description: 'Duración para monitorizar cada tarea actualizada en busca de fallos tras crearse (p. ej., \'1s\', \'1m30s\').'
						},
						max_failure_ratio: {
							description: 'Tasa de fallos tolerable durante una actualización (0 a 1).'
						},
						order: {
							description: 'Orden de operaciones durante las actualizaciones: \'stop-first\' (predeterminado) o \'start-first\'.'
						}
					}
				},
				resources: {
					description: 'Restricciones y reservas de recursos para el servicio.',
					properties: {
						limits: {
							description: 'Límites de recursos para los contenedores del servicio.',
							properties: {
								cpus: {
									description: 'Límite de cuánto de los recursos de CPU disponibles, como número de núcleos, puede usar un contenedor.'
								},
								memory: {
									description: 'Límite de la cantidad de memoria que un contenedor puede asignar (p. ej., \'1g\', \'1024m\').'
								},
								pids: {
									description: 'Número máximo de PIDs disponibles para el contenedor.'
								}
							}
						},
						reservations: {
							description: 'Reservas de recursos para los contenedores del servicio.',
							properties: {
								cpus: {
									description: 'Reserva de cuánto de los recursos de CPU disponibles, como número de núcleos, puede usar un contenedor.'
								},
								memory: {
									description: 'Reserva de la cantidad de memoria que un contenedor puede asignar (p. ej., \'1g\', \'1024m\').'
								},
								generic_resources: {
									description: 'Recursos definidos por el usuario a reservar.'
								},
								devices: {
									description: 'Reservas de dispositivos para el contenedor.'
								}
							}
						}
					}
				},
				restart_policy: {
					description: 'Política de reinicio para los contenedores del servicio.',
					properties: {
						condition: {
							description: 'Condición para reiniciar el contenedor: \'none\', \'on-failure\', \'any\'.'
						},
						delay: {
							description: 'Retraso entre intentos de reinicio (p. ej., \'1s\', \'1m30s\').'
						},
						max_attempts: {
							description: 'Número máximo de intentos de reinicio antes de rendirse.'
						},
						window: {
							description: 'Ventana de tiempo usada para evaluar la política de reinicio (p. ej., \'1s\', \'1m30s\').'
						}
					}
				},
				placement: {
					description: 'Restricciones y preferencias para que la plataforma seleccione un nodo físico donde ejecutar los contenedores del servicio.',
					properties: {
						constraints: {
							description: 'Restricciones de colocación para el servicio (p. ej., \'node.role==manager\').'
						},
						preferences: {
							description: 'Preferencias de colocación para el servicio.',
							items: {
								properties: {
									spread: {
										description: 'Distribuye las tareas uniformemente entre los valores de la etiqueta de nodo especificada.'
									}
								}
							}
						},
						max_replicas_per_node: {
							description: 'Número máximo de réplicas del servicio.'
						}
					}
				}
			}
		},
		generic_resources: {
			description: 'Recursos definidos por el usuario para los servicios, que permiten reservar recursos de hardware especializados.',
			items: {
				properties: {
					discrete_resource_spec: {
						description: 'Especificación para recursos discretos (contables).',
						properties: {
							kind: {
								description: 'Tipo de recurso (p. ej., \'GPU\', \'FPGA\', \'SSD\').'
							},
							value: {
								description: 'Número de recursos de este tipo a reservar.'
							}
						}
					}
				}
			}
		},
		devices: {
			description: 'Reservas de dispositivos para contenedores, que permiten a los servicios acceder a dispositivos de hardware específicos.',
			items: {
				properties: {
					capabilities: {
						description: 'Lista de capacidades que debe tener el dispositivo (p. ej., \'gpu\', \'compute\', \'utility\').'
					},
					count: {
						description: 'Número de dispositivos de este tipo a reservar.'
					},
					device_ids: {
						description: 'Lista de IDs de dispositivo específicos a reservar.'
					},
					driver: {
						description: 'Driver de dispositivo a usar (p. ej., \'nvidia\').'
					},
					options: {
						description: 'Opciones específicas del driver para el dispositivo.'
					}
				}
			}
		},
		gpus: {
			oneOf: {
				"0": {
					description: 'Usa todas las GPUs disponibles.'
				},
				"1": {
					description: 'Lista de dispositivos GPU específicos a usar.',
					items: {
						properties: {
							capabilities: {
								description: 'Lista de capacidades que debe tener la GPU (p. ej., \'compute\', \'utility\').'
							},
							count: {
								description: 'Número de GPUs a usar.'
							},
							device_ids: {
								description: 'Lista de IDs de dispositivos GPU específicos a usar.'
							},
							driver: {
								description: 'Driver de GPU a usar (p. ej., \'nvidia\').'
							},
							options: {
								description: 'Opciones específicas del driver para la GPU.'
							}
						}
					}
				}
			}
		},
		include: {
			description: 'Aplicación Compose o subproyectos a incluir.',
			oneOf: {
				"1": {
					properties: {
						path: {
							description: 'Ruta a los archivos de la aplicación o subproyecto Compose a incluir.'
						},
						env_file: {
							description: 'Ruta a los archivos de entorno a usar para definir valores predeterminados al interpolar variables en los archivos Compose que se analizan.'
						},
						project_directory: {
							description: 'Ruta para resolver las rutas relativas establecidas en el archivo Compose.'
						}
					}
				}
			}
		},
		network: {
			description: 'Configuración de red para la aplicación Compose.',
			properties: {
				name: {
					description: 'Nombre personalizado para esta red.'
				},
				driver: {
					description: 'Especifica qué driver se debe usar para esta red. El predeterminado es \'bridge\'.'
				},
				driver_opts: {
					description: 'Especifica opciones específicas del driver definidas como pares clave/valor.'
				},
				ipam: {
					description: 'Configuración personalizada de gestión de direcciones IP (IPAM) para esta red.',
					properties: {
						driver: {
							description: 'Driver IPAM personalizado, en lugar del predeterminado.'
						},
						config: {
							description: 'Lista de bloques de configuración IPAM.',
							items: {
								properties: {
									subnet: {
										description: 'Subred en formato CIDR que representa un segmento de red.'
									},
									ip_range: {
										description: 'Rango de IPs desde el que asignar las IPs de los contenedores.'
									},
									gateway: {
										description: 'Gateway IPv4 o IPv6 para la subred.'
									},
									aux_addresses: {
										description: 'Direcciones IPv4 o IPv6 auxiliares usadas por el driver de red.'
									}
								}
							}
						},
						options: {
							description: 'Opciones específicas del driver para el driver IPAM.'
						}
					}
				},
				external: {
					description: 'Especifica que esta red ya existe y fue creada fuera de Compose.',
					properties: {
						name: {
							description: 'Especifica el nombre de la red externa. Obsoleto: usa la propiedad \'name\' en su lugar.'
						}
					}
				},
				internal: {
					description: 'Crea una red aislada externamente.'
				},
				enable_ipv4: {
					description: 'Habilita el networking IPv4.'
				},
				enable_ipv6: {
					description: 'Habilita el networking IPv6.'
				},
				attachable: {
					description: 'Si es true, los contenedores independientes pueden conectarse a esta red.'
				},
				labels: {
					description: 'Añade metadatos a la red usando etiquetas.'
				}
			}
		},
		volume: {
			description: 'Configuración de volúmenes para la aplicación Compose.',
			properties: {
				name: {
					description: 'Nombre personalizado para este volumen.'
				},
				driver: {
					description: 'Especifica qué driver de volumen se debe usar para este volumen.'
				},
				driver_opts: {
					description: 'Especifica opciones específicas del driver.'
				},
				external: {
					description: 'Especifica que este volumen ya existe y fue creado fuera de Compose.',
					properties: {
						name: {
							description: 'Especifica el nombre del volumen externo. Obsoleto: usa la propiedad \'name\' en su lugar.'
						}
					}
				},
				labels: {
					description: 'Añade metadatos al volumen usando etiquetas.'
				}
			}
		},
		secret: {
			description: 'Configuración de secrets para la aplicación Compose.',
			properties: {
				name: {
					description: 'Nombre personalizado para este secret.'
				},
				environment: {
					description: 'Nombre de una variable de entorno de la que obtener el valor del secret.'
				},
				file: {
					description: 'Ruta a un archivo que contiene el valor del secret.'
				},
				external: {
					description: 'Especifica que este secret ya existe y fue creado fuera de Compose.',
					properties: {
						name: {
							description: 'Especifica el nombre del secret externo.'
						}
					}
				},
				labels: {
					description: 'Añade metadatos al secret usando etiquetas.'
				},
				driver: {
					description: 'Especifica qué driver de secret se debe usar para este secret.'
				},
				driver_opts: {
					description: 'Especifica opciones específicas del driver.'
				},
				template_driver: {
					description: 'Driver a usar para el templating del valor del secret.'
				}
			}
		},
		config: {
			description: 'Configuración de configs para la aplicación Compose.',
			properties: {
				name: {
					description: 'Nombre personalizado para este config.'
				},
				content: {
					description: 'Contenido inline del config.'
				},
				environment: {
					description: 'Nombre de una variable de entorno de la que obtener el valor del config.'
				},
				file: {
					description: 'Ruta a un archivo que contiene el valor del config.'
				},
				external: {
					description: 'Especifica que este config ya existe y fue creado fuera de Compose.',
					properties: {
						name: {
							description: 'Especifica el nombre del config externo. Obsoleto: usa la propiedad \'name\' en su lugar.'
						}
					}
				},
				labels: {
					description: 'Añade metadatos al config usando etiquetas.'
				},
				template_driver: {
					description: 'Driver a usar para el templating del valor del config.'
				}
			}
		},
		model: {
			description: 'Modelo de lenguaje para la aplicación Compose.',
			properties: {
				name: {
					description: 'Nombre personalizado para este modelo.'
				},
				model: {
					description: 'Modelo de lenguaje a ejecutar.'
				},
				runtime_flags: {
					description: 'Flags de runtime sin procesar a pasar al motor de inferencia.'
				}
			}
		},
		command: {
			description: 'Comando a ejecutar en el contenedor, que puede especificarse como cadena (forma shell) o matriz (forma exec).',
			oneOf: {
				"0": {
					description: 'No se especifica ningún comando; se usa el comando predeterminado del contenedor.'
				},
				"1": {
					description: 'Comando como cadena, que se ejecutará en un shell (p. ej., \'/bin/sh -c\').'
				},
				"2": {
					description: 'Comando como matriz de cadenas, que se ejecutará directamente sin shell.',
					items: {
						description: 'Parte del comando (ejecutable o argumento).'
					}
				}
			}
		},
		service_hook: {
			description: 'Configuración para los hooks del ciclo de vida del servicio, que son comandos ejecutados en puntos específicos del ciclo de vida de un contenedor.',
			properties: {
				command: {
					description: 'Comando a ejecutar como parte del hook.'
				},
				user: {
					description: 'Usuario con el que ejecutar el comando.'
				},
				privileged: {
					description: 'Indica si ejecutar el comando con privilegios extendidos.'
				},
				working_dir: {
					description: 'Directorio de trabajo para el comando.'
				},
				environment: {
					description: 'Variables de entorno para el comando.'
				}
			}
		},
		pre_start_hook: {
			description: 'Configuración para un contenedor init pre_start, que se ejecuta hasta completarse antes de que arranque el contenedor del servicio.',
			properties: {
				command: {
					description: 'Comando a ejecutar. Opcional cuando el entrypoint de la imagen elegida ya ejecuta el comando previsto.'
				},
				image: {
					description: 'Imagen usada para el contenedor efímero. Si se omite, se usa la imagen del servicio padre.'
				},
				user: {
					description: 'Usuario con el que ejecutar el comando. Por defecto, el usuario declarado en la imagen (o el usuario del servicio si se omite la imagen).'
				},
				privileged: {
					description: 'Indica si ejecutar el comando con privilegios extendidos.'
				},
				working_dir: {
					description: 'Directorio de trabajo para el comando. Por defecto, el directorio de trabajo del servicio.'
				},
				environment: {
					description: 'Variables de entorno para el comando. Se añaden a las del servicio o las sobrescriben.'
				},
				per_replica: {
					description: 'Indica si el hook se ejecuta una vez por réplica del servicio (true), o una vez para el servicio completo antes de que arranque cualquier réplica (false, el valor predeterminado).'
				}
			}
		},
		env_file: {
			oneOf: {
				"0": {
					description: 'Ruta a un archivo que contiene variables de entorno.'
				},
				"1": {
					description: 'Lista de rutas a archivos que contienen variables de entorno.',
					items: {
						oneOf: {
							"0": {
								description: 'Ruta a un archivo que contiene variables de entorno.'
							},
							"1": {
								description: 'Configuración detallada para un archivo de entorno.',
								properties: {
									path: {
										description: 'Ruta al archivo de entorno.'
									},
									format: {
										description: 'El atributo format permite usar formatos de archivo alternativos para env_file. Cuando no se establece, env_file se analiza según las reglas de Compose.'
									},
									required: {
										description: 'Indica si el archivo es obligatorio. Si es true y el archivo no existe, se lanzará un error.'
									}
								}
							}
						}
					}
				}
			}
		},
		label_file: {
			oneOf: {
				"0": {
					description: 'Ruta a un archivo que contiene etiquetas Docker.'
				},
				"1": {
					description: 'Lista de rutas a archivos que contienen etiquetas Docker.',
					items: {
						description: 'Ruta a un archivo que contiene etiquetas Docker.'
					}
				}
			}
		},
		string_or_list: {
			description: 'O una única cadena o una lista de cadenas.',
			oneOf: {
				"0": {
					description: 'Un valor de cadena único.'
				},
				"1": {
					description: 'Una lista de valores de cadena.'
				}
			}
		},
		list_of_strings: {
			description: 'Una lista de valores de cadena únicos.',
			items: {
				description: 'Un valor de cadena en la lista.'
			}
		},
		list_or_dict: {
			description: 'O un diccionario que mapea claves a valores, o una lista de cadenas.',
			oneOf: {
				"0": {
					description: 'Un diccionario que mapea claves a valores.',
					patternProperties: {
						".+": {
							description: 'Valor para la clave, que puede ser una cadena, número, booleano o null.'
						}
					}
				},
				"1": {
					description: 'Una lista de valores de cadena únicos.',
					items: {
						description: 'Un valor de cadena en la lista.'
					}
				}
			}
		},
		extra_hosts: {
			description: 'Hostnames adicionales a definir en el archivo /etc/hosts del contenedor.',
			oneOf: {
				"0": {
					description: 'lista que mapea hostnames a direcciones IP.',
					patternProperties: {
						".+": {
							oneOf: {
								"0": {
									description: 'Dirección IP para el hostname.'
								},
								"1": {
									description: 'Lista de direcciones IP para el hostname.',
									items: {
										description: 'Dirección IP para el hostname.'
									}
								}
							}
						}
					}
				},
				"1": {
					description: 'Lista de mapeos host:IP en el formato \'hostname:IP\'.',
					items: {
						description: 'Mapeo Host:IP en el formato \'hostname:IP\'.'
					}
				}
			}
		},
		blkio_limit: {
			description: 'Límite de IO de bloque para un dispositivo específico.',
			properties: {
				path: {
					description: 'Ruta al dispositivo (p. ej., \'/dev/sda\').'
				},
				rate: {
					description: 'Límite de tasa en bytes por segundo o en operaciones de IO por segundo.'
				}
			}
		},
		blkio_weight: {
			description: 'Peso de IO de bloque para un dispositivo específico.',
			properties: {
				path: {
					description: 'Ruta al dispositivo (p. ej., \'/dev/sda\').'
				},
				weight: {
					description: 'Peso relativo para el dispositivo, entre 10 y 1000.'
				}
			}
		},
		service_config_or_secret: {
			description: 'Configuración para los configs o secrets del servicio, que define cómo se montan en el contenedor.',
			items: {
				oneOf: {
					"0": {
						description: 'Nombre del config o secret al que conceder acceso.'
					},
					"1": {
						description: 'Configuración detallada para un config o secret.',
						properties: {
							source: {
								description: 'Nombre del config o secret tal como se define en la sección de nivel superior configs o secrets.'
							},
							target: {
								description: 'Ruta en el contenedor donde se montará el config o secret. Por defecto /<source> para los configs y /run/secrets/<source> para los secrets.'
							},
							uid: {
								description: 'UID del archivo en el contenedor. El valor por defecto es 0 (root).'
							},
							gid: {
								description: 'GID del archivo en el contenedor. El valor por defecto es 0 (root).'
							},
							mode: {
								description: 'Modo de permisos de archivo dentro del contenedor, en octal. El valor por defecto es 0444 para los configs y 0400 para los secrets.'
							}
						}
					}
				}
			}
		},
		ulimits: {
			description: 'Opciones de ulimit del contenedor, que controlan los límites de recursos de los procesos dentro del contenedor.',
			patternProperties: {
				"^[a-z]+$": {
					oneOf: {
						"0": {
							description: 'Valor único para los límites soft y hard.'
						},
						"1": {
							description: 'Límites soft y hard separados.',
							properties: {
								hard: {
									description: 'Límite hard para el tipo ulimit. Es el valor máximo permitido.'
								},
								soft: {
									description: 'Límite soft para el tipo ulimit. Es el valor que realmente se aplica.'
								}
							}
						}
					}
				}
			}
		}
	},
	ui: {
		add_item: 'Añadir elemento',
		add_object: 'Añadir objeto',
		add_entry: 'Añadir entrada',
		empty_array: 'Sin elementos',
		empty_object: 'Sin entradas'
	}
} satisfies LocaleMessageValue
