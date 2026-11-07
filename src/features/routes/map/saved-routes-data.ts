import { directionLine, railLineOf, type Direction, type LineStringGeoJSON } from '../model/routes';

/**
 * The saved directions as their source takes them: one feature for each
 * that has a line to draw, its id promoted for the lighting.
 */
export function routesData(rows: readonly Direction[]) {
  return {
    type: 'FeatureCollection' as const,
    features: rows
      .map((v) => ({ v, line: directionLine(v) }))
      .filter(({ line }) => line.length > 1)
      .map(({ v, line }) => ({
        type: 'Feature' as const,
        properties: {
          id: v.id,
          routeId: v.routeId,
          name: v.route?.name ?? '',
          mode: v.route?.mode ?? 'jeepney',
          // The train line it runs on, '' for every other route: which resting layer draws it.
          line: railLineOf(v) ?? '',
        },
        geometry: { type: 'LineString' as const, coordinates: line },
      })),
  };
}

/**
 * The full lines of `lines` not patched into the source yet, as updateData
 * takes them, each noted in `sent` as it goes: by id, and again for an id
 * whose line is another object. Sending every line read so far at each
 * arrival would lay out again each tile within any of their bounds.
 */
export function unpatched(
  sent: Map<string, LineStringGeoJSON>,
  lines: ReadonlyMap<string, LineStringGeoJSON>,
): { id: string; newGeometry: LineStringGeoJSON }[] {
  const update: { id: string; newGeometry: LineStringGeoJSON }[] = [];
  for (const [id, line] of lines) {
    if (sent.get(id) === line) continue;
    sent.set(id, line);
    update.push({ id, newGeometry: line });
  }
  return update;
}
