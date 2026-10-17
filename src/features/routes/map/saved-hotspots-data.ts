import type { LngLat } from '@/shared/utils/geo';

import type { Ring } from '../geo/ring';
import { hotspotRing, nameOnMap, type Hotspot } from '../model/hotspots';
import { labelGroups } from '../model/places';

/** A hotspot's name sits in the middle of its box (Figma 3837:11308): the middle of its corners. */
function boxMiddle(ring: Ring): LngLat {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
}

/**
 * The saved hotspots as their source takes them: each box with an area,
 * and one name for each place on the ground.
 */
export function hotspotsData(hotspots: readonly Hotspot[]) {
  // The label on the map is the name written on the ground, not the informal
  // one the cards, pickers and route names read: the map draws boxes, and the
  // three boxes of one place would otherwise carry three identical labels.
  // Tapping still opens a card that leads with the informal name and shows
  // the ground name beneath it, so neither is lost.
  const byId = new Map(hotspots.map((s) => [s.id, s]));
  const withArea = hotspots.filter(
    (s): s is Hotspot & { area: NonNullable<Hotspot['area']> } =>
      s.area !== null && hotspotRing(s).length >= 3,
  );
  return {
    type: 'FeatureCollection' as const,
    features: [
      ...withArea.map((s) => ({
        type: 'Feature' as const,
        properties: { id: s.id, kind: s.kind, name: s.name },
        geometry: s.area,
      })),
      // One label per hintuan: a box on each side of the road shares one
      // (labelGroups), halfway between them; a box alone has its name in
      // its middle (Figma 3837:11308).
      ...labelGroups(
        withArea.map((s) => ({
          ...s,
          point: { type: 'Point' as const, coordinates: boxMiddle(hotspotRing(s)) },
        })),
      ).map((g) => ({
        type: 'Feature' as const,
        // A station's label leaves its line out (nameOnMap): "Boni Station".
        // Grouped by the whole name first, so MRT-3's Guadalupe and the
        // ferry's never share one label.
        properties: {
          id: g.ids[0],
          ids: g.ids.join(','),
          kind: g.kind,
          name: nameOnMap(byId.get(g.ids[0]) ?? g),
        },
        geometry: { type: 'Point' as const, coordinates: g.point },
      })),
    ],
  };
}
