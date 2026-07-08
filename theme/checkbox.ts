// Pad de activación — Command Module.
// No chequeado: panel hundido (inset shadow) como pad inactivo.
// Chequeado: pad energizado con gradiente de marca + glow,
// como un sistema de nave que se enciende.
export default {
	slots: {
		root: 'relative flex items-start gap-2',
		base: [
			'h-4 w-4 shrink-0 rounded-[2px] border transition-all duration-200 cursor-pointer',
			'bg-(--ui-bg-elevated) border-(--ui-border)',
			'shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
			'hover:border-(--ui-border-accented)',
			'data-[state=checked]:bg-linear-to-br data-[state=checked]:from-primary-500 data-[state=checked]:to-secondary-500',
			'data-[state=checked]:border-transparent',
			'data-[state=checked]:shadow-[0_0_10px_rgba(10,141,255,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		indicator: 'text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]',
		label: 'text-sm text-(--ui-text-toned) cursor-pointer select-none has-disabled:cursor-not-allowed has-disabled:opacity-60',
		description: 'text-xs text-(--ui-text-dimmed) mt-0.5 font-pcb',
	},
}
