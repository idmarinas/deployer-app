// theme/card.ts
// Estilo PCB: tarjeta con las 4 esquinas recortadas (forma de placa de circuito),
// nodos en las esquinas, y traza energizada en la separación de header/footer.
//
// IMPORTANTE: "root" lleva `pcb-clip-card` (clip-path), por lo que la sombra
// usa `filter: drop-shadow(...)` (vía utilidad `.pcb-shadow-neutral` / hover
// con glow primary) en vez de `shadow-[...]`, que no respeta el recorte.
export default {
	slots: {
		root: [
			'pcb-clip-card pcb-corners pcb-shadow-neutral border border-(--ui-border) bg-(--ui-bg-elevated)/90 backdrop-blur-md',
			'transition-all duration-300',
			'hover:border-primary-500/30 hover:[filter:drop-shadow(0_4px_20px_rgba(10,141,255,0.12))]',
			'relative overflow-hidden',
		].join(' '),
		header: [
			'px-6 py-4 border-b border-(--ui-border) relative',
			'after:absolute after:bottom-0 after:left-6 after:right-6 after:h-px',
			'after:bg-linear-to-r after:from-primary-500/40 after:via-secondary-500/40 after:to-transparent',
		].join(' '),
		body: 'px-6 py-5',
		footer: [
			'px-6 py-4 border-t border-(--ui-border) relative',
			'before:absolute before:top-0 before:left-6 before:right-6 before:h-px',
			'before:bg-linear-to-r before:from-primary-500/40 before:via-secondary-500/40 before:to-transparent',
		].join(' '),
	},
}
