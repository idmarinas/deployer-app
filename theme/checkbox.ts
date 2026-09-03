// Pad de activación — Command Module.
export default {
	slots: {
		root: 'relative flex items-start gap-2',
		base: [
			'h-4 w-4 shrink-0 rounded-[2px] border transition-all duration-200 cursor-pointer',
			'bg-(--ui-bg-elevated) border-(--ui-border)',
			'shadow-[inset_0_1px_3px_color-mix(in_srgb,black_12%,transparent)]',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
			'hover:border-(--ui-border-accented)',
			'data-[state=checked]:pcb-gradient-brand data-[state=checked]:border-transparent',
			'data-[state=checked]:shadow-[0_0_10px_var(--pcb-trace-glow),inset_0_1px_0_color-mix(in_srgb,white_20%,transparent)]',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		indicator: 'text-white drop-shadow-[0_0_4px_color-mix(in_srgb,white_50%,transparent)]',
		label: 'text-sm text-(--ui-text-toned) cursor-pointer select-none has-disabled:cursor-not-allowed has-disabled:opacity-60',
		description: 'text-xs text-(--ui-text-dimmed) mt-0.5 font-pcb',
	},
}
