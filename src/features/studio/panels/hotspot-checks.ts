import { ringCrossesItself } from '@/features/routes/geo/ring';
import { hotspotLabel, type HotspotRow } from '@/features/routes/model/hotspots';
import type { LngLat } from '@/shared/utils/geo';

import { terminalAlreadyAt } from './places';
import type { HotspotKind } from '../drawing/drawing-types';

/**
 * What the hotspot panel works out from its form, pure, so
 * tests/unit/hotspot-checks-test.mjs can hold it.
 */

/** What the panel's two lists read of a direction: its ids, its name and its route's. */
export interface ListedDirection {
  id: string;
  routeId: string;
  name: string | null;
  route?: { name: string } | null;
}

/** Directions under their route's generated name, the routes in name order. */
export interface SignboardGroup<TDirection extends ListedDirection = ListedDirection> {
  signboard: string;
  directions: TDirection[];
}

/** Directions grouped under their route's generated name, for both lists. */
export function groupBySignboard<TDirection extends ListedDirection>(
  directions: readonly TDirection[],
): SignboardGroup<TDirection>[] {
  const groups = new Map<string, SignboardGroup<TDirection>>();
  for (const v of directions) {
    const key = v.routeId;
    const g = groups.get(key) ?? { signboard: v.route?.name ?? '(unnamed)', directions: [] };
    g.directions.push(v);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => a.signboard.localeCompare(b.signboard));
}

/**
 * The informal names already in use, but `exceptId`'s, each once whatever
 * its case, in name order: offered as suggestions so a second box for the
 * same place joins the group instead of starting "SM  Fairview".
 */
export function knownInformalNames(
  hotspots: readonly HotspotRow[],
  exceptId: string | undefined,
): string[] {
  const seen = new Map<string, string>();
  for (const s of hotspots) {
    if (s.id === exceptId) continue;
    const label = hotspotLabel(s);
    seen.set(label.toLowerCase(), label);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * A terminal's checklist: pre-ticked from `startTicks` (null: not yet
 * known), with the owner's own ticks and unticks in `chosen` over it.
 */
export function tickedDirections(
  startTicks: ReadonlySet<string> | null,
  chosen: ReadonlyMap<string, boolean>,
): Set<string> {
  const t = new Set(startTicks ?? []);
  for (const [id, on] of chosen) {
    if (on) t.add(id);
    else t.delete(id);
  }
  return t;
}

/** What the refusal reads from the form. */
export interface HotspotCheck {
  ring: LngLat[];
  kind: HotspotKind;
  /** Every saved hotspot. */
  hotspots: HotspotRow[];
  /** The row this save writes, or null for a new one. */
  hotspotId: string | null;
  name: string;
  informal: string;
}

/** Why the panel refuses a save, before it writes anything; null to go ahead. */
export function hotspotRefusal(check: HotspotCheck): string | null {
  if (ringCrossesItself(check.ring)) {
    return 'Two sides of this outline cross each other. Move a corner so the outline goes round the box once, then save.';
  }
  if (check.kind === 'terminal') {
    const other = terminalAlreadyAt(check.hotspots, {
      id: check.hotspotId,
      name: check.name,
      informal: check.informal,
    });
    if (other) {
      return `${hotspotLabel(other)} already has a terminal ("${other.name}"). A place has one terminal; draw this one as a hintuan under the same name.`;
    }
  }
  return null;
}
