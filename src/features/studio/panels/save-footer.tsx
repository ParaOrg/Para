import { FOOTER, FOOTER_BESIDE } from './sheet';

interface SaveFooterProps {
  isBusy: boolean;
  /** Update a saved direction, rather than save a new one. */
  isEdit: boolean;
  /**
   * Why Save can't go yet (whyNotDone): the line is too short, or the router
   * still owes it road. Only beside the map, where the line is still drawn.
   */
  saveBlocked?: string | null;
  /** Back to the map. Absent beside the map, which was never left. */
  onCancel?: () => void;
}

/** The save panel's buttons: Back to map when it covers the map, and Save or Update (the form's submit). */
export function SaveFooter({ isBusy, isEdit, saveBlocked = null, onCancel }: SaveFooterProps) {
  return (
    <div className={onCancel ? FOOTER : FOOTER_BESIDE}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300"
        >
          Back to map
        </button>
      )}
      <button
        type="submit"
        disabled={isBusy || saveBlocked !== null}
        title={saveBlocked ?? undefined}
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
