// LED de estado — Command Module.
// Sólido: LED activo con glow + shadow interno para efecto "componente físico".
// Outline: solo aro silkscreen (componente sin encender).
// El clip-path pcb-clip-badge da la silueta de SMD.
const groupFirst = 'not-only:first:[clip-path:polygon(6px_0%,100%_0%,100%_100%,0%_100%)]'
const groupLast = 'not-only:last:[clip-path:polygon(0%_0%,100%_0%,calc(100%_-_6px)_100%,0%_100%)]'
const groupMiddle = 'not-last:not-first:[clip-path:polygon(0%_0%,100%_0%,100%_100%,0%_100%)]'
const fieldGroup = [groupFirst, groupLast, groupMiddle].join(' ')

const ledInset =
	'shadow-[inset_0_1px_0_color-mix(in_srgb,white_18%,transparent),inset_0_-2px_4px_color-mix(in_srgb,black_15%,transparent)]'
const ledInsetLight =
	'shadow-[inset_0_1px_0_color-mix(in_srgb,white_25%,transparent),inset_0_-2px_4px_color-mix(in_srgb,black_12%,transparent)]'

export default {
	slots: {
		base: 'pcb-clip-badge font-pcb font-medium tracking-wider uppercase relative',
	},
	variants: {
		fieldGroup: {
			horizontal: fieldGroup,
			vertical: fieldGroup,
		},
	},
	compoundVariants: [
		{
			color: 'primary',
			variant: 'solid',
			class: `bg-primary-500 text-white [filter:drop-shadow(0_0_8px_var(--pcb-trace-glow))] ${ledInset}`,
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
		{
			color: 'secondary',
			variant: 'solid',
			class: `bg-secondary-500 text-white [filter:drop-shadow(0_0_8px_color-mix(in_srgb,var(--color-deployer-secondary-500)_50%,transparent))] ${ledInset}`,
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
		{
			color: 'success',
			variant: 'solid',
			class: `bg-success-500 text-neutral-950 [filter:drop-shadow(0_0_8px_color-mix(in_srgb,var(--color-deployer-success-500)_50%,transparent))] ${ledInsetLight}`,
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
			color: 'info',
			variant: 'solid',
			class: `bg-info-500 text-neutral-950 [filter:drop-shadow(0_0_8px_color-mix(in_srgb,var(--color-deployer-info-500)_50%,transparent))] ${ledInsetLight}`,
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
		{
			color: 'warning',
			variant: 'solid',
			class: `bg-warning-500 text-neutral-950 [filter:drop-shadow(0_0_8px_color-mix(in_srgb,var(--color-deployer-warning-500)_50%,transparent))] ${ledInsetLight}`,
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
		{
			color: 'error',
			variant: 'solid',
			class: `bg-error-500 text-white [filter:drop-shadow(0_0_8px_color-mix(in_srgb,var(--color-deployer-error-500)_50%,transparent))] ${ledInset}`,
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
		{
			color: 'neutral',
			variant: 'solid',
			class:
				'bg-neutral-700 text-white shadow-[inset_0_1px_0_color-mix(in_srgb,white_12%,transparent),inset_0_-2px_4px_color-mix(in_srgb,black_20%,transparent)]',
		},
		{
			color: 'neutral',
			variant: 'outline',
			class:
				'bg-neutral-500/5 text-neutral-700 dark:text-neutral-300 ring-1 ring-inset ring-neutral-400/50 dark:ring-neutral-600/50',
		},
		{
			color: 'neutral',
			variant: 'soft',
			class: 'bg-neutral-500/10 text-neutral-700 dark:text-neutral-300',
		},
		{
			color: 'neutral',
			variant: 'subtle',
			class:
				'bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 ring-1 ring-inset ring-neutral-400/25 dark:ring-neutral-600/25',
		},
	],
}
