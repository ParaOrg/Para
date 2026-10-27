import * as z from 'zod/mini';

import {
  lineStringSchema,
  pointSchema,
  polygonSchema,
} from '@/features/routes/model/geojson-schema';
import type { LngLat } from '@/shared/utils/geo';

const recordSchema = z.record(z.string(), z.unknown());

/** The drawn line of each way in a draft's payload (Papunta, Pabalik, ikot); a way not drawn yet has none. */
export function reviewWayLines(payload: unknown): LngLat[][] {
  const record = recordSchema.safeParse(payload);
  if (!record.success || !Array.isArray(record.data.directions)) return [];
  const lines: LngLat[][] = [];
  for (const direction of record.data.directions) {
    const raw = recordSchema.safeParse(direction);
    const line = lineStringSchema.safeParse(raw.success ? raw.data.shape : null);
    if (line.success) lines.push(line.data.coordinates);
  }
  return lines;
}

export function reviewLines(payload: unknown): LngLat[][] {
  const record = recordSchema.safeParse(payload);
  if (!record.success) return [];
  const lines = reviewWayLines(payload);
  const stop = recordSchema.safeParse(record.data.stop);
  if (stop.success) {
    const polygon = polygonSchema.safeParse(stop.data.area);
    if (polygon.success) lines.push(...polygon.data.coordinates);
    else {
      const point = pointSchema.safeParse(stop.data.point);
      if (point.success) lines.push([point.data.coordinates]);
    }
  }
  return lines.filter((line) => line.length > 0);
}

export function reviewAnchor(payload: unknown): LngLat | null {
  const points = reviewLines(payload).flat();
  if (!points.length) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}
