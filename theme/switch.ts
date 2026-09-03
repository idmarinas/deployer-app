// Interruptor de palanca — Command Module.
export default {
	slots: {
		root: 'relative inline-flex items-center gap-2',
		base: [
			'relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-default',
			'transition-all duration-200 ease-in-out',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
			'bg-(--ui-bg-accented) border-(--ui-border)',
			'shadow-[inset_0_1px_3px_color-mix(in_srgb,black_10%,transparent)]',
			'data-[state=checked]:pcb-gradient-brand data-[state=checked]:border-transparent',
			'data-[state=checked]:shadow-[inset_0_1px_3px_color-mix(in_srgb,black_10%,transparent),0_0_12px_var(--pcb-trace-glow)]',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		thumb: [
			'pointer-events-none size-3.5 rounded-full bg-white',
			'shadow-[0_1px_3px_color-mix(in_srgb,black_25%,transparent)]',
			'transition-all duration-200 relative',
			'before:absolute before:inset-0 before:size-full',
			'before:rounded-full before:bg-current',
			'before:opacity-0 before:transition-opacity before:duration-200',
			'data-[state=checked]:shadow-[0_0_8px_var(--pcb-trace-glow),0_1px_3px_color-mix(in_srgb,black_20%,transparent)]',
			'data-[state=checked]:before:opacity-100',
			'data-[state=checked]:before:text-primary-50',
		].join(' '),
		label: 'text-sm text-(--ui-text-toned) cursor-pointer select-none has-disabled:cursor-not-allowed has-disabled:opacity-60',
		description: 'text-xs text-dimmed font-pcb',
	},
}
