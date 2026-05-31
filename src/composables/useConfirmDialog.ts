import ConfirmDialog from '@/components/overlay/ConfirmDialog.vue'

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
