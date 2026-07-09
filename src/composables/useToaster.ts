/**
 * Composable para crear toast de forma controlada y unificada en diseño
 * @returns
 */

export default function useToaster() {
	const toast = useToast()

	function success(title?: string, description?: string, options = {}) {
		return toast.add({
			title: title,
			description: description,
			icon: 'i-tabler-check',
			color: 'success',
			...options,
		})
	}

	function error(title?: string, description?: string, options = {}) {
		return toast.add({
			title: title,
			description: description,
			icon: 'i-tabler-x',
			color: 'error',
			...options,
		})
	}

	function warning(title?: string, description?: string, options = {}) {
		return toast.add({
			title: title,
			description: description,
			color: 'warning',
			icon: 'i-tabler-exclamation-circle',
			...options,
		})
	}

	function info(title?: string, description?: string, options = {}) {
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
