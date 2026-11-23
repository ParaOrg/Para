import { Button } from '@/design-system/primitives/button';

import type { HistoryLoad } from './use-history-items';

interface HistoryLoadLineProps {
  load: HistoryLoad;
}

/** Why the account's uploads have not arrived, and Try again. While they load, skeletons stand in. */
export function HistoryLoadLine({ load }: HistoryLoadLineProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p role="alert" className="text-base/6 text-content-quaternary">
        {load.message}
      </p>
      <Button variant="secondary" size="small" label="Try again" onClick={load.onRetry} />
    </div>
  );
}
