import { Button } from '@/design-system/primitives/button';

import { lockMessage, type DraftLock } from '../data/draft-lock';

interface DraftLockNoticeProps {
  lock: DraftLock;
  onRetry: () => void;
  /** Another editor's draft: approving it as it stands, which any editor may. */
  onApprove?: () => void;
  isApproving?: boolean;
  /** Why Approve did nothing, in the editor's words. */
  error?: string | null;
}

/**
 * Stands where a card's Edit would be while another editor holds the draft: who is changing it,
 * and Approve, which publishes their draft as it stands. Approve is a look for now, until the
 * owner designs it.
 */
export function DraftLockNotice({
  lock,
  onRetry,
  onApprove,
  isApproving = false,
  error = null,
}: DraftLockNoticeProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p role="status" className="text-sm text-content-secondary">
        {lockMessage(lock)}
      </p>
      {lock.state === 'unknown' && (
        <Button variant="secondary" label="Try again" onClick={onRetry} />
      )}
      {lock.state === 'other' && onApprove && (
        <Button
          variant="secondary"
          size="small"
          label={isApproving ? 'Approving…' : 'Approve'}
          onClick={onApprove}
          disabled={isApproving}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-content-error">
          {error}
        </p>
      )}
    </div>
  );
}
