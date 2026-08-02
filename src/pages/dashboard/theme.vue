<script setup lang="ts">
definePage({
	name: 'dashboard-theme',
})
</script>

<template>
	<UDashboardPanel id="passkeys">
		<template #header>
			<UDashboardNavbar icon="i-tabler-color" title="Theme Preview">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<ThemePreview />
		</template>
	</UDashboardPanel>
</template>
