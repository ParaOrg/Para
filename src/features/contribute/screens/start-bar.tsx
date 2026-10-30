import { cn } from '@/shared/utils/cn';

import { PlayIcon } from './tracking-icons';

interface StartBarProps {
  onClick: () => void;
}

// The map's two bottom corners, rounded 32 px (radius/4xl) into the bar's colour: each a square of
// the bar's colour with a quarter circle cut out of it, standing on the bar's top edge.
const CORNER_LEFT =
  'left-0 [mask-image:radial-gradient(circle_at_100%_0,transparent_2rem,black_2rem)]';
const CORNER_RIGHT =
  'right-0 [mask-image:radial-gradient(circle_at_0_0,transparent_2rem,black_2rem)]';

/**
 * Figma's "Start Tracking" bar (4485:24832): the whole width of the phone's foot, in the brand's
 * dark, under the map, whose bottom corners it rounds. One button, so all of it starts a recording.
 */
export function StartBar({ onClick }: StartBarProps) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className={cn('absolute -top-8 size-8 bg-brand-surface-secondary', CORNER_LEFT)}
      />
      <span
        aria-hidden
        className={cn('absolute -top-8 size-8 bg-brand-surface-secondary', CORNER_RIGHT)}
      />
      <button
        type="button"
        aria-label="Start recording"
        onClick={onClick}
        className="flex w-full items-center justify-center gap-2 bg-brand-surface-secondary px-2 pt-5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] font-sn-pro text-base/6 font-medium text-content-inverse focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-content-inverse"
      >
        <span aria-hidden className="size-6 shrink-0 *:size-full">
          <PlayIcon />
        </span>
        Start Tracking
      </button>
    </div>
  );
}
