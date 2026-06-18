// theme/modal.ts
// Estilo PCB: panel principal con esquinas recortadas y nodos, overlay con
// leve textura, traza superior energizada que recorre todo el ancho.
//
// IMPORTANTE: "content" lleva `pcb-clip-card` (clip-path), por lo que la
// sombra usa `filter: drop-shadow(...)` (utilidad `.pcb-shadow-lg`) en vez de
// `shadow-2xl`, que no respeta el recorte y deja ver una esquina recta.
export default {
	slots: {
		overlay: 'fixed inset-0 bg-(--ui-bg)/60 backdrop-blur-sm',
		content: [
			'pcb-clip-card pcb-corners pcb-shadow-lg border border-(--ui-border) bg-(--ui-bg-elevated)/95 backdrop-blur-xl overflow-hidden',
			'ring-1 ring-primary-500/10',
			'relative before:absolute before:inset-x-0 before:top-0 before:h-px',
			'before:bg-linear-to-r before:from-transparent before:via-primary-500/60 before:to-transparent',
		].join(' '),
		header: [
			'flex items-center gap-1.5 p-4 sm:px-6 min-h-(--ui-header-height)',
			'border-b border-(--ui-border) relative',
			'after:absolute after:bottom-0 after:left-6 after:right-6 after:h-px',
			'after:bg-linear-to-r after:from-primary-500/40 after:via-secondary-500/40 after:to-transparent',
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
