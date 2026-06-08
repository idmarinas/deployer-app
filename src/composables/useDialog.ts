import ConfirmDialog from '@/components/overlay/ConfirmDialog.vue'
import GeneratedPasskeyFormDialog from '@/components/overlay/forms/GeneratePasskeyDialog.vue'
import { GeneratedPasskey } from '@/types/tauri-types'

export interface ConfirmDialogOptions {
  title: string
  description?: string,
  type: 'yes_no' | 'cancel_confirm' | 'cancel_delete'
}

export const useConfirmDialog = () => {
  const overlay = useOverlay()

  return (options: ConfirmDialogOptions): Promise<boolean> => {
    const modal = overlay.create(ConfirmDialog, {
      destroyOnClose: true,
      props: options
    })

    return modal.open()
  }
}

export const useGeneratePasskeyDialog = () => {
  const overlay = useOverlay()

  return (options: Record<string, any> = {}): Promise<GeneratedPasskey | false> => {
    const modal = overlay.create(GeneratedPasskeyFormDialog, {
      destroyOnClose: true,
      props: options
    })

    return modal.open()
  }
}