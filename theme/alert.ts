// theme/alert.ts
// Estilo PCB: traza lateral izquierda energizada (pcb-trace-left) en variantes
// no-solid, simulando una línea de alimentación de la alerta. Solid mantiene
// el degradado de marca a pantalla completa.
export default {
	slots: {
		root: 'relative overflow-hidden w-full rounded-md p-4 flex gap-2.5 border',
		icon: 'shrink-0 size-5 drop-shadow-[0_0_6px_currentColor]',
		title: 'text-sm font-semibold font-pcb tracking-wide',
		description: 'text-sm opacity-80',
	},
	compoundVariants: [
		// ─── PRIMARY ──────────────────────────────────────────────────────────
		{
			color: 'primary',
			variant: 'solid',
			class: {
				root: 'bg-linear-to-r from-primary-500/90 to-secondary-500/90 border-transparent text-white shadow-[0_0_20px_rgba(10,141,255,0.25)]',
			},
		},
		{
			color: 'primary',
			variant: 'outline',
			class: {
				root: 'pcb-trace-left bg-transparent border-primary-500/30 text-primary-600 dark:text-primary-400',
			},
		},
		{
			color: 'primary',
			variant: 'soft',
			class: {
				root: 'pcb-trace-left bg-primary-500/10 border-primary-500/15 text-primary-600 dark:text-primary-400',
			},
		},
		{
			color: 'primary',
			variant: 'subtle',
			class: {
				root: 'pcb-trace-left bg-primary-500/8 border-primary-500/25 text-primary-700 dark:text-primary-300',
			},
		},
		// ─── SUCCESS ──────────────────────────────────────────────────────────
		{
			color: 'success',
			variant: 'solid',
			class: {
				root: 'bg-success-500 border-transparent text-neutral-950 shadow-[0_0_20px_rgba(0,200,163,0.25)]',
			},
		},
		{
			color: 'success',
			variant: 'outline',
			class: {
				root: 'pcb-trace-left bg-transparent border-success-500/30 text-success-600 dark:text-success-400',
			},
		},
		{
			color: 'success',
			variant: 'soft',
			class: {
				root: 'pcb-trace-left bg-success-500/10 border-success-500/15 text-success-600 dark:text-success-400',
			},
		},
		{
			color: 'success',
			variant: 'subtle',
			class: {
				root: 'pcb-trace-left bg-success-500/8 border-success-500/25 text-success-700 dark:text-success-300',
			},
		},
		// ─── WARNING ──────────────────────────────────────────────────────────
		{
			color: 'warning',
			variant: 'solid',
			class: {
				root: 'bg-warning-500 border-transparent text-neutral-950 shadow-[0_0_20px_rgba(230,178,0,0.25)]',
			},
		},
		{
			color: 'warning',
			variant: 'outline',
			class: {
				root: 'pcb-trace-left bg-transparent border-warning-500/30 text-warning-600 dark:text-warning-400',
			},
		},
		{
			color: 'warning',
			variant: 'soft',
			class: {
				root: 'pcb-trace-left bg-warning-500/10 border-warning-500/15 text-warning-600 dark:text-warning-400',
			},
		},
		{
			color: 'warning',
			variant: 'subtle',
			class: {
				root: 'pcb-trace-left bg-warning-500/8 border-warning-500/25 text-warning-700 dark:text-warning-300',
			},
		},
		// ─── ERROR ────────────────────────────────────────────────────────────
		{
			color: 'error',
			variant: 'solid',
			class: {
				root: 'bg-error-500 border-transparent text-white shadow-[0_0_20px_rgba(255,10,85,0.25)]',
			},
		},
		{
			color: 'error',
			variant: 'outline',
			class: {
				root: 'pcb-trace-left bg-transparent border-error-500/30 text-error-600 dark:text-error-400',
			},
		},
		{
			color: 'error',
			variant: 'soft',
			class: {
				root: 'pcb-trace-left bg-error-500/10 border-error-500/15 text-error-600 dark:text-error-400',
			},
		},
		{
			color: 'error',
			variant: 'subtle',
			class: {
				root: 'pcb-trace-left bg-error-500/8 border-error-500/25 text-error-700 dark:text-error-300',
			},
		},
		// ─── INFO ─────────────────────────────────────────────────────────────
		{
			color: 'info',
			variant: 'solid',
			class: {
				root: 'bg-info-500 border-transparent text-neutral-950 shadow-[0_0_20px_rgba(0,199,255,0.25)]',
			},
		},
		{
			color: 'info',
			variant: 'outline',
			class: {
				root: 'pcb-trace-left bg-transparent border-info-500/30 text-info-600 dark:text-info-400',
			},
		},
		{
			color: 'info',
			variant: 'soft',
			class: {
				root: 'pcb-trace-left bg-info-500/10 border-info-500/15 text-info-600 dark:text-info-400',
			},
		},
		{
			color: 'info',
			variant: 'subtle',
			class: {
				root: 'pcb-trace-left bg-info-500/8 border-info-500/25 text-info-700 dark:text-info-300',
			},
		},
		// ─── NEUTRAL ──────────────────────────────────────────────────────────
		{
			color: 'neutral',
			variant: 'solid',
			class: {
				root: 'bg-(--ui-bg-accented) border-(--ui-border-accented) text-(--ui-text-highlighted)',
			},
		},
		{
			color: 'neutral',
			variant: 'outline',
			class: {
				root: 'bg-transparent border-(--ui-border) text-(--ui-text-toned)',
			},
		},
		{
			color: 'neutral',
			variant: 'soft',
			class: {
				root: 'bg-(--ui-bg-accented)/50 border-(--ui-border)/60 text-(--ui-text-toned)',
			},
		},
		{
			color: 'neutral',
			variant: 'subtle',
			class: {
				root: 'bg-(--ui-bg-accented)/30 border-(--ui-border)/40 text-(--ui-text-dimmed)',
			},
		},
	],
}
