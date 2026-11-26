import type { SpotMatch } from './spot-source';
import type { Hotspot } from '../model/hotspots';
import type { LandmarkMatch } from '../model/landmark-search';
import type { PlaceMatch } from '../model/place-search';
import type { Vehicle } from '../model/vehicles';
import type { LandmarkKind } from '../published/landmark-file-schema';

/** One row of place search's results: a Para place with what rides from it, a landmark, or a spot. */
export type SearchRow =
  | {
      type: 'place';
      match: PlaceMatch;
      vehicles: Vehicle[];
      /** A word after the place's label, from the caller: the studio's "Draft". */
      note: string | null;
    }
  | { type: 'landmark'; match: LandmarkMatch }
  | { type: 'spot'; match: SpotMatch };

/** A row's key, stable while the results stand: a place's by its name, a landmark's by its OSM id. */
export function rowKey(row: SearchRow): string {
  if (row.type === 'place') return `place:${row.match.place.key}`;
  if (row.type === 'landmark') return `landmark:${row.match.landmark.id}`;
  return `spot:${row.match.spot.id}`;
}

/** What each kind of landmark is called beside its name. */
export const LANDMARK_KIND_LABEL = {
  mall: 'Mall',
  school: 'School',
  university: 'University',
  hospital: 'Hospital',
  worship: 'Place of worship',
  market: 'Market',
  station: 'Station',
  barangay: 'Barangay',
  street: 'Street',
} satisfies Record<LandmarkKind, string>;

/** The box a place opens by, as a tap on its name would: its terminal, else its first box. */
export function boxToOpen(match: PlaceMatch): Hotspot {
  const { hotspots } = match.place;
  return hotspots.find((h) => h.kind === 'terminal') ?? hotspots[0];
}
