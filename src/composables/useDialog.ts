import type { GeneratedPasskey } from '@/types/tauri-types'
import type { Passkey } from '@/types/entities'

import ConfirmDialog from '@/components/overlay/ConfirmDialog.vue'
import CopyPasskeyToServerDialog from '@/components/overlay/forms/CopyPasskeyToServerDialog.vue'
import GeneratedPasskeyFormDialog from '@/components/overlay/forms/GeneratePasskeyDialog.vue'
import ReviewFilesDialog, {
	type ReviewFileItem,
} from '@/components/overlay/forms/ReviewFilesDialog.vue'

export interface ConfirmDialogOptions {
	title: string
	description?: string
	type: 'yes_no' | 'cancel_confirm' | 'cancel_delete' | 'cancel_update'
}

export const useConfirmDialog = () => {
	const overlay = useOverlay()

	return (options: ConfirmDialogOptions): Promise<boolean> => {
		const modal = overlay.create(ConfirmDialog, {
			destroyOnClose: true,
			props: options,
		})

		return modal.open()
	}
}

export const useGeneratePasskeyDialog = () => {
	const overlay = useOverlay()

	return (options: Record<string, any> = {}): Promise<GeneratedPasskey | false> => {
		const modal = overlay.create(GeneratedPasskeyFormDialog, {
			destroyOnClose: true,
			props: options,
		})

		return modal.open()
	}
}

export const useCopyPasskeyToServer = () => {
	const overlay = useOverlay()

	return (options: { passkey: Passkey }): Promise<boolean> => {
		const modal = overlay.create(CopyPasskeyToServerDialog, {
			destroyOnClose: true,
			props: options,
		})

		return modal.open()
	}
}

export const useReviewFilesDialog = () => {
	const overlay = useOverlay()

	return (options: {
		items: ReviewFileItem[]
		existingPaths: string[]
		ignoredDirs?: string[]
	}): Promise<{ confirm: boolean; removedPaths: string[] }> => {
		const modal = overlay.create(ReviewFilesDialog, {
			destroyOnClose: true,
			props: options,
		})

		return modal.open()
	}
}
