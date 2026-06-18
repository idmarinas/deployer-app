// theme/checkbox.ts
// Estilo PCB: pad de soldadura cuadrado. Al marcarse, el pad se "energiza"
// con degradado de marca y un breve glow, como una señal activa en el circuito.
//
// IMPORTANTE: `disabled:pointer-events-none` evita que el `hover:` de borde
// se dispare cuando el checkbox está deshabilitado.
export default {
	slots: {
		root: 'relative flex items-start gap-2',
		base: [
			'h-4 w-4 shrink-0 rounded-[2px] border border-(--ui-border) bg-(--ui-bg-elevated)',
			'transition-all duration-200 cursor-pointer',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
			'hover:border-(--ui-border-accented)',
			// Estado activo — pad energizado
			'data-[state=checked]:bg-linear-to-br data-[state=checked]:from-primary-500 data-[state=checked]:to-secondary-500',
			'data-[state=checked]:border-transparent',
			'data-[state=checked]:shadow-[0_0_8px_rgba(10,141,255,0.4)]',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		indicator: 'text-white',
		label: 'text-sm text-(--ui-text-toned) cursor-pointer select-none has-disabled:cursor-not-allowed has-disabled:opacity-60',
		description: 'text-xs text-(--ui-text-dimmed) mt-0.5 font-pcb',
	},
}
