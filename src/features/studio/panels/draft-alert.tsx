import { Button } from '@/design-system/primitives/button';

interface DraftAlertProps {
  /** Why the last press did nothing, in the editor's words; null when nothing failed. */
  error: string | null;
  /** Keep my draft, offered when an approval of the editor's own draft was refused as stale. */
  onKeep?: () => void;
  isKeeping?: boolean;
  /** What Keep my draft did: kept, or why not. */
  keepNotice?: string | null;
}

/**
 * The sidebar's alert under its form: why a save, an approval or a discard did nothing, and on a
 * stale draft Keep my draft beside it. Keep my draft is a look for now, until the owner designs it.
 */
export function DraftAlert({
  error,
  onKeep,
  isKeeping = false,
  keepNotice = null,
}: DraftAlertProps) {
  // The status region stays mounted, empty or not, so a screen reader hears the kept notice arrive;
  // out of the flow (sr-only) while there is nothing to see, so the form's gaps stay as they were.
  const status = (
    <p role="status" className={keepNotice ? 'text-sm text-content-secondary' : 'sr-only'}>
      {keepNotice}
    </p>
  );
  if (!error && !keepNotice) return status;
  return (
    <div className="flex flex-col items-start gap-2">
      {error && (
        <p role="alert" className="text-sm text-content-error">
          {error}
        </p>
      )}
      {error && onKeep && (
        <Button
          variant="secondary"
          size="small"
          label={isKeeping ? 'Keeping…' : 'Keep my draft'}
          onClick={onKeep}
          disabled={isKeeping}
        />
      )}
      {status}
    </div>
  );
}
