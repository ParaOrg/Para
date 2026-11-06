import type { LandmarkMatch } from '../model/landmark-search';
import type { PlaceMatch } from '../model/place-search';
import type { Vehicle } from '../model/vehicles';
import type { LandmarkKind } from '../published/landmark-file-schema';

/** One row of place search's results: a Para place with what rides from it, or a landmark. */
export type SearchRow =
  | { type: 'place'; match: PlaceMatch; vehicles: Vehicle[] }
  | { type: 'landmark'; match: LandmarkMatch };

/** A row's key, stable while the results stand: a place's by its name, a landmark's by its OSM id. */
export const rowKey = (row: SearchRow) =>
  row.type === 'place' ? `place:${row.match.place.key}` : `landmark:${row.match.landmark.id}`;

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
