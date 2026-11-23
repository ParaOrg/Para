import { ringCentroid } from '@/features/routes/geo/box-centre';
import { ringToPolygon, type Ring } from '@/features/routes/geo/ring';
import {
  normaliseName,
  type PointGeoJSON,
  type HotspotKind,
} from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import { roundLngLat } from '@/shared/utils/geo';

import { linksThrough, terminalLinks } from './hotspots-geometry';

const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim());

export interface SaveHotspotInput {
  hotspotId: string | null;
  kind: HotspotKind;
  /** What is written on the ground. Required. */
  name: string;
  /** What people say. Blank means "the same as the name". */
  informal: string;
  /** Other names for the same place, already split and cleaned (parseAliases). */
  aliases: string[];
  note: string;
  ring: Ring;
  /** Terminal only: the directions the owner ticked. Ignored for a hintuan. */
  directionIds?: string[];
  /** Every saved direction — needed to compute hintuan links and sequences. */
  directions: DirectionRow[];
}

/**
 * The stop row a draft holds, from the panel's input, and its ring as stored:
 * names normalised, corners rounded, the point at the outline's middle. Pure,
 * shared by a hotspot's draft (hotspot-draft-state.ts) and a place made from
 * the save panel (draft-new-place.ts).
 */
export function hotspotColumns(input: SaveHotspotInput) {
  if (input.ring.length < 3) throw new Error('A hotspot needs at least three corners');

  // Names are normalised here, not in the database: a stray double space
  // would otherwise make "SM  Fairview" a second group, and the terminal
  // uniqueness index (0014) compares what is stored.
  const name = normaliseName(input.name);
  const informal = normaliseName(input.informal);
  if (!name) throw new Error('A hotspot needs a name');
  // Six decimals, about 0.1 m, as a direction's points are saved: a traced
  // corner carries 15 or more, and the publish script rounds them anyway.
  const ring = input.ring.map(roundLngLat);
  const point: PointGeoJSON = { type: 'Point', coordinates: roundLngLat(ringCentroid(ring)) };
  const row = {
    name,
    informal: informal && informal.toLowerCase() !== name.toLowerCase() ? informal : null,
    aliases: input.aliases,
    kind: input.kind,
    note: blankToNull(input.note),
    area: ringToPolygon(ring),
    point,
  };
  return { row, ring };
}

/**
 * A hotspot's route links, as its draft holds them: computed for a
 * hintuan, chosen for a terminal, except that an ikot's are computed for both
 * (terminalLinks). Either way the sequence is where the direction first meets
 * the outline (0 when a ticked terminal route never actually enters it — still
 * a valid, ordered link).
 */
export function hotspotLinks(
  input: SaveHotspotInput,
  ring: Ring,
  line: string | null,
): { directionId: string; sequence: number }[] {
  return input.kind === 'hintuan'
    ? linksThrough(ring, input.directions, line)
    : terminalLinks(ring, input.directionIds ?? [], input.directions);
}
