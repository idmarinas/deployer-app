<script setup lang="ts">
import type { ContextMenuItem, DropdownMenuItem, NavigationMenuItem, TableColumn } from '@nuxt/ui'
import { h, ref, resolveComponent } from 'vue'

const toast = useToast()

// ── Estados: formulario ───────────────────────────────────────────────────
const textValue = ref('deployer-app')
const textareaValue = ref('Configuración de despliegue automatizado para entornos cloud.')
const selectValue = ref('laravel')
const checkboxValue = ref(true)
const switchValue = ref(true)
const progressValue = ref(65)
const modalOpen = ref(false)

// ── Navegación de prueba ────────────────────────────────────────────────--
const navItems: NavigationMenuItem[][] = [
	[
		{ label: 'Design System', icon: 'i-tabler-palette', active: true },
		{ label: 'Servidores', icon: 'i-tabler-server' },
		{ label: 'Despliegues', icon: 'i-tabler-rocket' },
		{ label: 'Configuración', icon: 'i-tabler-settings' },
	],
]

// ── Pestañas de prueba ──────────────────────────────────────────────────--
const tabItems = [
	{ label: 'General', icon: 'i-tabler-settings' },
	{ label: 'Avanzado', icon: 'i-tabler-adjustments' },
	{ label: 'Historial', icon: 'i-tabler-history' },
]

// ── Tabla de prueba ────────────────────────────────────────────────────--
type DeploymentRow = {
	id: number
	project: string
	host: string
	status: 'success' | 'warning' | 'error' | 'running'
	duration: string
}

const tableData: DeploymentRow[] = [
	{ id: 1, project: 'deployer-app', host: 'prod-01.eu', status: 'success', duration: '12.4s' },
	{ id: 2, project: 'api-gateway', host: 'staging-02.eu', status: 'running', duration: '—' },
	{ id: 3, project: 'billing-service', host: 'prod-03.us', status: 'warning', duration: '34.1s' },
	{ id: 4, project: 'auth-service', host: 'prod-01.eu', status: 'error', duration: '8.9s' },
]

const statusColor: Record<DeploymentRow['status'], 'success' | 'warning' | 'error' | 'info'> = {
	success: 'success',
	warning: 'warning',
	error: 'error',
	running: 'info',
}

const tableColumns: TableColumn<DeploymentRow>[] = [
	{ accessorKey: 'project', header: 'Proyecto' },
	{ accessorKey: 'host', header: 'Host' },
	{
		accessorKey: 'status',
		header: 'Estado',
		cell: ({ row }) =>
			h(resolveComponent('UBadge') as any, {
				label: row.original.status.toUpperCase(),
				color: statusColor[row.original.status],
				variant: 'subtle',
				class: 'font-pcb',
			}),
	},
	{ accessorKey: 'duration', header: 'Duración' },
]

// ── Dropdown / Context menu de prueba ───────────────────────────────────--
const dropdownItems: DropdownMenuItem[][] = [
	[
		{ label: 'Ver detalles', icon: 'i-tabler-eye' },
		{ label: 'Re-ejecutar', icon: 'i-tabler-reload' },
	],
	[{ label: 'Eliminar', icon: 'i-tabler-trash', color: 'error' }],
]

const contextMenuItems: ContextMenuItem[][] = [
	[
		{ label: 'Copiar ID', icon: 'i-tabler-copy' },
		{ label: 'Abrir log', icon: 'i-tabler-file-text' },
	],
	[{ label: 'Cancelar deploy', icon: 'i-tabler-player-stop', color: 'error' }],
]

// ── Toasts de prueba ────────────────────────────────────────────────────--
// Nota: se prueban TAMBIÉN sin icono para confirmar que cada color se
// distingue por sí mismo (fondo + traza + borde), no solo por el icono.
function fireToast(color: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral', withIcon = true) {
	const presets: Record<typeof color, { title: string; description: string; icon: string }> = {
		primary: { title: 'Deploy iniciado', description: 'Pipeline en cola de ejecución.', icon: 'i-tabler-rocket' },
		success: {
			title: 'Deploy completado',
			description: 'Todas las tareas finalizaron correctamente.',
			icon: 'i-tabler-check',
		},
		warning: {
			title: 'Configuración obsoleta',
			description: 'Revisa las variables de entorno.',
			icon: 'i-tabler-alert-triangle',
		},
		error: {
			title: 'Fallo de conexión',
			description: 'No se pudo alcanzar el servidor remoto.',
			icon: 'i-tabler-server-off',
		},
		info: {
			title: 'Nueva versión disponible',
			description: 'DeployerApp v1.2.0 está lista.',
			icon: 'i-tabler-info-circle',
		},
		neutral: {
			title: 'Registro guardado',
			description: 'Los cambios se han almacenado localmente.',
			icon: 'i-tabler-database',
		},
	}
	const preset = presets[color]
	toast.add({
		title: preset.title,
		description: preset.description,
		icon: withIcon ? preset.icon : undefined,
		color,
	})
}
</script>

<template>
	<div class="space-y-8 p-6 max-w-6xl mx-auto">
		<!-- Encabezado de la galería -->
		<div class="border-b border-default pb-6">
			<h1
				class="text-3xl font-bold font-pcb bg-linear-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent"
			>
				Design System Gallery
			</h1>
			<p class="text-dimmed mt-1 text-sm">
				Prueba visual interactiva de todos los componentes personalizados — DeployerApp UI (Command Module)
			</p>
		</div>

		<!-- Grid principal de componentes -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- SECCIÓN 1: BOTONES — Todas las variantes -->
			<UCard>
				<template #header>
					<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
						UButton — Variantes
					</h2>
				</template>
				<div class="space-y-4">
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">color="primary"</p>
						<div class="flex flex-wrap gap-2">
							<UButton label="Solid" color="primary" variant="solid" />
							<UButton label="Outline" color="primary" variant="outline" />
							<UButton label="Soft" color="primary" variant="soft" />
							<UButton label="Ghost" color="primary" variant="ghost" />
							<UButton label="Subtle" color="primary" variant="subtle" />
							<UButton label="Link" color="primary" variant="link" />
						</div>
					</div>
					<USeparator />
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">color="secondary"</p>
						<div class="flex flex-wrap gap-2">
							<UButton label="Solid" color="secondary" variant="solid" />
							<UButton label="Outline" color="secondary" variant="outline" />
							<UButton label="Soft" color="secondary" variant="soft" />
							<UButton label="Ghost" color="secondary" variant="ghost" />
							<UButton label="Subtle" color="secondary" variant="subtle" />
						</div>
					</div>
					<USeparator />
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">color="neutral"</p>
						<div class="flex flex-wrap gap-2">
							<UButton label="Solid" color="neutral" variant="solid" />
							<UButton label="Outline" color="neutral" variant="outline" />
							<UButton label="Soft" color="neutral" variant="soft" />
							<UButton label="Ghost" color="neutral" variant="ghost" />
							<UButton label="Subtle" color="neutral" variant="subtle" />
						</div>
					</div>
					<USeparator />
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">success / warning / error (solid)</p>
						<div class="flex flex-wrap gap-2">
							<UButton label="Success" color="success" variant="solid" />
							<UButton label="Warning" color="warning" variant="solid" />
							<UButton label="Error" color="error" variant="solid" />
						</div>
					</div>
					<USeparator />
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">Tamaños (xs → xl)</p>
						<div class="flex flex-wrap items-center gap-2">
							<UButton label="xs" color="primary" size="xs" />
							<UButton label="sm" color="primary" size="sm" />
							<UButton label="md" color="primary" size="md" />
							<UButton label="lg" color="primary" size="lg" />
							<UButton label="xl" color="primary" size="xl" />
						</div>
					</div>
					<USeparator />
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">
							Con icono / loading / disabled — fíjate en la esquina recortada: la sombra (<code class="text-primary-500"
								>drop-shadow</code
							>) debe seguir la silueta diagonal sin "esquina fantasma"
						</p>
						<div class="flex flex-wrap gap-2">
							<UButton label="Deploy" icon="i-tabler-rocket" color="primary" />
							<UButton label="Cargando" color="primary" loading />
							<UButton label="Deshabilitado" color="primary" disabled />
							<UButton icon="i-tabler-settings" color="neutral" variant="ghost" square aria-label="Ajustes" />
							<UButton icon="i-tabler-rocket" color="success" square aria-label="Lanzar" />
						</div>
					</div>
				</div>
			</UCard>

			<!-- SECCIÓN 2: BADGES — Todas las variantes -->
			<UCard>
				<template #header>
					<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
						UBadge — Variantes
					</h2>
				</template>
				<div class="space-y-4">
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">color="primary"</p>
						<div class="flex flex-wrap gap-2">
							<UBadge label="Solid" color="primary" variant="solid" />
							<UBadge label="Outline" color="primary" variant="outline" />
							<UBadge label="Soft" color="primary" variant="soft" />
							<UBadge label="Subtle" color="primary" variant="subtle" />
						</div>
					</div>
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">color="secondary"</p>
						<div class="flex flex-wrap gap-2">
							<UBadge label="Solid" color="secondary" variant="solid" />
							<UBadge label="Outline" color="secondary" variant="outline" />
							<UBadge label="Soft" color="secondary" variant="soft" />
							<UBadge label="Subtle" color="secondary" variant="subtle" />
						</div>
					</div>
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">Estados del sistema — solid</p>
						<div class="flex flex-wrap gap-2">
							<UBadge label="Success" color="success" variant="solid" />
							<UBadge label="Warning" color="warning" variant="solid" />
							<UBadge label="Error" color="error" variant="solid" />
							<UBadge label="Info" color="info" variant="solid" />
							<UBadge label="Neutral" color="neutral" variant="solid" />
						</div>
					</div>
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">Estados del sistema — subtle</p>
						<div class="flex flex-wrap gap-2">
							<UBadge label="Success" color="success" variant="subtle" />
							<UBadge label="Warning" color="warning" variant="subtle" />
							<UBadge label="Error" color="error" variant="subtle" />
							<UBadge label="Info" color="info" variant="subtle" />
							<UBadge label="Neutral" color="neutral" variant="subtle" />
						</div>
					</div>
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">Tamaños (xs → lg)</p>
						<div class="flex flex-wrap items-center gap-2">
							<UBadge label="xs" color="primary" size="xs" />
							<UBadge label="sm" color="primary" size="sm" />
							<UBadge label="md" color="primary" size="md" />
							<UBadge label="lg" color="primary" size="lg" />
						</div>
					</div>
					<USeparator />
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">
							Animación de atención — <code class="text-primary-500">pcb-animate-blink</code> ya NO es el comportamiento
							por defecto de <code class="text-primary-500">error/solid</code>; se añade manualmente cuando se quiere
							marcar algo en concreto
						</p>
						<div class="flex flex-wrap items-center gap-2">
							<UBadge label="Error normal" color="error" variant="solid" />
							<UBadge label="Crítico" color="error" variant="solid" class="pcb-animate-blink" />
						</div>
					</div>
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">
							Dentro de <code class="text-primary-500">UFieldGroup</code> — costuras rectas + tamaño del grupo (horizontal y
							vertical)
						</p>
						<UFieldGroup class="mb-2" size="md">
							<UBadge label="Producción" color="success" variant="solid" />
							<UBadge label="Staging" color="warning" variant="solid" />
							<UBadge label="Dev" color="error" variant="solid" />
							<UBadge icon="i-tabler-server-off" color="neutral" variant="outline" />
						</UFieldGroup>
						<UFieldGroup orientation="vertical" size="sm" class="w-fit">
							<UBadge label="Arriba" color="success" variant="soft" />
							<UBadge label="Medio" color="info" variant="soft" />
							<UBadge label="Abajo" color="neutral" variant="soft" />
						</UFieldGroup>
					</div>
				</div>
			</UCard>

			<!-- SECCIÓN 3: FORMULARIO & ENTRADAS -->
			<UCard>
				<template #header>
					<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
						Form Inputs & Controls
					</h2>
				</template>
				<div class="space-y-4">
					<UFormField label="UInput" help="Esquina recortada + traza activa en focus">
						<UInput v-model="textValue" placeholder="Escribe aquí..." class="w-full" />
					</UFormField>

					<UFormField label="UInput — error">
						<UInput placeholder="Campo inválido" color="error" class="w-full" />
					</UFormField>

					<UFormField label="UTextarea">
						<UTextarea v-model="textareaValue" :rows="3" class="w-full" />
					</UFormField>

					<UFormField label="USelect">
						<USelect
							v-model="selectValue"
							:items="[
								{ label: 'Laravel', value: 'laravel' },
								{ label: 'Symfony', value: 'symfony' },
								{ label: 'Next.js', value: 'nextjs' },
							]"
							value-key="value"
							class="w-full"
						/>
					</UFormField>

					<div class="flex items-center gap-6 pt-1">
						<UFormField label="UCheckbox">
							<UCheckbox v-model="checkboxValue" label="LED activo" />
						</UFormField>
						<UFormField label="USwitch">
							<USwitch v-model="switchValue" label="Modo neón" />
						</UFormField>
					</div>

					<div class="flex items-center gap-6">
						<UCheckbox label="Sin marcar" />
						<UCheckbox label="Deshabilitado" disabled />
					</div>
				</div>
			</UCard>

			<!-- SECCIÓN 4: NAVEGACIÓN & TABS -->
			<UCard>
				<template #header>
					<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
						Navigation & Tabs
					</h2>
				</template>
				<div class="space-y-6">
					<div>
						<p class="text-xs text-dimmed font-pcb mb-3">UNavigationMenu — indicador lateral (traza activa)</p>
						<UNavigationMenu orientation="vertical" :items="navItems" class="w-full" />
					</div>
					<USeparator />
					<div>
						<p class="text-xs text-dimmed font-pcb mb-3">UTabs — indicador "puente conductor"</p>
						<UTabs :items="tabItems" class="w-full" />
					</div>
				</div>
			</UCard>

			<!-- SECCIÓN 5: INDICADORES & SEPARADORES -->
			<UCard>
				<template #header>
					<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
						Indicators & Separators
					</h2>
				</template>
				<div class="space-y-4">
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">UProgress — flujo de energía</p>
						<UProgress v-model="progressValue" class="w-full" />
						<p class="text-xs text-dimmed font-pcb mt-1">{{ progressValue }}% completado</p>
					</div>
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">UProgress — indeterminado</p>
						<UProgress class="w-full" />
					</div>
					<USeparator label="CON LABEL" />
					<USeparator />
					<USeparator color="primary" />
				</div>
			</UCard>

			<!-- SECCIÓN 6: ALERTAS -->
			<UCard>
				<template #header>
					<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
						UAlert — Variantes
					</h2>
				</template>
				<div class="space-y-3">
					<UAlert
						title="Despliegue completado"
						description="El servidor de producción ha procesado todas las tareas correctamente."
						color="success"
						variant="soft"
						icon="i-tabler-check"
					/>
					<UAlert
						title="Advertencia de configuración"
						description="Detectada configuración obsoleta en el servidor de staging."
						color="warning"
						variant="subtle"
						icon="i-tabler-alert-triangle"
					/>
					<UAlert
						title="Error de conexión SSH"
						description="No se pudo establecer conexión con el servidor remoto."
						color="error"
						variant="outline"
						icon="i-tabler-server-off"
					/>
					<UAlert
						title="Deploy en curso"
						description="Pipeline ejecutándose. Tiempo estimado: 2 minutos."
						color="primary"
						variant="solid"
						icon="i-tabler-rocket"
					/>
					<UAlert
						title="Información del sistema"
						description="Versión actual de DeployerApp: 1.1.0."
						color="neutral"
						variant="soft"
						icon="i-tabler-info-circle"
					/>
				</div>
			</UCard>

			<!-- SECCIÓN 7: OVERLAYS — Tooltip & Modal -->
			<UCard>
				<template #header>
					<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
						Overlays — Tooltip & Modal
					</h2>
				</template>
				<div class="space-y-4">
					<div class="flex flex-wrap gap-3">
						<UTooltip text="Modal Command Module con L-brackets y dot-grid" arrow>
							<UButton
								label="Abrir Modal"
								color="primary"
								icon="i-tabler-terminal-2"
								@click="
									() => {
										modalOpen = true
									}
								"
							/>
						</UTooltip>

						<UTooltip text="Acción secundaria" arrow>
							<UButton label="Secondary" color="secondary" variant="outline" />
						</UTooltip>

						<UTooltip text="Acción neutral sin énfasis" arrow>
							<UButton label="Ghost" color="neutral" variant="ghost" />
						</UTooltip>
					</div>

					<USeparator label="TOOLTIP SOBRE BADGES" />

					<div class="flex flex-wrap gap-3">
						<UTooltip text="Estado: online" arrow>
							<UBadge label="Producción" color="success" variant="subtle" class="cursor-pointer" />
						</UTooltip>
						<UTooltip text="Último deploy: hace 2h" arrow>
							<UBadge label="Staging" color="warning" variant="subtle" class="cursor-pointer" />
						</UTooltip>
						<UTooltip text="Sin acceso" arrow>
							<UBadge label="Dev" color="error" variant="subtle" class="cursor-pointer" />
						</UTooltip>
					</div>
				</div>
			</UCard>

			<!-- SECCIÓN 8: DROPDOWN & CONTEXT MENU -->
			<UCard>
				<template #header>
					<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
						Dropdown & Context Menu
					</h2>
				</template>
				<div class="space-y-4">
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">UDropdownMenu — panel readout</p>
						<UDropdownMenu :items="dropdownItems">
							<UButton label="Acciones" color="neutral" variant="outline" trailing-icon="i-tabler-chevron-down" />
						</UDropdownMenu>
					</div>
					<USeparator />
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">UContextMenu — clic derecho en el panel</p>
						<UContextMenu :items="contextMenuItems">
							<div
								class="pcb-clip-card border border-default bg-(--ui-bg-accented)/50 rounded-md px-4 py-6 text-center text-sm text-dimmed font-pcb cursor-context-menu select-none"
							>
								Clic derecho aquí
							</div>
						</UContextMenu>
					</div>
				</div>
			</UCard>

			<!-- SECCIÓN 9: TOASTS -->
			<UCard>
				<template #header>
					<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
						Toasts — Señal recibida
					</h2>
				</template>
				<div class="space-y-4">
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">Con icono — color por fondo + traza + borde + icono</p>
						<div class="flex flex-wrap gap-2">
							<UButton label="Primary" color="primary" size="sm" @click="fireToast('primary')" />
							<UButton label="Success" color="success" size="sm" @click="fireToast('success')" />
							<UButton label="Warning" color="warning" size="sm" @click="fireToast('warning')" />
							<UButton label="Error" color="error" size="sm" @click="fireToast('error')" />
							<UButton label="Info" color="info" size="sm" @click="fireToast('info')" />
							<UButton label="Neutral" color="neutral" size="sm" @click="fireToast('neutral')" />
						</div>
					</div>
					<USeparator />
					<div>
						<p class="text-xs text-dimmed font-pcb mb-2">
							Sin icono — debe seguir siendo distinguible solo por fondo/traza/borde
						</p>
						<div class="flex flex-wrap gap-2">
							<UButton
								label="Primary"
								color="primary"
								variant="outline"
								size="sm"
								@click="fireToast('primary', false)"
							/>
							<UButton
								label="Success"
								color="success"
								variant="outline"
								size="sm"
								@click="fireToast('success', false)"
							/>
							<UButton
								label="Warning"
								color="warning"
								variant="outline"
								size="sm"
								@click="fireToast('warning', false)"
							/>
							<UButton label="Error" color="error" variant="outline" size="sm" @click="fireToast('error', false)" />
						</div>
					</div>
				</div>
			</UCard>

			<!-- SECCIÓN 10: CARD — slots header/body/footer -->
			<UCard>
				<template #header>
					<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
						UCard — Command Module
					</h2>
				</template>
				<div class="space-y-4">
					<p class="text-xs text-dimmed font-pcb">
						Panel de mandos "Command Module": dot-grid de instrumentos, soportes de esquina con glow,
						bisel interior metálico, instrumento porthole de doble anillo y resplandor de motor.
					</p>
				</div>
				<template #footer>
					<div class="flex justify-end">
						<UButton label="Footer action" color="primary" size="sm" variant="soft" />
					</div>
				</template>
			</UCard>
		</div>

		<!-- SECCIÓN 11: TABLE — ancho completo -->
		<UCard>
			<template #header>
				<h2 class="text-sm font-semibold font-pcb text-primary-500 dark:text-primary-400 uppercase tracking-wider">
					UTable — Listado de despliegues
				</h2>
			</template>
			<UTable :data="tableData" :columns="tableColumns" class="w-full" />
		</UCard>

		<!-- Modal de Prueba -->
		<UModal
			v-model:open="modalOpen"
			title="Módulo de Conexión SSH"
			description="Introduce las credenciales de acceso de forma segura."
		>
			<template #body>
				<div class="space-y-4 py-2">
					<UAlert
						title="Conexión cifrada"
						description="Los datos se transmiten con AES-256-GCM."
						color="primary"
						variant="soft"
						icon="i-tabler-lock"
					/>
					<UFormField label="Dirección Host / IP">
						<UInput placeholder="192.168.1.100" class="w-full" />
					</UFormField>
					<UFormField label="Usuario SSH">
						<UInput placeholder="deploy" class="w-full" />
					</UFormField>
					<UFormField label="Puerto">
						<UInput placeholder="22" class="w-full" />
					</UFormField>
				</div>
			</template>

			<template #footer>
				<div class="flex justify-end gap-3 w-full">
					<UButton
						label="Cancelar"
						color="neutral"
						variant="ghost"
						@click="
							() => {
								modalOpen = false
							}
						"
					/>
					<UButton
						label="Conectar"
						color="primary"
						icon="i-tabler-plug"
						@click="
							() => {
								modalOpen = false
							}
						"
					/>
				</div>
			</template>
		</UModal>
	</div>
</template>
