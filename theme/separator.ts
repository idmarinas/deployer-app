// Junta de panel — Command Module.
export default {
	slots: {
		root: 'flex items-center gap-3',
		border: 'flex-1 border-0 h-px bg-linear-to-r from-primary-500/20 via-primary-500/50 to-secondary-500/20',
		label: [
			'text-xs text-(--ui-text-dimmed) font-pcb tracking-wider uppercase shrink-0',
			'flex items-center gap-1.5',
			'before:block before:size-[6px] before:rounded-full',
			'before:bg-primary-500/40 before:shadow-[0_0_4px_var(--pcb-trace-glow)]',
			'after:block after:size-[6px] after:rounded-full',
			'after:bg-secondary-500/40 after:shadow-[0_0_4px_color-mix(in_srgb,var(--color-deployer-secondary-500)_20%,transparent)]',
		].join(' '),
	},
}
