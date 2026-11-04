import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hotspotToEdit } from '../../src/features/studio/data/hotspot-to-edit.ts';

const ring = [
  [121, 14],
  [121.001, 14],
  [121.001, 14.001],
  [121, 14],
];
const approved = {
  id: 'h1',
  name: 'Tala Terminal',
  informal: 'Tala',
  aliases: [],
  kind: 'terminal',
  point: { type: 'Point', coordinates: [121.0005, 14.0005] },
  area: { type: 'Polygon', coordinates: [ring] },
  note: null,
  createdAt: '2026-10-01T00:00:00Z',
  line: null,
};
const draftOf = (stop, links) => ({ payload: { version: 1, stop, links } });

test('with no draft, Edit opens the approved box and its approved links', () => {
  assert.deepEqual(hotspotToEdit(approved, null), {
    hotspot: approved,
    linkedDirectionIds: null,
  });
});

test("with the editor's draft, Edit opens the draft's names, outline and links", () => {
  const moved = [ring.map(([lng, lat]) => [lng + 0.001, lat])];
  const opened = hotspotToEdit(
    approved,
    draftOf(
      {
        name: 'Tala Terminal B',
        informal: 'Tala',
        aliases: ['Bagong Silang'],
        kind: 'terminal',
        note: 'by the market',
        area: { type: 'Polygon', coordinates: moved },
        point: { type: 'Point', coordinates: [121.0015, 14.0005] },
        line: null,
      },
      [{ route_variant_id: 'v1', stop_sequence: 0 }],
    ),
  );
  assert.equal(opened.hotspot.name, 'Tala Terminal B');
  assert.deepEqual(opened.hotspot.aliases, ['Bagong Silang']);
  assert.equal(opened.hotspot.note, 'by the market');
  assert.deepEqual(opened.hotspot.area.coordinates, moved);
  assert.equal(opened.hotspot.id, 'h1');
  assert.equal(opened.hotspot.createdAt, approved.createdAt);
  assert.deepEqual(opened.linkedDirectionIds, ['v1']);
});

test('a draft that is not a box throws, for the query to report', () => {
  assert.throws(() => hotspotToEdit(approved, draftOf({ name: 'x' }, [])));
});
