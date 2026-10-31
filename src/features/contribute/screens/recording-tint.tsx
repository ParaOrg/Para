import { cn } from '@/shared/utils/cn';

import type { RecordingCardState } from './recording-card';

// Figma's OverlayIndicator (4493:1697): each state's colour at 10% at the edge, the blue and green
// of the mode bars, and Paused in neutral/900.
const FROM = {
  lakad: 'from-blue-700/10',
  sakay: 'from-green-700/10',
  paused: 'from-neutral-900/10',
} satisfies Record<RecordingCardState, string>;

// Its four gradients, each fading to nothing: from the left edge a quarter of the way in, from
// the other three an eighth.
const EDGES = [
  'bg-linear-to-r to-transparent to-25%',
  'bg-linear-to-b to-transparent to-[12.5%]',
  'bg-linear-to-l to-transparent to-[12.5%]',
  'bg-linear-to-t to-transparent to-[12.5%]',
];

interface RecordingTintProps {
  state: RecordingCardState;
}

/** The map's edges tinted for the state the recording is in, so it shows at a glance. */
export function RecordingTint({ state }: RecordingTintProps) {
  return (
    <div aria-hidden data-tint={state} className="pointer-events-none absolute inset-0">
      {EDGES.map((edge) => (
        <span key={edge} className={cn('absolute inset-0', edge, FROM[state])} />
      ))}
    </div>
  );
}
