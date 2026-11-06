import { useRef } from 'react';

import { messageOf } from './account-message';
import { DeleteAccountScreen } from './delete-account-screen';
import { useDeleteAccountMutation } from '../api/use-delete-account-mutation';

interface DeleteAccountViewProps {
  onBack: () => void;
}

/**
 * Delete account with its data. Once Para has deleted it the session goes, and the page asks for
 * Sign in.
 */
export function DeleteAccountView({ onBack }: DeleteAccountViewProps) {
  const deletion = useDeleteAccountMutation();
  // Two taps in one moment start one delete: isPending is only seen on the next render.
  const isSending = useRef(false);
  const handleDelete = () => {
    if (isSending.current) return;
    isSending.current = true;
    deletion.mutate(undefined, {
      onSettled: () => {
        isSending.current = false;
      },
    });
  };
  return (
    <DeleteAccountScreen
      isDeleting={deletion.isPending}
      error={messageOf(deletion.error)}
      onAsked={() => deletion.reset()}
      onDelete={handleDelete}
      onBack={onBack}
    />
  );
}
