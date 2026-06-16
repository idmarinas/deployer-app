<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = withDefaults(
	defineProps<{
		what?: string
		plural?: boolean
	}>(),
	{
		what: 'default',
		plural: false,
	},
)

const { t } = useI18n()
</script>

<template>
	<div class="w-full h-full flex items-center justify-center overflow-hidden z-9999 isolate">
		<!-- Fondos decorativos -->
		<div class="blob fixed rounded-full pointer-events-none size-1/2 -top-1/10 -left-1/10 blob-tl" />
		<div class="blob fixed rounded-full pointer-events-none size-1/2 -bottom-1/10 -right-1/10 blob-br" />

		<div class="relative flex flex-col items-center justify-center gap-4 p-6">
			<!-- Icono central con efecto ping -->
			<div>
				<div class="ping absolute rounded-full opacity-25 bg-primary/75" />
				<img class="pulse size-25 object-contain" src="/logo.png" alt="DeployerApp Logo" />
			</div>

			<!-- Textos + progreso -->
			<div class="flex items-center justify-center gap-2 text-muted">
				<UIcon name="i-tabler-loader-2" class="motion-safe:animate-spin" />
				<span class="text-xs font-bold uppercase tracking-widest">
					{{ t('app.loading.text', { what: props.what, count: props.plural ? 0 : 1 }) }}
				</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
/* ── Fondo decorativo ── */
.blob {
	filter: blur(120px);
	animation: pulse-blob 4s ease-in-out infinite;
}

.blob-tl {
	background: linear-gradient(135deg, rgba(0, 242, 254, 0.18), rgba(14, 165, 233, 0.18));
}

.blob-br {
	background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(14, 165, 233, 0.15));
	animation-delay: 2s;
}

.ping {
	animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.pulse {
	/* Animación opción A de index.html */
	animation: pulse-logo 2.5s ease-in-out infinite;
}

@keyframes pulse-blob {
	0%,
	100% {
		opacity: 0.8;
		transform: scale(1);
	}

	50% {
		opacity: 0.5;
		transform: scale(1.05);
	}
}

@keyframes pulse-logo {
	0%,
	100% {
		transform: scale(1);
		filter: drop-shadow(0 4px 6px rgba(14, 165, 233, 0.1));
	}

	50% {
		transform: scale(1.05);
		filter: drop-shadow(0 12px 20px rgba(14, 165, 233, 0.35));
	}
}

@keyframes ping {
	75%,
	100% {
		transform: scale(2);
		opacity: 0;
	}
}
</style>
