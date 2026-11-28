import { Button } from '@/design-system/primitives/button';

import { discardWaitMessage, type OtherDiscard } from '../data/draft-discard';
import { lockMessage, type DraftLock } from '../data/draft-lock';

interface DraftLockNoticeProps {
  lock: DraftLock;
  onRetry: () => void;
  /** Another editor's draft: approving it as it stands, which any editor may. */
  onApprove?: () => void;
  isApproving?: boolean;
  /** Where the draft stands for discarding: after 7 days without a change, Discard; before, a line. */
  otherDiscard?: OtherDiscard | null;
  onDiscard?: () => void;
  isDiscarding?: boolean;
  /** Why Approve or Discard did nothing, in the editor's words. */
  error?: string | null;
}

/**
 * Stands where a card's Edit would be while another editor holds the draft: who is changing it,
 * and Approve, which publishes their draft as it stands. A draft left 7 days without a change
 * may also be discarded (Discard…, which asks first); before that, one line says from when.
 * Approve and Discard are a look for now, until the owner designs them.
 */
export function DraftLockNotice({
  lock,
  onRetry,
  onApprove,
  isApproving = false,
  otherDiscard = null,
  onDiscard,
  isDiscarding = false,
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
          disabled={isApproving || isDiscarding}
        />
      )}
      {lock.state === 'other' && otherDiscard?.state === 'wait' && (
        <p className="text-sm text-content-secondary">{discardWaitMessage(otherDiscard.from)}</p>
      )}
      {lock.state === 'other' && otherDiscard?.state === 'ready' && onDiscard && (
        <Button
          variant="plain"
          tone="error"
          size="small"
          label={isDiscarding ? 'Discarding…' : 'Discard…'}
          onClick={onDiscard}
          disabled={isDiscarding || isApproving}
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
