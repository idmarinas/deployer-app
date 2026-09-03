// theme/modal.ts
// Estilo "Command Module": panel modal con el mismo lenguaje visual que la card.
export default {
	slots: {
		overlay: [
			'fixed inset-0',
			'bg-(--ui-bg)/60 backdrop-blur-sm pcb-panel-grid',
		].join(' '),
		content: [
			'pcb-clip-card pcb-shadow-lg pcb-panel-grid pcb-inset-bevel pcb-bracket-tl pcb-bracket-br',
			'border border-(--ui-border) bg-(--ui-bg-elevated)/95 backdrop-blur-xl overflow-hidden',
			'ring-1 ring-primary-500/10 relative',
			'bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--color-deployer-primary-500)_40%,transparent),transparent_1px)]',
		].join(' '),
		header: [
			'flex items-center gap-1.5 p-4 sm:px-6 min-h-(--ui-header-height)',
			'border-b border-(--ui-border) relative',
			'before:absolute before:bottom-0 before:left-6 before:right-6 before:h-px',
			'before:bg-linear-to-r before:from-primary-500/40 before:via-secondary-500/40 before:to-transparent',
		].join(' '),
		wrapper: '',
		body: 'flex-1 p-4 sm:p-6',
		footer: [
			'flex items-center gap-1.5 p-4 sm:px-6',
			'border-t border-(--ui-border) relative',
			'before:absolute before:top-0 before:left-6 before:right-6 before:h-px',
			'before:bg-linear-to-r before:from-primary-500/40 before:via-secondary-500/40 before:to-transparent',
		].join(' '),
		title: 'text-(--ui-text-highlighted) font-semibold font-pcb tracking-wide',
		description: 'mt-1 text-(--ui-text-dimmed) text-sm',
		close: 'absolute top-4 end-4 text-(--ui-text-dimmed) hover:text-primary-500 dark:hover:text-primary-400 transition-colors duration-200',
	},
}
