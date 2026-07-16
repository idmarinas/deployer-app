// theme/card.ts
// Estilo "Command Module": tarjeta inspirada en el panel de mandos de una nave
// espacial / cohete, con textura de panel técnico (dot-grid), soportes de
// esquina con glow, bisel interior de marco metálico, instrumento "porthole"
// de doble anillo en el header y un resplandor de "motor" en el footer.
//
// El clip-path y la sombra siguen las utilidades PCB (pcb-clip-card, pcb-shadow-*)
// para mantener la coherencia visual con el resto del theme de DeployerApp.
export default {
	slots: {
		root: [
			'pcb-clip-card pcb-shadow-neutral',
			'border border-(--ui-border) bg-(--ui-bg-elevated)/90 backdrop-blur-md',
			'relative overflow-hidden',
			'transition-all duration-300',
			'hover:border-primary-500/30 hover:pcb-shadow-hover-md',
			// Dot-grid blueprint pattern (panel de instrumentos)
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.035)_1px,transparent_0)]',
			'bg-[size:20px_20px]',
			// Inner frame bevel (bisel metálico)
			'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.06)]',
			// Top-left corner bracket con glow
			'before:absolute before:top-[8px] before:left-[8px]',
			'before:size-[14px]',
			'before:border-t-2 before:border-l-2',
			'before:border-t-primary-500/45 before:border-l-primary-500/45',
			'before:shadow-[0_0_6px_rgba(10,141,255,0.12)]',
			'before:rounded-tl-[1px]',
			// Bottom-right corner bracket con glow
			'after:absolute after:bottom-[8px] after:right-[8px]',
			'after:size-[14px]',
			'after:border-b-2 after:border-r-2',
			'after:border-b-secondary-500/45 after:border-r-secondary-500/45',
			'after:shadow-[0_0_6px_rgba(130,26,255,0.12)]',
			'after:rounded-br-[1px]',
		].join(' '),
		header: [
			'px-6 py-4 border-b border-(--ui-border) relative',
			// Gradient trace overlay on bottom border
			'before:absolute before:bottom-0 before:left-6 before:right-6 before:h-px',
			'before:bg-linear-to-r before:from-primary-500/40 before:via-secondary-500/40 before:to-transparent',
			// Instrumento porthole de doble anillo
			// 'after:absolute after:top-1/2 after:-translate-y-1/2 after:end-6',
			// 'after:size-6 after:rounded-full',
			// 'after:border-2 after:border-primary-500/25',
			// 'after:bg-linear-to-br after:from-primary-500/10 after:to-secondary-500/10',
			// 'after:shadow-[inset_0_0_8px_rgba(10,141,255,0.12),0_0_4px_rgba(10,141,255,0.08)]',
		].join(' '),
		body: 'px-6 py-5',
		footer: [
			'px-6 py-4 border-t border-(--ui-border) relative',
			// Gradient trace overlay on top border
			'before:absolute before:top-0 before:left-6 before:right-6 before:h-px',
			'before:bg-linear-to-r before:from-primary-500/40 before:via-secondary-500/40 before:to-transparent',
			// Engine thrust/exhaust glow
			'after:absolute after:bottom-0 after:inset-x-0 after:h-[3px]',
			'after:bg-linear-to-r after:from-primary-500/30 after:via-secondary-500/30 after:to-transparent',
			'after:blur-[2px]',
		].join(' '),
	},
}
