import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

import { distanceFigure, timeFigure, type Figure } from '../common/format';

/** Figma's RecordingComponent states: RecordingLakad, RecordingSakay and Paused. */
export type RecordingCardState = 'lakad' | 'sakay' | 'paused';

interface RecordingCardProps {
  /** Time recorded so far, pauses left out. */
  elapsedSeconds: number;
  distanceM: number;
  state: RecordingCardState;
  /** The two bars along its foot, each with its outer corner rounded. */
  children: ReactNode;
}

/** The big word in the middle: the mode recording now, or none while paused. */
const MIDDLE = {
  lakad: 'Lakad',
  sakay: 'Sakay',
  paused: '--',
} satisfies Record<RecordingCardState, string>;

const STATUS = {
  lakad: 'Recording',
  sakay: 'Recording',
  paused: 'Paused',
} satisfies Record<RecordingCardState, string>;

// The status dot: a pale ring round a dark dot. Blue and green are Figma's "(don't-add)" card
// colours, taken from Tailwind directly as the tracking bars take them; red is the red card's.
const DOT_RING = {
  lakad: 'bg-blue-300',
  sakay: 'bg-green-300',
  paused: 'bg-card-red-surface-pale',
} satisfies Record<RecordingCardState, string>;

const DOT = {
  lakad: 'bg-blue-800',
  sakay: 'bg-green-800',
  paused: 'bg-card-red-border-primary',
} satisfies Record<RecordingCardState, string>;

interface StatProps {
  label: string;
  figure: Figure;
}

/** Time or Distance: the figure over its name, as Figma stacks them. */
function Stat({ label, figure }: StatProps) {
  return (
    <div className="flex flex-1 flex-col-reverse gap-0.5 text-center">
      <dt className="text-sm/5 text-content-quaternary">{label}</dt>
      <dd className="text-2xl/8 font-semibold text-content-primary">
        {figure.value} <span className="text-content-quaternary">{figure.unit}</span>
      </dd>
    </div>
  );
}

/**
 * Figma's RecordingComponent (4482:24179): Time, the mode with its dot and
 * whether it is recording, and Distance, over two bars. The figures change
 * every second, so nothing here is a live region; a switch of mode is
 * announced once on its own (RecordingScreen).
 */
export function RecordingCard({ elapsedSeconds, distanceM, state, children }: RecordingCardProps) {
  return (
    <div className="flex flex-col rounded-4xl bg-surface font-sn-pro">
      <dl
        role="group"
        aria-label="Recording so far"
        className="flex items-end justify-between px-2 py-4"
      >
        <Stat label="Time" figure={timeFigure(elapsedSeconds)} />
        <div className="flex flex-1 flex-col-reverse gap-1 text-center">
          <dt className="flex items-center justify-center gap-1 text-sm/5 text-content-quaternary">
            <span aria-hidden className={cn('rounded-full p-0.5', DOT_RING[state])}>
              <span className={cn('block size-2 rounded-full', DOT[state])} />
            </span>
            {STATUS[state]}
          </dt>
          <dd className="text-4xl/10 font-semibold text-content-primary">
            <span aria-hidden={state === 'paused'}>{MIDDLE[state]}</span>
            {state === 'paused' && <span className="sr-only">no mode</span>}
          </dd>
        </div>
        <Stat label="Distance" figure={distanceFigure(distanceM)} />
      </dl>
      <div className="flex">{children}</div>
    </div>
  );
}
