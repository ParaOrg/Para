import assert from 'node:assert/strict';
import { test } from 'node:test';

import { draftLinesData } from '../../src/features/studio/maps/draft-lines-data.ts';

const line = (...coordinates) => ({ type: 'LineString', coordinates });
const draft = (id, payload) => ({ id, payload });

test('each drawn way of a draft becomes a line carrying the draft id', () => {
  const data = draftLinesData([
    draft('a', {
      directions: [
        { shape: line([121, 14], [121.1, 14.1]) },
        { shape: line([121.1, 14.1], [121, 14]) },
      ],
    }),
  ]);
  assert.equal(data.features.length, 2);
  assert.deepEqual(
    data.features.map((f) => f.properties.draftId),
    ['a', 'a'],
  );
  assert.deepEqual(data.features[0].geometry.coordinates, [
    [121, 14],
    [121.1, 14.1],
  ]);
});

test('a way not drawn, a one-point line, a place draft and a bad payload add no line', () => {
  const data = draftLinesData([
    draft('a', { directions: [{ shape: null }, { shape: line([121, 14]) }] }),
    draft('b', { stop: { point: { type: 'Point', coordinates: [121, 14] } } }),
    draft('c', 'nonsense'),
    draft('d', { directions: 'nope' }),
  ]);
  assert.deepEqual(data.features, []);
});

test("each way carries its direction's id, so a tap opens the way tapped", () => {
  const data = draftLinesData([
    draft('a', {
      directions: [
        { id: 'out', shape: line([121, 14], [121.1, 14.1]) },
        { id: 'back', shape: line([121.1, 14.1], [121, 14]) },
        { shape: line([121, 14], [121.2, 14.2]) },
      ],
    }),
  ]);
  assert.deepEqual(
    data.features.map((f) => f.properties),
    [{ draftId: 'a', directionId: 'out' }, { draftId: 'a', directionId: 'back' }, { draftId: 'a' }],
  );
});
