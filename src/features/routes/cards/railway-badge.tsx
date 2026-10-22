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
 * The disc's colour: Start's green and End's red, as the map's Start and End pills wear them. On
 * MRT-3's dark chip Figma draws the brighter -light shades of both.
 */
const SIGN = {
  start: {
    'LRT-1': 'text-map-hotspots-card-hintuan-surface',
    'LRT-2': 'text-map-hotspots-card-hintuan-surface',
    'MRT-3': 'text-card-green-surface-light',
    Ferry: 'text-map-hotspots-card-hintuan-surface',
  },
  end: {
    'LRT-1': 'text-card-red-surface',
    'LRT-2': 'text-card-red-surface',
    'MRT-3': 'text-card-red-surface-light',
    Ferry: 'text-card-red-surface',
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
