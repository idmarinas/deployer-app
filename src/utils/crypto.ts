export const BLANK_VALUE = '__BLANK__e5362baf-c777-4d57-a609-6eaf1f9e87f6'

export function isBlankValue(value: string): boolean {
  return value === BLANK_VALUE
}

export function isEncryptedValue(value: string): boolean {
  return value.startsWith('ENC:') || value === BLANK_VALUE
}
