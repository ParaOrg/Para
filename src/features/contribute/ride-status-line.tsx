import type { ComponentType } from 'react';

import { ReloadIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import type { StatusIcon, StatusLine } from './history-groups';
import { AlertIcon, ClockIcon } from './history-icons';

interface RideStatusLineProps {
  line: StatusLine | null;
}

const ICONS: Record<StatusIcon, ComponentType> = {
  clock: ClockIcon,
  reload: ReloadIcon,
  alert: AlertIcon,
};

/**
 * A card's upload status: an icon and a short word, so the state never rests on colour alone.
 * Always rendered, empty when there is nothing to say, so a screen reader hears the change.
 */
export function RideStatusLine({ line }: RideStatusLineProps) {
  const Icon = line ? ICONS[line.icon] : null;
  return (
    <p
      aria-live="polite"
      className={cn(
        'flex items-center gap-1.5 text-sm/5 empty:hidden',
        line?.isError ? 'text-content-error' : 'text-content-quaternary',
      )}
    >
      {line && Icon && (
        <>
          <span
            aria-hidden
            className={cn(
              'size-4 shrink-0 *:size-full',
              line.icon === 'reload' && 'motion-safe:animate-spin',
            )}
          >
            <Icon />
          </span>
          <span>
            <span className="font-medium">{line.word}</span>
            {line.reason && ` · ${line.reason}`}
          </span>
        </>
      )}
    </p>
  );
}
