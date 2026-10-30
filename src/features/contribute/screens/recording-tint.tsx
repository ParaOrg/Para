import { cn } from '@/shared/utils/cn';

import type { RecordingCardState } from './recording-card';

// The colour each state tints the map's edges, at 8%: the blue and green of the mode bars, and
// the red card's surface while paused.
const FROM = {
  lakad: 'from-blue-700/8',
  sakay: 'from-green-700/8',
  paused: 'from-card-red-surface/8',
} satisfies Record<RecordingCardState, string>;

// Figma's four gradients (4481:23631): from the left edge a quarter of the way in, from the other
// three an eighth.
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
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {EDGES.map((edge) => (
        <span key={edge} className={cn('absolute inset-0', edge, FROM[state])} />
      ))}
    </div>
  );
}
