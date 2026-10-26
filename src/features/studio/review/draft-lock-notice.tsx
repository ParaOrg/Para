import { Button } from '@/design-system/primitives/button';

import { lockMessage, type DraftLock } from '../data/draft-lock';

interface DraftLockNoticeProps {
  lock: DraftLock;
  onRetry: () => void;
}

/** Stands where a card's Edit would be while another editor holds the draft. */
export function DraftLockNotice({ lock, onRetry }: DraftLockNoticeProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p role="status" className="text-sm text-content-secondary">
        {lockMessage(lock)}
      </p>
      {lock.state === 'unknown' && (
        <Button variant="secondary" label="Try again" onClick={onRetry} />
      )}
    </div>
  );
}
