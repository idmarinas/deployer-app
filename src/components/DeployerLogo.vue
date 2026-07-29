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
	<RouterLink v-else :to="{ name: 'dashboard-home' }" class="w-full">
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
