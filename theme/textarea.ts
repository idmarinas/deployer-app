// theme/textarea.ts
// Mismo lenguaje visual que input.ts: esquina inferior-izquierda recortada
// + traza activa en focus. El handle de resize se decora como "conector".
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
			'transition-all duration-200 font-pcb',
			'focus:outline-none focus:border-primary-500',
			'focus:[filter:drop-shadow(0_2px_6px_var(--pcb-trace-glow))]',
			'disabled:opacity-40 disabled:cursor-not-allowed',
			// Handle de resize estilizado como conector
			'[&::-webkit-resizer]:bg-transparent',
		].join(' '),
		trailing: 'pointer-events-none',
	},
	compoundVariants: [
		{
			color: 'error',
			variant: 'outline',
			class: {
				base: 'border-error-500/70 focus:border-error-500 focus:[filter:drop-shadow(0_2px_6px_rgba(255,10,85,0.35))]',
			},
		},
	],
}
