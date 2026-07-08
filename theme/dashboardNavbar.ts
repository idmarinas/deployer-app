// theme/dashboardNavbar.ts
// Estilo "Command Module": barra de estado de nave espacial con dot-grid de
// instrumentos, L-brackets en esquinas, y traza energizada en borde inferior.
export default {
	slots: {
		root: [
			'h-16 flex items-center justify-between gap-3 px-4 backdrop-blur-md relative',
			'border-b border-(--ui-border)',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.03)_1px,transparent_0)] bg-[size:20px_20px]',
			// Top-left L-bracket
			'before:absolute before:top-[6px] before:left-[6px]',
			'before:size-[10px]',
			'before:border-t-2 before:border-l-2',
			'before:border-t-primary-500/40 before:border-l-primary-500/40',
			'before:rounded-tl-[1px]',
			// Bottom trace + bottom-right L-bracket
			'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px',
			'after:bg-linear-to-r after:from-primary-500 after:to-secondary-500 after:opacity-50 dark:after:opacity-30',
		].join(' '),
		left: 'flex items-center gap-2',
		title: 'text-sm font-semibold text-(--ui-text-highlighted) font-pcb tracking-wider uppercase',
		icon: 'w-5 h-5 text-primary-500 dark:text-primary-400 drop-shadow-[0_0_6px_rgba(0,199,255,0.4)]',
		center: 'flex-1 flex items-center justify-center',
		right: 'flex items-center gap-2',
		toggle: 'lg:hidden',
	},
}
