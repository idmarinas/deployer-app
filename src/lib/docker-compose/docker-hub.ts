import { invoke } from '@tauri-apps/api/core'

import { parseComposeYaml } from './parser'

// ============================================================================
// Types
// ============================================================================

interface DockerHubImageResult {
	name: string
	description: string
	pull_count: number
	star_count: number
	official: boolean
}

interface DockerHubTagResult {
	name: string
	full_size: number
	last_updated: string
}

// ============================================================================
// Search
// ============================================================================

export async function searchDockerHub(query: string): Promise<DockerHubImageResult[]> {
	const trimmed = query.trim()
	if (!trimmed) return []

	try {
		return await invoke<DockerHubImageResult[]>('get_docker_hub_search_cache', {
			query: trimmed,
		})
	} catch (e) {
		console.error('[docker-hub] search error:', e)
		return []
	}
}

// ============================================================================
// Tags
// ============================================================================

export async function fetchDockerHubTags(imageName: string): Promise<DockerHubTagResult[]> {
	const trimmed = imageName.trim()
	if (!trimmed) return []

	try {
		return await invoke<DockerHubTagResult[]>('get_docker_hub_tags_cache', {
			imageName: trimmed,
		})
	} catch (e) {
		console.error('[docker-hub] tags error:', e)
		return []
	}
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates that all images in a compose YAML exist in Docker Hub cache.
 * Returns an array of invalid image strings (e.g. "nginx:99.99.99").
 * Empty array means all images are valid.
 */
export async function validateComposeImages(composeContent: string): Promise<string[]> {
	if (!composeContent?.trim()) return []

	const compose = parseComposeYaml(composeContent)
	const invalid: string[] = []

	for (const [, service] of Object.entries(compose.services)) {
		const image = service.image
		if (!image) continue

		const colonIdx = image.indexOf(':')
		const imageName = colonIdx > 0 ? image.substring(0, colonIdx) : image
		const tag = colonIdx > 0 ? image.substring(colonIdx + 1) : 'latest'

		const tags = await fetchDockerHubTags(imageName)

		if (tags.length === 0) {
			invalid.push(image)
			continue
		}

		const tagNames = new Set(tags.map(t => t.name))
		if (!tagNames.has(tag)) {
			invalid.push(image)
		}
	}

	return invalid
}

// ============================================================================
// Cache cleanup
// ============================================================================

export async function cleanupDockerHubCache(olderThanHours = 24): Promise<void> {
	await invoke('cleanup_docker_hub_cache', { olderThanHours }).catch(() => {})
}
