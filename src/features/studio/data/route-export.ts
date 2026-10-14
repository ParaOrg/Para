import type { Hotspot } from '@/features/routes/model/hotspots';
import { routeTimeline, travelLine } from '@/features/routes/model/ride';
import { directionLine, isDrawn, type Direction } from '@/features/routes/model/routes';
import type { TimelineRow } from '@/features/routes/model/timeline';
import { lineLength, type LngLat } from '@/shared/utils/geo';

/*
 * A route written out as a file, for the editor to take elsewhere (QGIS, a
 * spreadsheet, another app): both its directions, each with its line in
 * travel order and its timeline of places. Pure, so the unit checks read it
 * without a browser; the panel reads the full lines and saves the file.
 */

export type ExportFormat = 'csv' | 'geojson' | 'json';

export const EXPORT_FORMATS: readonly { format: ExportFormat; label: string }[] = [
  { format: 'csv', label: 'CSV' },
  { format: 'geojson', label: 'GeoJSON' },
  { format: 'json', label: 'JSON' },
];

/** Outbound runs head to tail, return the way back (CONTEXT.md). */
type Way = 'outbound' | 'return';

/** One row of a direction's timeline, numbered in travel order and placed on the ground. */
interface ExportedPlace {
  order: number;
  id: string;
  name: string;
  kind: TimelineRow['kind'];
  lngLat: LngLat | null;
}

interface ExportedDirection {
  id: string;
  name: string | null;
  way: Way;
  confidence: Direction['confidence'];
  /** Null for a slot: a direction with no line yet. */
  metres: number | null;
  places: ExportedPlace[];
  /** In travel order, from where the direction leaves; null for a slot. */
  line: LngLat[] | null;
}

export interface RouteExport {
  exportedAt: string;
  route: {
    id: string;
    name: string;
    mode: Direction['route']['mode'];
    signboard: string | null;
    routeCode: string | null;
    via: string | null;
    fareNote: string | null;
  };
  directions: ExportedDirection[];
}

export interface ExportFile {
  fileName: string;
  mimeType: string;
  text: string;
}

/**
 * The route's directions as one export, outbound first. Each direction must
 * carry its full line: the studio lists overviews, thinned for the map, and
 * an export of those would not be the line that was drawn.
 */
export function routeExport(
  directions: readonly Direction[],
  hotspots: readonly Hotspot[],
  hotspotsAlong: (directionId: string, line: readonly LngLat[]) => Hotspot[],
  exportedAt: string,
): RouteExport {
  const [first] = directions;
  if (!first) throw new Error('A route to export needs at least one direction.');
  const route = first.route;
  const pointOf = new Map(hotspots.map((s) => [s.id, s.point.coordinates]));
  const ordered = [...directions].sort((a, b) => Number(a.reversed) - Number(b.reversed));

  return {
    exportedAt,
    route: {
      id: route.id,
      name: route.name,
      mode: route.mode,
      signboard: route.signboard,
      routeCode: route.routeCode ?? null,
      via: route.via,
      fareNote: route.fareNote,
    },
    directions: ordered.map((v) => {
      const timeline = routeTimeline(v, hotspots, hotspotsAlong(v.id, directionLine(v)));
      const rows = [timeline.from, ...timeline.between, timeline.to].filter(
        (row): row is TimelineRow => row !== null,
      );
      const line = isDrawn(v) ? [...travelLine(v, hotspots)] : null;
      return {
        id: v.id,
        name: v.name,
        way: v.reversed ? 'return' : 'outbound',
        confidence: v.confidence,
        metres: line ? Math.round(lineLength(line)) : null,
        places: rows.map((row, i) => ({
          order: i + 1,
          id: row.id,
          name: row.label,
          kind: row.kind,
          lngLat: pointOf.get(row.id) ?? null,
        })),
        line,
      };
    }),
  };
}

/** The export written in one format, with the file name and type to save it under. */
export function exportFile(data: RouteExport, format: ExportFormat): ExportFile {
  const base = fileSlug(data.route.name);
  switch (format) {
    case 'csv':
      return { fileName: `${base}.csv`, mimeType: 'text/csv;charset=utf-8', text: toCsv(data) };
    case 'geojson':
      return {
        fileName: `${base}.geojson`,
        mimeType: 'application/geo+json',
        text: JSON.stringify(toGeoJson(data), null, 2),
      };
    case 'json':
      return {
        fileName: `${base}.json`,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      };
  }
}

/** `Tala – SM Fairview` → `tala-sm-fairview`. */
function fileSlug(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'route';
}

/** One row per point of each drawn direction's line, in travel order. */
function toCsv(data: RouteExport): string {
  const rows = [['route', 'direction', 'way', 'sequence', 'lng', 'lat']];
  for (const v of data.directions) {
    v.line?.forEach(([lng, lat], i) => {
      rows.push([data.route.name, v.name ?? '', v.way, String(i + 1), String(lng), String(lat)]);
    });
  }
  // The byte-order mark makes Excel read the file as UTF-8, so the names'
  // dashes and arrows (–, →) survive; QGIS and other readers skip it.
  return '﻿' + rows.map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}

/** A CSV field, quoted when it holds a comma, a quote or a line break (RFC 4180). */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * A FeatureCollection: each drawn direction's line, then its places as
 * points. A slot has no line, so it has no features.
 */
function toGeoJson(data: RouteExport) {
  const features = data.directions.flatMap((v) => {
    if (!v.line) return [];
    const direction = {
      routeId: data.route.id,
      routeName: data.route.name,
      directionId: v.id,
      directionName: v.name,
      way: v.way,
    };
    const lineFeature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: v.line },
      properties: {
        ...direction,
        mode: data.route.mode,
        confidence: v.confidence,
        metres: v.metres,
      },
    };
    const placeFeatures = v.places.flatMap((place) =>
      place.lngLat
        ? [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: place.lngLat },
              properties: {
                ...direction,
                order: place.order,
                placeId: place.id,
                name: place.name,
                kind: place.kind,
              },
            },
          ]
        : [],
    );
    return [lineFeature, ...placeFeatures];
  });
  return { type: 'FeatureCollection', features };
}
