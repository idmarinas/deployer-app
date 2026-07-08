// theme/modal.ts
// Estilo "Command Module": panel modal con el mismo lenguaje visual que la card:
// L-brackets en esquinas, dot-grid de instrumentos, bisel interior metálico,
// traza superior energizada. Overlay con textura de panel de control.
export default {
	slots: {
		overlay: [
			'fixed inset-0',
			'bg-(--ui-bg)/60 backdrop-blur-sm',
			'bg-[radial-gradient(circle_at_50%_50%,rgba(10,141,255,0.03)_0%,transparent_60%)]',
		].join(' '),
		content: [
			'pcb-clip-card pcb-shadow-lg border border-(--ui-border) bg-(--ui-bg-elevated)/95 backdrop-blur-xl overflow-hidden',
			'ring-1 ring-primary-500/10',
			'relative',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.035)_1px,transparent_0)] bg-[size:20px_20px]',
			'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.06)]',
			'before:absolute before:inset-x-0 before:top-0 before:h-px',
			'before:bg-linear-to-r before:from-transparent before:via-primary-500/60 before:to-transparent',
			'after:absolute after:top-[8px] after:left-[8px] after:size-[14px]',
			'after:border-t-2 after:border-l-2',
			'after:border-t-primary-500/45 after:border-l-primary-500/45',
			'after:shadow-[0_0_6px_rgba(10,141,255,0.12)]',
			'after:rounded-tl-[1px]',
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
