import type { LocaleMessageValue } from 'vue-i18n'

export default {
	hosts: {
		error: {
			context_failed: 'No se pudo conectar con el servidor. \n Razón: {reason}',
			no_database_path: 'No se pudo encontrar la base de datos.',
			store_error: 'No se pudo guardar el servidor. \n Razón: {reason}',
			not_found: 'No se pudo encontrar el servidor con ID: {id}.',
			database_error: 'No se pudo acceder a la base de datos. \n Razón: {reason}',
			connection_failed: 'No se pudo conectar con el servidor. \n Razón: {reason}',
			connection_timeout: 'No se pudo conectar con el servidor. Tiempo de espera {timeout} agotado.',
		},
		success: {

		},
	},
	passkeys: {
		error: {
			not_found: 'Passkey no encontrada',
			public_key_failed: 'No se pudo extraer la clave pública. \n Razón: {reason}',
			authorized_keys_not_found: 'El archivo "~/.ssh/authorized_keys" no existe en el servidor.',
			public_key_not_in_authorized_keys: 'La clave pública no está registrada en "~/.ssh/authorized_keys" del servidor.',
		},
		success: {
			public_key_exported: 'Clave pública exportada exitosamente',
			public_key_removed: 'Clave pública eliminada exitosamente',
		},
	},
} satisfies LocaleMessageValue