import { FOOTER } from './sheet';

interface SaveFooterProps {
  isBusy: boolean;
  /** Update a saved direction, rather than save a new one. */
  isEdit: boolean;
  onCancel: () => void;
}

/** The save panel's two buttons: Back to map, and Save or Update (the form's submit). */
export function SaveFooter({ isBusy, isEdit, onCancel }: SaveFooterProps) {
  return (
    <div className={FOOTER}>
      <button
        type="button"
        onClick={onCancel}
        disabled={isBusy}
        className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300"
      >
        Back to map
      </button>
      <button
        type="submit"
        disabled={isBusy}
        className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitLabel(isBusy, isEdit)}
      </button>
    </div>
  );
}

function submitLabel(isBusy: boolean, isEdit: boolean): string {
  if (isBusy) return 'Saving…';
  return isEdit ? 'Update' : 'Save';
}
