import { parse, stringify } from 'yaml'

/** Serializa un objeto a YAML (usa el bloque estándar de la librería `yaml`). */
export function toYaml(data: unknown): string {
	return stringify(data, {
		aliasDuplicateObjects: false,
		indentSeq: false,
	})
}

/** Deserializa texto YAML a un valor JS. Lanza un error si la sintaxis no es válida. */
export function parseYaml(text: string): unknown {
	return parse(text)
}