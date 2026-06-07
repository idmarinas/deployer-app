import ConfirmDialog from '@/components/overlay/ConfirmDialog.vue'
import Formdialog from '@/components/overlay/Formdialog.vue'

export interface ConfirmDialogOptions {
  title: string
  description?: string,
  type: 'yes_no' | 'cancel_confirm' | 'cancel_delete'
}

export interface FormDialogOptions {
  title: string
  description?: string
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

export const useFormDialog = () => {
  const overlay = useOverlay()

  return (options: FormDialogOptions): Promise<string> => {
    const modal = overlay.create(Formdialog, {
      destroyOnClose: true,
      props: options
    })

    return modal.open()
  }
}