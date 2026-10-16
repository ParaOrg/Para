import type { Hotspot } from './hotspot-schema';
import { polygonToRing, type Ring } from '../geo/ring';

/**
 * The rows' shapes are hotspot-schema.ts's (Zod); the types derive from them
 * and are re-exported here, beside the rules, so the model keeps one door.
 */
export type { Hotspot, HotspotKind, HotspotLink, HotspotRow } from './hotspot-schema';
export type { PointGeoJSON, PolygonGeoJSON } from './geojson-schema';

/** The polygon corners of a saved hotspot. */
export function hotspotRing(s: Hotspot): Ring {
  return polygonToRing(s.area);
}

/**
 * The name a hotspot is shown by: the informal one when there is one, else
 * what is written on the ground. The one rule, so no row ever shows blank and
 * every route name, card and picker agrees. The label on the map is the one
 * exception: it names the box under it, so it reads `name` (useSavedHotspots).
 */
export function hotspotLabel(s: Pick<Hotspot, 'name' | 'informal'>): string {
  return s.informal?.trim() || s.name;
}

/**
 * The name a hotspot's label on the map shows: a station's without its line
 * in front, "MRT-3 Boni Station" → "Boni Station"; the line drawn through it
 * in its colour says which line already. Every other name as it is, and a
 * station's too when it does not start with its line. The saved name keeps
 * the line: cards and searches read it whole.
 */
export function nameOnMap(s: Pick<Hotspot, 'name' | 'line'>): string {
  const name = normaliseName(s.name);
  const prefix = s.line ? `${normaliseName(s.line)} `.toLowerCase() : '';
  if (!prefix || !name.toLowerCase().startsWith(prefix)) return s.name;
  return name.slice(prefix.length) || s.name;
}

/** Trim and collapse inner spaces, so "SM  Fairview " and "SM Fairview" are one group. Case is left alone. */
export function normaliseName(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * "Fairview, SM City Fairview, Fairview Terminal" → the list, normalised,
 * without blanks or repeats, and without the names it would only repeat.
 */
export function parseAliases(text: string, exclude: string[] = []): string[] {
  const seen = new Set(exclude.map((e) => normaliseName(e).toLowerCase()));
  const out: string[] = [];
  for (const raw of text.split(/[,;\n]/)) {
    const a = normaliseName(raw);
    const key = a.toLowerCase();
    if (!a || seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}
