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
  if (!error && !keepNotice) return null;
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
      {keepNotice && (
        <p role="status" className="text-sm text-content-secondary">
          {keepNotice}
        </p>
      )}
    </div>
  );
}
