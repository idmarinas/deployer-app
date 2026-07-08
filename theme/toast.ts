// Señal de sistema — Command Module.
// Notificación tipo "comms received" con traza lateral,
// bisel, y L-bracket decorativo. Cada color semántico
// se distingue por fondo tintado + borde + glow.
export default {
	slots: {
		root: [
			'relative overflow-hidden rounded-md border p-4 backdrop-blur-md',
			'bg-(--ui-bg-elevated)/95',
			'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.04)]',
			// L-bracket top-left
			'before:absolute before:top-[4px] before:left-[4px]',
			'before:size-[8px]',
			'before:border-t-2 before:border-l-2',
			'before:border-t-primary-500/30 before:border-l-primary-500/30',
			'before:rounded-tl-[1px]',
		].join(' '),
		title: 'text-sm font-semibold font-pcb text-(--ui-text-highlighted)',
		description: 'text-sm text-(--ui-text-dimmed) mt-0.5',
		icon: 'shrink-0 size-5 drop-shadow-[0_0_6px_currentColor]',
		progress: 'absolute bottom-0 left-0 h-0.5 shadow-[0_0_6px_currentColor]',
		close: 'transition-colors duration-200',
	},
	compoundVariants: [
		{
			color: 'primary',
			class: {
				root: 'pcb-trace-left-current border-primary-500/40 bg-primary-500/8 text-primary-600 dark:text-primary-400',
				title: 'text-(--ui-text-highlighted)',
				icon: 'text-primary-500 dark:text-primary-400',
				progress: 'bg-primary-500',
				close: 'text-(--ui-text-dimmed) hover:text-primary-500 dark:hover:text-primary-400',
			},
		},
		{
			color: 'secondary',
			class: {
				root: 'pcb-trace-left-current border-secondary-500/40 bg-secondary-500/8 text-secondary-600 dark:text-secondary-400',
				title: 'text-(--ui-text-highlighted)',
				icon: 'text-secondary-500 dark:text-secondary-400',
				progress: 'bg-secondary-500',
				close: 'text-(--ui-text-dimmed) hover:text-secondary-500 dark:hover:text-secondary-400',
			},
		},
		{
			color: 'success',
			class: {
				root: 'pcb-trace-left-current border-success-500/40 bg-success-500/8 text-success-600 dark:text-success-400',
				title: 'text-(--ui-text-highlighted)',
				icon: 'text-success-500 dark:text-success-400',
				progress: 'bg-success-500',
				close: 'text-(--ui-text-dimmed) hover:text-success-500 dark:hover:text-success-400',
			},
		},
		{
			color: 'warning',
			class: {
				root: 'pcb-trace-left-current border-warning-500/40 bg-warning-500/8 text-warning-600 dark:text-warning-400',
				title: 'text-(--ui-text-highlighted)',
				icon: 'text-warning-500 dark:text-warning-400',
				progress: 'bg-warning-500',
				close: 'text-(--ui-text-dimmed) hover:text-warning-500 dark:hover:text-warning-400',
			},
		},
		{
			color: 'error',
			class: {
				root: 'pcb-trace-left-current border-error-500/40 bg-error-500/8 text-error-600 dark:text-error-400',
				title: 'text-(--ui-text-highlighted)',
				icon: 'text-error-500 dark:text-error-400',
				progress: 'bg-error-500',
				close: 'text-(--ui-text-dimmed) hover:text-error-500 dark:hover:text-error-400',
			},
		},
		{
			color: 'info',
			class: {
				root: 'pcb-trace-left-current border-info-500/40 bg-info-500/8 text-info-600 dark:text-info-400',
				title: 'text-(--ui-text-highlighted)',
				icon: 'text-info-500 dark:text-info-400',
				progress: 'bg-info-500',
				close: 'text-(--ui-text-dimmed) hover:text-info-500 dark:hover:text-info-400',
			},
		},
		{
			color: 'neutral',
			class: {
				root: 'border-(--ui-border) bg-(--ui-bg-accented)/40 text-(--ui-text-toned)',
				title: 'text-(--ui-text-highlighted)',
				icon: 'text-(--ui-text-dimmed)',
				progress: 'bg-(--ui-text-dimmed)',
				close: 'text-(--ui-text-dimmed) hover:text-(--ui-text-toned)',
			},
		},
	],
}
