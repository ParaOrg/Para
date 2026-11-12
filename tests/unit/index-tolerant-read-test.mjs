// The published index read by an app older than the file
// (src/features/routes/published/parse-index.ts): in the file the network answers with, a row
// with a value this app does not know is skipped, with the links that point at it, and the
// rest of the map is kept. Before, one such row refused the whole map. A copy kept from an
// earlier visit is still refused for one such row, so an older copy that reads whole stands in
// (tests/unit/map-file-test.mjs). The rows are the committed index's own, with one value changed.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/index-tolerant-read-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { MAP_FILE_SCHEMA } from '../../src/features/routes/published/map-file.ts';
import { parseIndex } from '../../src/features/routes/published/parse-index.ts';

const published = JSON.parse(
  readFileSync(new URL('../../public/data/index.v5.json', import.meta.url), 'utf8'),
);
const URL_ = '/data/index.v5.json';
const read = (file) => parseIndex(file, URL_, MAP_FILE_SCHEMA, 'skip');
/** As a copy kept from an earlier visit is read: one unreadable row refuses it. */
const readStored = (file) => parseIndex(file, URL_, MAP_FILE_SCHEMA);
/** The committed index with some of its rows replaced. */
const withRows = (rows) => ({ ...published, ...rows });

/** A direction with links, and another direction, to stand for the rest. */
const first = published.variants.find((v) =>
  published.links.some((l) => l.route_variant_id === v.id),
);
const second = published.variants.find((v) => v.id !== first.id);
const firstLinks = published.links.filter((l) => l.route_variant_id === first.id).length;
const linkedStop = published.stops.find((s) => published.links.some((l) => l.stop_id === s.id));
const stopLinks = published.links.filter((l) => l.stop_id === linkedStop.id).length;

test('the index as published reads whole, with nothing skipped', () => {
  const index = read(published);
  assert.equal(index.directions.length, published.variants.length);
  assert.equal(index.hotspots.length, published.stops.length);
  assert.equal(index.links.length, published.links.length);
  assert.equal(index.skipped, 0);
});

test('a direction of a mode this app does not know is skipped, with its links; the rest is kept', () => {
  assert.ok(firstLinks > 0, 'the fixture direction has links');
  const newMode = { ...first, route: { ...first.route, mode: 'cable_car' } };
  const variants = published.variants.map((v) => (v.id === first.id ? newMode : v));
  const index = read(withRows({ variants }));
  assert.equal(index.directions.length, published.variants.length - 1);
  assert.ok(!index.directions.some((d) => d.id === first.id));
  assert.ok(index.directions.some((d) => d.id === second.id));
  assert.equal(index.links.length, published.links.length - firstLinks);
  assert.ok(!index.links.some((l) => l.directionId === first.id));
  assert.equal(index.hotspots.length, published.stops.length);
  assert.equal(index.skipped, 1 + firstLinks);
});

test('a hotspot of a kind this app does not know is skipped, with its links', () => {
  const newKind = { ...linkedStop, kind: 'pier' };
  const stops = published.stops.map((s) => (s.id === linkedStop.id ? newKind : s));
  const index = read(withRows({ stops }));
  assert.equal(index.hotspots.length, published.stops.length - 1);
  assert.ok(!index.links.some((l) => l.hotspotId === linkedStop.id));
  assert.equal(index.links.length, published.links.length - stopLinks);
  assert.equal(index.directions.length, published.variants.length);
  assert.equal(index.skipped, 1 + stopLinks);
});

test('a loop is a row this app knows: it is read, never skipped', () => {
  const loop = published.variants.find((v) => v.route.is_loop === true);
  assert.ok(loop, 'the committed index has a loop');
  const index = read(published);
  const readLoop = index.directions.find((d) => d.id === loop.id);
  assert.ok(readLoop);
  assert.equal(readLoop.route.isLoop, true);
});

test('a link that is itself unreadable is skipped alone', () => {
  const index = read(withRows({ links: [{ nonsense: true }, ...published.links] }));
  assert.equal(index.links.length, published.links.length);
  assert.equal(index.skipped, 1);
});

test('a file none of whose directions this app can read is still refused', () => {
  const allNew = published.variants.map((v) => ({
    ...v,
    route: { ...v.route, mode: 'cable_car' },
  }));
  assert.throws(() => read(withRows({ variants: allNew })), /has a row this app cannot read/);
});

test('the refusals that were there before stand: no map, a newer shape, another shape', () => {
  assert.throws(() => read({ hello: 'world' }), /is not a published map/);
  assert.throws(() => read({ ...published, schema: MAP_FILE_SCHEMA + 1 }));
  assert.throws(() => read({ ...published, schema: MAP_FILE_SCHEMA - 1 }), /not the index/);
});

test('a kept copy with one such row is refused whole, so an older copy can stand in', () => {
  const newKind = { ...linkedStop, kind: 'pier' };
  const stops = published.stops.map((s) => (s.id === linkedStop.id ? newKind : s));
  assert.throws(() => readStored(withRows({ stops })), /has a row this app cannot read: stops\./);
  assert.equal(readStored(published).skipped, 0);
});

test('the page keeps the rest of the map when the file it fetched has one such row', async () => {
  const newKind = { ...linkedStop, kind: 'pier' };
  const stops = published.stops.map((s) => (s.id === linkedStop.id ? newKind : s));
  const body = JSON.stringify(withRows({ stops }));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const { fetchIndex } =
      await import('../../src/features/routes/published/fetch-index.ts?case=tolerant');
    const file = await fetchIndex();
    assert.equal(file.hotspots.length, published.stops.length - 1);
    assert.equal(file.directions.length, published.variants.length);
  } finally {
    globalThis.fetch = realFetch;
  }
});
