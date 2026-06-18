// theme/badge.ts
// Estilo PCB: esquinas recortadas tipo chip/componente SMD, borde segmentado,
// fuente mono para aspecto de etiqueta técnica de circuito impreso.
//
// IMPORTANTE: el slot "base" lleva `pcb-clip-badge` (clip-path), por lo que el
// glow de las variantes "solid" usa `filter: drop-shadow(...)` en vez de
// `shadow-[...]` (box-shadow no respeta el recorte y se ve una esquina recta).
//
// NOTA sobre `.pcb-animate-blink`: NO se aplica por defecto en ningún color/
// variante. Es una clase de uso explícito y puntual — añadirla manualmente
// (`class="pcb-animate-blink"`) solo cuando se quiera señalar un estado que
// requiere atención inmediata (p. ej. una alerta sin confirmar).
export default {
	slots: {
		base: 'pcb-clip-badge font-pcb font-medium tracking-wider uppercase relative',
	},
	compoundVariants: [
		// ─── PRIMARY ──────────────────────────────────────────────────────────
		{
			color: 'primary',
			variant: 'solid',
			class: 'bg-primary-500 text-white [filter:drop-shadow(0_0_6px_rgba(10,141,255,0.4))]',
		},
		{
			color: 'primary',
			variant: 'outline',
			class: 'bg-primary-500/5 text-primary-600 dark:text-primary-400 ring-1 ring-inset ring-primary-500/50',
		},
		{
			color: 'primary',
			variant: 'soft',
			class: 'bg-primary-500/10 text-primary-600 dark:text-primary-400',
		},
		{
			color: 'primary',
			variant: 'subtle',
			class: 'bg-primary-500/10 text-primary-600 dark:text-primary-400 ring-1 ring-inset ring-primary-500/25',
		},
		// ─── SECONDARY ────────────────────────────────────────────────────────
		{
			color: 'secondary',
			variant: 'solid',
			class: 'bg-secondary-500 text-white [filter:drop-shadow(0_0_6px_rgba(130,26,255,0.4))]',
		},
		{
			color: 'secondary',
			variant: 'outline',
			class: 'bg-secondary-500/5 text-secondary-600 dark:text-secondary-400 ring-1 ring-inset ring-secondary-500/50',
		},
		{
			color: 'secondary',
			variant: 'soft',
			class: 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400',
		},
		{
			color: 'secondary',
			variant: 'subtle',
			class: 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 ring-1 ring-inset ring-secondary-500/25',
		},
		// ─── SUCCESS ──────────────────────────────────────────────────────────
		{
			color: 'success',
			variant: 'solid',
			class: 'bg-success-500 text-neutral-950 [filter:drop-shadow(0_0_6px_rgba(0,200,163,0.4))]',
		},
		{
			color: 'success',
			variant: 'outline',
			class: 'bg-success-500/5 text-success-600 dark:text-success-400 ring-1 ring-inset ring-success-500/50',
		},
		{
			color: 'success',
			variant: 'soft',
			class: 'bg-success-500/10 text-success-600 dark:text-success-400',
		},
		{
			color: 'success',
			variant: 'subtle',
			class: 'bg-success-500/10 text-success-600 dark:text-success-400 ring-1 ring-inset ring-success-500/25',
		},
		// ─── INFO ─────────────────────────────────────────────────────────────
		{
			color: 'info',
			variant: 'solid',
			class: 'bg-info-500 text-neutral-950 [filter:drop-shadow(0_0_6px_rgba(0,199,255,0.4))]',
		},
		{
			color: 'info',
			variant: 'outline',
			class: 'bg-info-500/5 text-info-600 dark:text-info-400 ring-1 ring-inset ring-info-500/50',
		},
		{
			color: 'info',
			variant: 'soft',
			class: 'bg-info-500/10 text-info-600 dark:text-info-400',
		},
		// ─── WARNING ──────────────────────────────────────────────────────────
		{
			color: 'warning',
			variant: 'solid',
			class: 'bg-warning-500 text-neutral-950 [filter:drop-shadow(0_0_6px_rgba(230,178,0,0.4))]',
		},
		{
			color: 'warning',
			variant: 'outline',
			class: 'bg-warning-500/5 text-warning-600 dark:text-warning-400 ring-1 ring-inset ring-warning-500/50',
		},
		{
			color: 'warning',
			variant: 'soft',
			class: 'bg-warning-500/10 text-warning-600 dark:text-warning-400',
		},
		// ─── ERROR ────────────────────────────────────────────────────────────
		{
			color: 'error',
			variant: 'solid',
			// Sin pcb-animate-blink por defecto — añadir manualmente cuando se
			// quiera marcar atención inmediata: <UBadge class="pcb-animate-blink" />
			class: 'bg-error-500 text-white [filter:drop-shadow(0_0_6px_rgba(255,10,85,0.4))]',
		},
		{
			color: 'error',
			variant: 'outline',
			class: 'bg-error-500/5 text-error-600 dark:text-error-400 ring-1 ring-inset ring-error-500/50',
		},
		{
			color: 'error',
			variant: 'soft',
			class: 'bg-error-500/10 text-error-600 dark:text-error-400',
		},
		// ─── NEUTRAL ──────────────────────────────────────────────────────────
		{
			color: 'neutral',
			variant: 'solid',
			class: 'bg-neutral-700 text-white',
		},
		{
			color: 'neutral',
			variant: 'outline',
			class: 'bg-neutral-500/5 text-neutral-700 dark:text-neutral-300 ring-1 ring-inset ring-neutral-400/50 dark:ring-neutral-600/50',
		},
		{
			color: 'neutral',
			variant: 'soft',
			class: 'bg-neutral-500/10 text-neutral-700 dark:text-neutral-300',
		},
		{
			color: 'neutral',
			variant: 'subtle',
			class: 'bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 ring-1 ring-inset ring-neutral-400/25 dark:ring-neutral-600/25',
		},
	],
}
