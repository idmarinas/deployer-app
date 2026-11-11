export { parseTemplate, unescapeTemplate } from './parser'
export type { ParsedTemplate } from './parser'
export { REDACTED_MARKER, collectSecretValues, redactSecrets } from './redact'
export { findReferences, interpolateSegments, interpolateString, interpolateValue, validateTemplate } from './resolver'
export { INTERPOLATION_SCOPES, InterpolationError, isInterpolationScope, isInterpolationVariable } from './types'
export type {
	InterpolationErrorCode,
	InterpolationIssue,
	InterpolationMessage,
	InterpolationMessageKey,
	InterpolationOptions,
	InterpolationRoots,
	InterpolationScope,
	InterpolationSegment,
	InterpolationVariable,
	TemplateReference,
} from './types'
