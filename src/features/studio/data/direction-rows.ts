import type { LineStringGeoJSON } from '@/features/routes/model/routes';
import type { LngLat, Segment } from '@/shared/utils/geo';
import { joinSegments, overviewOf, roundLngLat } from '@/shared/utils/geo';

import type { SaveInput } from './routes-write';

/**
 * The rows a direction save writes, from the panel's input: the drawn
 * direction, the empty slot for the route's other way, and the line the
 * caller gets back. Pure, so tests/unit/direction-rows-test.mjs can hold the
 * rounding, the overview and the borrow columns without a database.
 */
export function directionRows(
  input: Pick<
    SaveInput,
    'reversed' | 'controlPoints' | 'segments' | 'borrowedFrom' | 'borrowedPart' | 'borrowedMetres'
  >,
  routeId: string,
) {
  // Six decimals, about 0.1 m (roundLngLat): the router's points carry 15 or
  // more, and those digits would be half of every row. The line is joined from
  // the rounded segments, so a segment's end and the shape's point are the
  // same number, and the publish script's rounding then changes nothing.
  const segments: Segment[] = input.segments.map((s) => ({
    ...s,
    coordinates: s.coordinates.map(roundLngLat),
  }));
  const shape: LineStringGeoJSON = {
    type: 'LineString',
    coordinates: joinSegments(segments),
  };
  const drawn = {
    route_id: routeId,
    reversed: input.reversed,
    control_points: input.controlPoints.map(roundLngLat),
    segments,
    shape,
    // What the list draws (0009): the same line, thinned at 5 m.
    overview:
      shape.coordinates.length > 1
        ? ({ type: 'LineString', coordinates: overviewOf(shape.coordinates) } as LineStringGeoJSON)
        : null,
    borrowed_from: input.borrowedFrom,
    borrowed_part: input.borrowedFrom ? input.borrowedPart : null,
    borrowed_m: input.borrowedFrom ? input.borrowedMetres : null,
  };

  // The other direction, as an empty slot. Every key is spelled out: rows
  // inserted together must share one column list, and PostgREST fills a
  // key one row lacks with null — not the column's default. Sent bare, the
  // slot would arrive as control_points = null and the table refuses it.
  const slot = {
    route_id: routeId,
    reversed: !input.reversed,
    control_points: [] as LngLat[],
    segments: [] as Segment[],
    shape: null,
    overview: null,
    borrowed_from: null,
    borrowed_part: null,
    borrowed_m: null,
  };

  return { drawn, slot, shape };
}
