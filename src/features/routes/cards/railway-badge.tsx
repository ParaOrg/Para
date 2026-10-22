import { EndIcon, StartIcon } from '@/shared/ui/route-icons';

import type { RailwayVehicle } from '../model/vehicles';

interface RailwayBadgeProps {
  /** Which end of the line the station is: the S disc for where it starts, the E for where it ends. */
  kind: 'start' | 'end';
  /** The line it sits on. It sets the badge's fill and words. */
  railway: RailwayVehicle;
  /** The station's code, `GL02`. */
  code: string;
}

/**
 * The badge's fill and words, as the line's pill wears them: the line's surface on white, and on
 * MRT-3's yellow its yellow on Content/primary.
 */
const BADGE = {
  'LRT-1': 'bg-content-inverse text-map-rail-light-rail-way-one-surface',
  'LRT-2': 'bg-content-inverse text-map-rail-light-rail-way-two-surface',
  'MRT-3': 'bg-content-primary text-map-rail-metro-rail-way-three-surface',
  Ferry: 'bg-content-inverse text-map-ferry-surface',
} satisfies Record<RailwayVehicle, string>;

/**
 * The disc's colour: green for the start and red for the end, the shade the line's chip allows. On
 * MRT-3's dark chip Figma draws brighter ones (#00C951, #E7000B), bound to no variable.
 */
const SIGN = {
  start: {
    'LRT-1': 'text-content-success',
    'LRT-2': 'text-content-success',
    'MRT-3': 'text-map-overlay-card-hintuan-surface',
    Ferry: 'text-content-success',
  },
  end: {
    'LRT-1': 'text-error-surface-secondary',
    'LRT-2': 'text-error-surface-secondary',
    'MRT-3': 'text-content-error',
    Ferry: 'text-error-surface-secondary',
  },
} satisfies Record<RailwayBadgeProps['kind'], Record<RailwayVehicle, string>>;

/**
 * Figma's RailwayBadge (4307:24642): a station's sign and its code, each in a round chip of the
 * line's colours, 4 apart. The origin wears Start's, a row's destination End's.
 */
export function RailwayBadge({ kind, railway, code }: RailwayBadgeProps) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <span aria-hidden className={'flex rounded-full *:size-5 ' + BADGE[railway]}>
        <span className={'flex ' + SIGN[kind][railway]}>
          {kind === 'start' ? <StartIcon /> : <EndIcon />}
        </span>
      </span>
      <span
        className={
          'flex min-w-12 items-center justify-center rounded-full px-1.5 text-center text-sm/5 font-medium ' +
          BADGE[railway]
        }
      >
        {code}
      </span>
    </span>
  );
}
