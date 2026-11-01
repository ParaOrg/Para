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
  return (
    <DeleteAccountScreen
      isDeleting={deletion.isPending}
      error={messageOf(deletion.error)}
      onAsked={() => deletion.reset()}
      onDelete={(deleteUploads) => deletion.mutate({ deleteUploads })}
      onBack={onBack}
    />
  );
}
