import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Añadir comando',
		edit: 'Editar comando',
	},
	key: {
		label: 'Clave',
		help: 'Identificador único del comando (autogenerado desde el nombre)',
		hint: 'Solo minúsculas, números y guiones bajos. No se puede cambiar al editar.',
	},
	name: {
		label: 'Nombre',
		help: 'Nombre único que identificará al comando',
	},
	description: {
		label: 'Descripción',
		help: 'Descripción opcional para recordar el propósito del comando',
	},
	command: {
		label: 'Comando',
		help: 'Comando bash que se ejecutará en el servidor remoto vía SSH',
		placeholder: '# Ej: uptime -p',
	},
	parser: {
		label: 'Parser de salida',
		help: 'Cómo se interpreta la salida del comando para mostrarla y reutilizarla',
		select: {
			raw: {
				label: 'Sin parseo',
				description: 'Devuelve la salida en crudo (texto sin procesar).',
			},
			json: {
				label: 'JSON',
				description: 'Parsea la salida como JSON (objeto o array).',
			},
			line_based: {
				label: 'Líneas (reglas)',
				description: 'Extrae valores con reglas regex aplicadas línea a línea.',
			},
			regex: {
				label: 'Expresiones regulares',
				description: 'Extrae grupos de captura con patrones regex globales.',
			},
		},
		line_based: {
			title: 'Reglas por línea',
			add_rule: 'Añadir regla',
			match: 'Expresión regular',
			match_placeholder: '^CPU:\\s*([0-9.]+)%$',
			key: 'Clave',
			key_placeholder: 'cpu',
			transform: 'Transformación',
		},
		regex: {
			title: 'Patrones regex globales',
			add_pattern: 'Añadir patrón',
			pattern: 'Patrón',
			pattern_placeholder: 'CPU:\\s*([0-9.]+)%',
			flags: 'Flags',
			groups_title: 'Grupos de captura',
			add_group: 'Añadir grupo',
			extract_groups: 'Extraer grupos',
			groups_help: 'Asocia cada grupo de captura con la clave que se guardará en el resultado.',
			group_key: 'Clave',
			group_index: 'Índice de grupo',
			groups_empty: 'Sin grupos definidos.',
		},
		transform: {
			string: 'Texto',
			number: 'Número',
			boolean: 'Booleano',
		},
		rule: 'Regla',
		pattern: 'Patrón',
		remove: 'Eliminar',
	},
	timeout: {
		label: 'Timeout',
		help: 'Tiempo máximo de ejecución en segundos (por defecto 300)',
	},
} satisfies LocaleMessageValue