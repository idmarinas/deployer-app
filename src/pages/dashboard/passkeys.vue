<script setup lang="ts">
import { useToolbarForPasskeysModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

const { toolbarContent } = useToolbarForPasskeysModule()
</script>

<template>
	<UDashboardPanel id="passkeys">
		<template #header>
			<UDashboardNavbar icon="i-tabler-key" :title="t('pages.passkeys.title')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>

				<template #right>
					<UButton
						v-if="!route.path.endsWith('/add')"
						to="/dashboard/passkeys/add"
						icon="i-tabler-plus"
						variant="outline"
						:label="t('components.navigation.add.passkey.label')"
					/>
				</template>
			</UDashboardNavbar>

			<!-- Solo muestra el toolbar si tiene contenido -->
			<UDashboardToolbar v-if="toolbarContent" class="flex gap-2 justify-between">
				<component v-for="(content, index) in toolbarContent" :key="index" :is="content" />
			</UDashboardToolbar>
		</template>

		<template #body>
			<RouterView />
		</template>
	</UDashboardPanel>
</template>
