import type { BorrowPart } from '@/features/routes/model/direction-schema';
import type { LineStringGeoJSON } from '@/features/routes/model/routes';
import type { Json } from '@/shared/types/database.types';
import type { Segment } from '@/shared/utils/geo';
import { joinSegments, overviewOf, roundLngLat } from '@/shared/utils/geo';

import { toJson } from './json';
import type { SaveInput } from './routes-write';

/** A route_variant row as a save writes it, in the table's names. */
interface DirectionRowColumns {
  route_id: string;
  reversed: boolean;
  control_points: Json;
  segments: Json;
  shape: Json | null;
  overview: Json | null;
  borrowed_from: string | null;
  borrowed_part: BorrowPart | null;
  borrowed_m: number | null;
}

export interface DirectionRowsResult {
  drawn: DirectionRowColumns;
  /** The route's other way as an empty slot; null for a loop, which has no other way. */
  slot: DirectionRowColumns | null;
  shape: LineStringGeoJSON;
}

/**
 * The rows a direction save writes, from the panel's input: the drawn
 * direction, the empty slot for the route's other way, and the line the
 * caller gets back. Pure, so tests/unit/direction-rows-test.mjs can hold the
 * rounding, the overview and the borrow columns without a database.
 *
 * A loop is one direction, the way it was drawn: `reversed` is false whatever
 * the input says (0021's trigger refuses a way back), and there is no slot.
 */
export function directionRows(
  input: Pick<
    SaveInput,
    | 'reversed'
    | 'isLoop'
    | 'controlPoints'
    | 'segments'
    | 'borrowedFrom'
    | 'borrowedPart'
    | 'borrowedMetres'
  >,
  routeId: string,
): DirectionRowsResult {
  // Six decimals, about 0.1 m (roundLngLat): the router's points carry 15 or
  // more, and those digits would be half of every row. The line is joined from
  // the rounded segments, so a segment's end and the shape's point are the
  // same number, and the publish script's rounding then changes nothing.
  const isLoop = input.isLoop === true;
  const segments: Segment[] = input.segments.map((s) => ({
    ...s,
    coordinates: s.coordinates.map(roundLngLat),
  }));
  const shape: LineStringGeoJSON = {
    type: 'LineString',
    coordinates: joinSegments(segments),
  };
  // What the list draws (0009): the same line, thinned at 5 m.
  const overview: LineStringGeoJSON | null =
    shape.coordinates.length > 1
      ? { type: 'LineString', coordinates: overviewOf(shape.coordinates) }
      : null;
  const drawn: DirectionRowColumns = {
    route_id: routeId,
    reversed: isLoop ? false : input.reversed,
    control_points: toJson(input.controlPoints.map(roundLngLat)),
    segments: toJson(segments),
    shape: toJson(shape),
    overview: toJson(overview),
    borrowed_from: input.borrowedFrom,
    borrowed_part: input.borrowedFrom ? input.borrowedPart : null,
    borrowed_m: input.borrowedFrom ? input.borrowedMetres : null,
  };

  // The other direction, as an empty slot. Every key is spelled out: rows
  // inserted together must share one column list, and PostgREST fills a
  // key one row lacks with null — not the column's default. Sent bare, the
  // slot would arrive as control_points = null and the table refuses it.
  const slot: DirectionRowColumns | null = isLoop
    ? null
    : {
        route_id: routeId,
        reversed: !input.reversed,
        control_points: [],
        segments: [],
        shape: null,
        overview: null,
        borrowed_from: null,
        borrowed_part: null,
        borrowed_m: null,
      };

  return { drawn, slot, shape };
}
