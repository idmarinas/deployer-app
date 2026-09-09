import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	dialog: {
		yes_no: {
			cancel: 'No',
			confirm: 'Yes',
		},
		cancel_confirm: {
			cancel: 'Cancel',
			confirm: 'Confirm',
		},
		cancel_delete: {
			cancel: 'Cancel',
			confirm: 'Delete',
		},
		generate_passkey: {
			cancel: 'Cancel',
			confirm: 'Generate',
		},
		passkey_to_server: {
			cancel: 'Cancel',
			copy: 'Copy to host',
			remove: 'Remove from host',
		},
		cancel_update: {
			cancel: 'Cancel',
			confirm: 'Update',
		},
		files_review: {
			cancel: 'Cancel',
			confirm: 'Confirm',
			title: 'Review files',
			nothing_to_upload: 'No valid files to upload.',
			action_add: 'Add',
			action_replace: 'Replace',
			action_reject_size: 'Rejected: size',
			action_reject_type: 'Rejected: type',
			remove: 'Remove from import',
			restore: 'Restore',
			removed_count: '1 file removed | {count} files removed',
		},
	},
	toast: {
		title: {
			canceled: 'Operation canceled',
			completed: 'Completed',
			error: 'An error occurred',
			loading: 'Processing...',
			success: 'Operation successful',
		},
		description: {
			canceled: (ctx: MessageContext) => {
				const reason = ctx.named('reason')
				return reason
					? `The operation has been canceled. Reason: ${reason}`
					: 'The operation has been canceled by the user.'
			},
			completed: 'The process has finished successfully.',
			error: (ctx: MessageContext) => {
				const details = ctx.named('details')
				return details
					? `Could not complete the operation. Details: ${details}`
					: 'Could not complete the requested action. Please try again.'
			},
			loading: 'Please wait while the operation completes.',
			success: 'The changes have been saved and applied successfully.',
		},
	},
} satisfies LocaleMessageValue