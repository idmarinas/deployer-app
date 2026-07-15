import { DESCRIPTION_MAX_LENGTH } from '@/utils/description'
import * as z from 'zod'

/**
 * Schema Zod para el campo description (JSONContent serializado).
 * Acepta string vacío, undefined, o JSONContent válido.
 */
export function descriptionField() {
	return z.string().max(DESCRIPTION_MAX_LENGTH).optional()
}
