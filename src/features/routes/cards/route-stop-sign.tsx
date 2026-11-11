import { EndIcon, StartIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import type { Livery } from '../model/liveries';

export type RouteStopSignKind = 'start' | 'end';

interface RouteStopSignProps {
  kind: RouteStopSignKind;
  /** The card it sits on: a light card's sign is dark, as its badges are. */
  livery: Livery;
}

/** The disc behind the letter: white on a dark card, Background/surface-inverse on a light one. */
const DISC = {
  jeep: 'bg-content-inverse',
  'uv-express': 'bg-surface-inverse',
  ejeep: 'bg-surface-inverse',
  bus: 'bg-content-inverse',
  'light-rail-way-one': 'bg-content-inverse',
  'light-rail-way-two': 'bg-content-inverse',
  'metro-rail-way-three': 'bg-surface-inverse',
  ferry: 'bg-content-inverse',
} satisfies Record<Livery, string>;

/** Start's green and End's red; on a dark disc their lighter shades, which read there. */
const LETTER = {
  start: {
    jeep: 'text-trip-start',
    'uv-express': 'text-card-green-surface-light',
    ejeep: 'text-card-green-surface-light',
    bus: 'text-trip-start',
    'light-rail-way-one': 'text-trip-start',
    'light-rail-way-two': 'text-trip-start',
    'metro-rail-way-three': 'text-card-green-surface-light',
    ferry: 'text-trip-start',
  },
  end: {
    jeep: 'text-trip-end',
    'uv-express': 'text-card-red-surface-light',
    ejeep: 'text-card-red-surface-light',
    bus: 'text-trip-end',
    'light-rail-way-one': 'text-trip-end',
    'light-rail-way-two': 'text-trip-end',
    'metro-rail-way-three': 'text-card-red-surface-light',
    ferry: 'text-trip-end',
  },
} satisfies Record<RouteStopSignKind, Record<Livery, string>>;

/**
 * Where a ride starts and ends, in a stop's slot (RouteStopsCard, 4681:29138): Start's S or End's
 * E, 20, on a disc in the card's colours. For the eye: its row says "start" or "end" in words.
 */
export function RouteStopSign({ kind, livery }: RouteStopSignProps) {
  return (
    <span
      aria-hidden
      data-part={kind}
      className={cn(
        'flex size-5 shrink-0 rounded-full *:size-full',
        DISC[livery],
        LETTER[kind][livery],
      )}
    >
      {kind === 'start' ? <StartIcon /> : <EndIcon />}
    </span>
  );
}
