// Readout técnico — Command Module.
export default {
	slots: {
		content: [
			'rounded-md px-2.5 py-1.5 text-xs font-pcb relative overflow-hidden',
			'bg-(--ui-bg-elevated)/95 text-(--ui-text-toned) border border-(--ui-border)',
			'backdrop-blur-md pcb-inset-bevel',
			'shadow-[inset_0_0_0_1px_var(--pcb-inset-border),0_0_16px_var(--pcb-trace-glow),0_4px_16px_color-mix(in_srgb,black_30%,transparent)]',
			'before:absolute before:inset-x-2 before:top-0 before:h-px',
			'before:bg-linear-to-r before:from-transparent before:via-primary-500/50 before:to-transparent',
			'after:absolute after:inset-x-1 after:h-[2px] after:bg-linear-to-r',
			'after:from-transparent after:via-primary-500/15 after:to-transparent',
			'after:animate-[pcb-scan_3s_ease-in-out_infinite]',
		].join(' '),
		arrow: 'fill-(--ui-bg-elevated)',
	},
}
