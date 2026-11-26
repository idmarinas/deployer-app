import type { LocaleMessageValue } from 'vue-i18n'

export default {
	errors: {
		key_format:
			'La clave debe empezar por una letra minúscula y solo puede contener letras minúsculas, números y guiones bajos.',
		key_duplicate: 'La clave «{key}» está repetida.',
		label_required: 'La etiqueta es obligatoria.',
		options_required: 'Un parámetro de tipo «select» debe tener al menos una opción.',
		option_value_required: 'El valor de una opción no puede estar vacío.',
		option_duplicate: 'El valor de la opción «{value}» está repetido.',
		default_type: 'El valor por defecto no coincide con el tipo del parámetro.',
		default_scope: 'El valor por defecto solo puede referenciar variables globales (raíz «global»).',
		too_many: 'No se pueden definir más de {max} parámetros de entrada.',
		value_required: 'El parámetro «{label}» es obligatorio.',
		value_invalid: 'El valor del parámetro «{label}» no es válido para el tipo «{type}».',
		default_unknown: 'La variable «{path}» no existe o fue eliminada.',
		default_disabled: 'La variable «{path}» está deshabilitada.',
		default_secret: 'La variable «{path}» es secreta y no puede usarse como valor por defecto.',
	},
} satisfies LocaleMessageValue
