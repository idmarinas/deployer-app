// theme/progress.ts
// Estilo PCB: la pista es un trazado de circuito con nodos en los extremos,
// y el relleno simula energía fluyendo (brillo animado + flujo de gradiente).
export default {
	slots: {
		root: 'relative w-full',
		base: [
			'relative w-full overflow-hidden rounded-full',
			'bg-(--ui-bg-accented) h-2',
			'ring-1 ring-(--ui-border)',
		].join(' '),
		indicator: [
			'h-full rounded-full transition-all duration-500 ease-out',
			'bg-linear-to-r from-primary-500 via-secondary-500 to-primary-500',
			'relative after:absolute after:inset-0 after:rounded-full',
			'after:bg-linear-to-r after:from-transparent after:via-white/25 after:to-transparent',
			'shadow-[0_0_12px_rgba(10,141,255,0.5)]',
		].join(' '),
		steps: 'text-xs font-pcb text-(--ui-text-dimmed) mt-1.5 flex justify-between',
		step: 'data-[selected=true]:text-primary-500 dark:data-[selected=true]:text-primary-400',
	},
}
