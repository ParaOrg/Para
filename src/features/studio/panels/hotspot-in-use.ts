import { hotspotLabel, type HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

/** The names of the routes that end at this hotspot, each once: a route's two directions name it twice. */
export function routesEndingAt(hotspot: HotspotRow, directions: readonly DirectionRow[]): string[] {
  return [
    ...new Set(
      directions
        .filter((v) => v.route.headHotspotId === hotspot.id || v.route.tailHotspotId === hotspot.id)
        .map((v) => v.route.name),
    ),
  ];
}

/**
 * Why the hotspot cannot be deleted, in the words the notice shows, or null
 * when nothing ends there. A route's end cannot go while the route names it:
 * the database refuses (0006's foreign keys), and its refusal was the notice
 * (finding 15).
 */
export function endsRefusal(
  hotspot: HotspotRow,
  directions: readonly DirectionRow[],
): string | null {
  const ending = routesEndingAt(hotspot, directions);
  if (ending.length === 0) return null;
  return (
    `"${hotspotLabel(hotspot)}" is where ${ending.join(', ')} ${ending.length === 1 ? 'ends' : 'end'}. ` +
    `Delete ${ending.length === 1 ? 'that route' : 'those routes'} first.`
  );
}
