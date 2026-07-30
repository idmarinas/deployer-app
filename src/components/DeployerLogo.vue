<script setup lang="ts">
import logo from '@/assets/logos/deployerapp.png'

withDefaults(
	defineProps<{
		collapsed?: boolean
		asLink?: boolean
	}>(),
	{
		collapsed: false,
		asLink: false,
	},
)
</script>

<template>
	<div v-if="!asLink" class="flex items-center gap-2 justify-between w-full">
		<UAvatar :src="logo" :size="collapsed ? 'lg' : 'xl'" :ui="{ root: 'rounded-none bg-transparent' }" />
		<span
			v-if="!collapsed"
			class="bg-linear-to-r from-primary-200 via-primary-500 to-primary-600 bg-clip-text text-3xl font-extrabold text-transparent"
		>
			DeployerApp
		</span>
	</div>
	<RouterLink v-else :to="{ name: 'dashboard-home' }" class="w-full px-3">
		<div class="flex items-center gap-2 justify-between w-full">
			<UAvatar :src="logo" :size="collapsed ? 'lg' : 'xl'" :ui="{ root: 'rounded-none bg-transparent' }" />
			<span
				v-if="!collapsed"
				class="bg-linear-to-r from-primary-200 via-primary-500 to-primary-600 bg-clip-text text-3xl font-extrabold text-transparent"
			>
				DeployerApp
			</span>
		</div>
	</RouterLink>
</template>

<style scoped>
.router-link-exact-active {
	position: relative;
	background: color-mix(in srgb, var(--color-primary-500) 8%, transparent);
	border-radius: 0.5rem;
	animation:
		logo-enter 0.5s ease-out,
		logo-breathe 4s ease-in-out 0.5s infinite;
}

.router-link-exact-active::before {
	content: '';
	position: absolute;
	left: 4px;
	top: 50%;
	translate: 0 -50%;
	width: 3px;
	height: 0;
	background: linear-gradient(to bottom, var(--color-primary-300), var(--color-primary-600));
	border-radius: 0 3px 3px 0;
	animation: logo-bar-grow 0.4s 0.15s ease-out forwards;
}

.router-link-exact-active :deep(.rounded-none) {
	animation: logo-glow 3s ease-in-out infinite;
}

.router-link-exact-active span {
	background-size: 200% 100% !important;
	animation: logo-shimmer 3s linear infinite;
}

@keyframes logo-bar-grow {
	to {
		height: 60%;
	}
}

@keyframes logo-glow {
	0%,
	100% {
		filter: drop-shadow(0 0 0 color-mix(in srgb, var(--color-primary-500) 30%, transparent));
	}
	50% {
		filter: drop-shadow(0 0 8px var(--color-primary-500));
	}
}

@keyframes logo-shimmer {
	0% {
		background-position: 100% 0;
	}
	100% {
		background-position: -100% 0;
	}
}

@keyframes logo-enter {
	from {
		opacity: 0;
		transform: scale(0.97);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes logo-breathe {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.008);
	}
}
</style>
