// theme/input.ts
// Estilo PCB: esquina inferior-izquierda recortada, traza inferior que se
// "activa" (glow) en focus, simulando una pista de circuito energizándose.
//
// IMPORTANTE: "base" lleva un clip-path (esquina recortada), por lo que el
// glow de focus usa `filter: drop-shadow(...)` en vez de `shadow-[...]`,
// que no respeta el recorte y deja ver una esquina recta.
export default {
	slots: {
		root: 'relative',
		base: [
			'[clip-path:polygon(0%_0%,100%_0%,100%_100%,8px_100%,0%_calc(100%-8px))]',
			'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)',
			'border border-(--ui-border) placeholder:text-(--ui-text-dimmed)',
			'transition-all duration-200',
			'focus:outline-none focus:border-primary-500',
			'focus:[filter:drop-shadow(0_2px_6px_var(--pcb-trace-glow))]',
			'disabled:opacity-40 disabled:cursor-not-allowed',
		].join(' '),
		trailing: 'pointer-events-none',
	},
	variants: {
		size: {
			xs: { base: 'text-xs' },
			sm: { base: 'text-sm' },
			md: { base: 'text-sm font-pcb' },
			lg: { base: 'text-base font-pcb' },
			xl: { base: 'text-base font-pcb' },
		},
	},
	compoundVariants: [
		{
			color: 'primary',
			variant: 'outline',
			class: {
				base: 'ring-0 border-(--ui-border) focus:border-primary-500',
			},
		},
		{
			color: 'error',
			variant: 'outline',
			class: {
				base: 'border-error-500/70 focus:border-error-500 focus:[filter:drop-shadow(0_2px_6px_rgba(255,10,85,0.35))]',
			},
		},
	],
}
