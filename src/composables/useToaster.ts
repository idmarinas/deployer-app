/**
 * Composable para crear toast de forma controlada y unificada en diseño
 */

import type { Toast } from '@nuxt/ui/runtime/composables/useToast.js'

type ToasterOptions = Partial<Omit<Toast, 'title' | 'description'>>
type ToasterType = 'success' | 'warning' | 'error' | 'info'

const styles: Record<ToasterType, Pick<ToasterOptions, 'color' | 'icon'>> = {
	success: { icon: 'i-tabler-check', color: 'success' },
	error: { icon: 'i-tabler-x', color: 'error' },
	warning: { icon: 'i-tabler-exclamation-circle', color: 'warning' },
	info: { icon: 'i-tabler-info-circle', color: 'info' },
}

export default function useToaster() {
	const toast = useToast()

	function build(type: ToasterType, title?: string, description?: string, options: ToasterOptions = {}) {
		return { title, description, ...styles[type], ...options }
	}

	function success(title?: string, description?: string, options: ToasterOptions = {}): Toast {
		return toast.add(build('success', title, description, options))
	}

	function error(title?: string, description?: string, options: ToasterOptions = {}): Toast {
		return toast.add(build('error', title, description, options))
	}

	function warning(title?: string, description?: string, options: ToasterOptions = {}): Toast {
		return toast.add(build('warning', title, description, options))
	}

	function info(title?: string, description?: string, options: ToasterOptions = {}): Toast {
		return toast.add({
			title: title,
			description: description,
			color: 'info',
			icon: 'i-tabler-info-circle',
			...options,
		})
	}

	return {
		toast,
		success,
		error,
		warning,
		info,
	}
}
