import type { BadgeProps } from '@nuxt/ui'

import { h } from 'vue'

import UBadge from '@nuxt/ui/components/Badge.vue'

export function useFrameworkBadge(framework?: string, props?: BadgeProps) {
	const frameworks: Record<string, BadgeProps> = {
		symfony: {
			label: 'Symfony',
			class: 'bg-black text-white',
			variant: 'soft',
			size: 'sm',
			icon: 'i-tabler-brand-symfony',
		},
		laravel: {
			label: 'Laravel',
			class: 'bg-[#FF2D20] text-white',
			variant: 'soft',
			size: 'sm',
			icon: 'i-tabler-brand-laravel',
		},
		nextjs: {
			label: 'Next.js',
			class: 'bg-black text-white',
			variant: 'soft',
			size: 'sm',
			icon: 'i-tabler-brand-nextjs',
		},
		generic: {
			label: 'Generic',
			color: 'neutral',
			variant: 'soft',
			size: 'sm',
			icon: 'i-tabler-code',
		},
	}
	let badgeProps = frameworks.generic

	if (typeof framework === 'string') {
		badgeProps = frameworks[framework] || frameworks.generic
	}

	return h(UBadge, {
		...badgeProps,
		...props,
	})
}
