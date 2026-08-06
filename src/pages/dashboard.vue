<!-- Layout Dashboard -->

<script setup lang="ts">
import { useSideberMenu } from '@/composables/useNavigationMenu'
import { ICONS } from '@/utils/icons'

import idmarinasLogo from '@/assets/logos/idmarinas.png'

const { navigationMenu, navigationMenuFooter, searchGroups } = useSideberMenu()

const socials: {
	[key: string]: {
		icon: string
		label: string
		url: string
	}
} = {
	x: {
		icon: ICONS.social.x,
		label: 'X',
		url: 'https://x.com/idmarinas',
	},
	reddit: {
		icon: ICONS.social.reddit,
		label: 'Reddit',
		url: 'https://reddit.com/u/idmarinas',
	},
	paypal: {
		icon: ICONS.social.paypal,
		label: 'Paypal',
		url: 'https://www.paypal.me/idmarinas',
	},
	bitly: {
		icon: ICONS.social.bitly,
		label: 'Bitly',
		url: 'https://bit.ly/m/idmarinas',
	},
	github: {
		icon: ICONS.social.github,
		label: 'Github',
		url: 'https://github.com/sponsors/idmarinas',
	},
	linkedin: {
		icon: ICONS.social.linkedin,
		label: 'Linkedin',
		url: 'https://linkedin.com/in/idmarinas',
	},
}
</script>

<template>
	<UDashboardGroup storage="local" unit="rem">
		<UDashboardSidebar
			id="default"
			collapsible
			resizable
			:min-size="15"
			:default-size="20"
			:ui="{ footer: 'border-t border-default flex-col' }"
		>
			<template #header="{ collapsed }">
				<DeployerLogo :collapsed="collapsed" as-link />
				<!-- <ProjectsMenu :collapsed="collapsed" /> -->
			</template>

			<template #default="{ collapsed }">
				<UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" tooltip />

				<UNavigationMenu :collapsed="collapsed" :items="navigationMenu" />

				<div class="flex-1" />
				<UNavigationMenu :collapsed="collapsed" :items="navigationMenuFooter" />
			</template>

			<template #footer="{ collapsed }">
				<DeployerAppMenu :collapsed="collapsed" />
				<USeparator class="mt-1 mb-4" />
				<p v-if="!collapsed" class="flex gap-2 items-center">
					<UTooltip v-for="(social, label) in socials" :key="label" :text="social.label" arrow :delay-duration="300">
						<UButton
							:icon="social.icon"
							variant="ghost"
							color="neutral"
							:to="social.url"
							target="_blank"
							:aria-label="social.label"
						/>
					</UTooltip>
				</p>
				<p class="text-muted text-sm">
					<span v-if="!collapsed">IDMarinas © 2026-{{ new Date().getFullYear() }}</span>
					<span v-else>
						<UTooltip :text="`IDMarinas © ${new Date().getFullYear()}`">
							<UAvatar :src="idmarinasLogo" />
						</UTooltip>
					</span>
				</p>
			</template>
		</UDashboardSidebar>

		<UDashboardSearch :groups="searchGroups" />

		<RouterView />
	</UDashboardGroup>
</template>
