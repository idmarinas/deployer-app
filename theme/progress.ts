// Indicador de empuje/progreso — Command Module.
// Pista: dot-grid de panel + bisel + anillo.
// Relleno: degradado energético con glow + barrido de brillo.
// Steps: nodos indicadores entre segmentos como "checkpoints"
// de la trayectoria de la nave.
export default {
	slots: {
		root: 'relative w-full',
		base: [
			'relative w-full overflow-hidden rounded-full',
			'bg-(--ui-bg-accented) h-2',
			'ring-1 ring-(--ui-border)',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.025)_1px,transparent_0)] bg-[size:16px_16px]',
			'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.04)]',
		].join(' '),
		indicator: [
			'h-full rounded-full transition-all duration-500 ease-out relative',
			'bg-linear-to-r from-primary-500 via-secondary-500 to-primary-500',
			'bg-[length:200%_100%]',
			'shadow-[0_0_14px_rgba(10,141,255,0.5)]',
			// Barrido de brillo superficial como "energía fluyendo"
			'after:absolute after:inset-0 after:rounded-full',
			'after:bg-linear-to-r after:from-transparent after:via-white/25 after:to-transparent',
		].join(' '),
		steps: [
			'text-xs font-pcb text-(--ui-text-dimmed) mt-1.5 flex justify-between relative',
		].join(' '),
		step: [
			'relative flex flex-col items-center gap-0.5',
			'before:block before:size-[5px] before:rounded-full',
			'before:bg-(--ui-border) before:transition-colors before:duration-200',
			'data-[selected=true]:text-primary-500 dark:data-[selected=true]:text-primary-400',
			'data-[selected=true]:before:bg-primary-500 dark:data-[selected=true]:before:bg-primary-400',
			'data-[selected=true]:before:shadow-[0_0_4px_rgba(10,141,255,0.5)]',
		].join(' '),
	},
}
