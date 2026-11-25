// The database stand-in's route tables (tests/e2e/fixtures/route-tables.mjs) as the live tables
// would hold them: every row passes the schemas the studio parses it with, and no row has a
// column the live schema (src/shared/types/database.types.ts) does not.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import * as z from 'zod/mini';

import { buildRouteTables } from '../e2e/fixtures/route-tables.mjs';
import { rawDirectionRowSchema } from '../../src/features/routes/model/direction-schema.ts';
import { lineStringSchema } from '../../src/features/routes/model/geojson-schema.ts';
import {
  hotspotLinkSchema,
  hotspotRowSchema,
} from '../../src/features/routes/model/hotspot-schema.ts';

const tables = buildRouteTables();

/** Each table's live columns, read off the generated types. */
const liveColumns = (table) => {
  const types = readFileSync(
    new URL('../../src/shared/types/database.types.ts', import.meta.url),
    'utf8',
  );
  const row = new RegExp(`\\n\\s+${table}: \\{\\s*Row: \\{(.*?)\\n\\s+\\}`, 's').exec(types);
  assert.ok(row, `database.types.ts has a Row for ${table}`);
  return new Set([...row[1].matchAll(/\n\s+(\w+)\??:/g)].map((m) => m[1]));
};

test('every row has only columns the live table has', () => {
  for (const [table, rows] of Object.entries(tables)) {
    const columns = liveColumns(table);
    for (const row of rows) {
      const extra = Object.keys(row).filter((c) => !columns.has(c));
      assert.deepEqual(extra, [], `${table} ${row.id ?? row.stop_id}: ${extra.join(', ')}`);
    }
  }
});

test('every direction, with its route, passes the studio’s direction schema', () => {
  const routes = new Map(tables.route.map((r) => [r.id, r]));
  for (const v of tables.route_variant) {
    const parsed = z.safeParse(rawDirectionRowSchema, { ...v, route: routes.get(v.route_id) });
    assert.ok(parsed.success, `${v.id}: ${parsed.error?.message}`);
  }
});

test('every drawing is a routed line that joins up into its shape', () => {
  for (const v of tables.route_variant.filter((r) => r.shape)) {
    assert.ok(z.safeParse(lineStringSchema, v.shape).success, v.id);
    assert.equal(v.segments.length, v.control_points.length - 1, v.id);
    const joined = v.segments.flatMap((s, i) => (i === 0 ? s.coordinates : s.coordinates.slice(1)));
    assert.deepEqual(joined, v.shape.coordinates, v.id);
    assert.ok(
      v.segments.every((s) => s.snap === 'snapped'),
      v.id,
    );
  }
});

test('every hotspot and every link passes the studio’s schemas', () => {
  for (const s of tables.stop) {
    const parsed = z.safeParse(hotspotRowSchema, s);
    assert.ok(parsed.success, `${s.id}: ${parsed.error?.message}`);
  }
  for (const l of tables.route_stop) {
    const parsed = z.safeParse(hotspotLinkSchema, l);
    assert.ok(parsed.success, `${l.route_variant_id}/${l.stop_id}: ${parsed.error?.message}`);
  }
});

test('every link points at a direction and a hotspot that are there', () => {
  const variants = new Set(tables.route_variant.map((v) => v.id));
  const stops = new Set(tables.stop.map((s) => s.id));
  for (const l of tables.route_stop) {
    assert.ok(variants.has(l.route_variant_id), l.route_variant_id);
    assert.ok(stops.has(l.stop_id), l.stop_id);
  }
});
