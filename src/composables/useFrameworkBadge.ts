import type { BadgeProps } from '@nuxt/ui'

import { h } from 'vue'

import UBadge from '@nuxt/ui/components/Badge.vue'

import { ICONS } from '@/utils/icons'

export function useFrameworkBadge(framework?: string, props?: BadgeProps) {
	const frameworks: Record<string, BadgeProps> = {
		symfony: {
			label: 'Symfony',
			class: 'bg-black text-white',
			variant: 'soft',
			size: 'sm',
			icon: ICONS.framework.symfony,
		},
		laravel: {
			label: 'Laravel',
			class: 'bg-[#FF2D20] text-white',
			variant: 'soft',
			size: 'sm',
			icon: ICONS.framework.laravel,
		},
		nextjs: {
			label: 'Next.js',
			class: 'bg-black text-white',
			variant: 'soft',
			size: 'sm',
			icon: ICONS.framework.nextjs,
		},
		vuejs: {
			label: 'Vue.js',
			class: 'bg-[#4FC08D] text-white',
			variant: 'soft',
			size: 'sm',
			icon: ICONS.framework.vuejs,
		},
		generic: {
			label: 'Generic',
			color: 'neutral',
			variant: 'soft',
			size: 'sm',
			icon: ICONS.framework.generic,
		},
		unknown: {
			label: 'Unknown',
			color: 'neutral',
			variant: 'outline',
			size: 'sm',
			icon: ICONS.framework.unknown,
		},
	}
	let badgeProps = frameworks.unknown

	if (typeof framework === 'string') {
		badgeProps = frameworks[framework] || frameworks.unknown
	}

	return h(UBadge, {
		...badgeProps,
		...props,
	})
}
