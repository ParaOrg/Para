import { cn } from '@/shared/utils/cn';

import { RAILWAY_PILL } from './livery-card';
import type { RailLine } from '../model/routes';

interface RailwayBadgeProps {
  /** The train line it sits on. It sets the badge's fill and words; the ferry has no badges. */
  railway: RailLine;
  /** The station's code, `GL02`. */
  code: string;
}

/**
 * A station's code in a round chip of the line's colours, Medium 14/20 (Badge, RouteCardRailway
 * 4633:25360): beside the origin's name and after each row's.
 */
export function RailwayBadge({ railway, code }: RailwayBadgeProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full px-1.5 text-sm/5 font-medium',
        RAILWAY_PILL[railway],
      )}
    >
      {code}
    </span>
  );
}
