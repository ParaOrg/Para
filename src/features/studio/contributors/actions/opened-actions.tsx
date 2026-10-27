import { DeleteUpload } from '../delete-upload';
import { HideUpload } from '../hide-upload';
import type { ContributionStart } from './contribution-start';
import { UseThisLine } from './use-this-line';
import type { Contribution } from '../../data/contributions-read';

interface OpenedActionsProps {
  contribution: Contribution;
  /** Whether hidden uploads are listed: hiding one then leaves it open. */
  showHidden: boolean;
  onClose: () => void;
  onNotice: (text: string) => void;
  onStart: (start: ContributionStart) => void;
}

/** What an editor may do with the opened upload: use its line, hide it, delete it. */
export function OpenedActions({
  contribution: c,
  showHidden,
  onClose,
  onNotice,
  onStart,
}: OpenedActionsProps) {
  return (
    <>
      <UseThisLine contribution={c} onStart={onStart} />
      <HideUpload
        contributionId={c.id}
        hiddenAt={c.hiddenAt}
        hiddenNote={c.hiddenNote}
        onChanged={(message, isHidden) => {
          onNotice(message);
          // Out of the list it was opened from, so it closes too.
          if (isHidden && !showHidden) onClose();
        }}
      />
      <DeleteUpload
        contributionId={c.id}
        onDeleted={() => {
          onClose();
          onNotice('Upload deleted from Para.');
        }}
      />
    </>
  );
}
