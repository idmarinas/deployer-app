// theme/switch.ts
// Estilo PCB: el track es una pista de circuito (trace) y el thumb es el pad
// que se desplaza sobre ella. Al activarse, la traza completa se energiza.
//
// IMPORTANTE: `disabled:pointer-events-none` evita que cualquier estado
// hover/active (de hoy o de variantes futuras) se dispare con el switch
// deshabilitado, además de bajar la opacidad para que se note visualmente.
export default {
	slots: {
		root: 'relative inline-flex items-center gap-2',
		base: [
			// Track del switch — pista de circuito
			'relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-default',
			'transition-colors duration-200 ease-in-out',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
			// OFF: traza inactiva
			'bg-(--ui-bg-accented)',
			// ON: traza energizada con degradado de marca
			'data-[state=checked]:bg-linear-to-r data-[state=checked]:from-primary-500 data-[state=checked]:to-secondary-500',
			'data-[state=checked]:border-transparent',
			'data-[state=checked]:shadow-[0_0_10px_rgba(10,141,255,0.35)]',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		thumb: [
			// Pad deslizante
			'pointer-events-none size-3.5 rounded-full bg-white shadow-md ring-0',
			'transition-transform duration-200',
			'data-[state=checked]:shadow-[0_0_6px_rgba(255,255,255,0.8)]',
		].join(' '),
		label: 'text-sm text-(--ui-text-toned) cursor-pointer select-none has-disabled:cursor-not-allowed has-disabled:opacity-60',
		description: 'text-xs text-dimmed font-pcb',
	},
}
