// The station relink (scripts/relink/relink-stations.mjs): it plans the station links a road route
// is owed under servedBy, by the studio's own save rule, and never a ferry's or a train's road hintuan.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/relink-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planRelink, relinkSql } from '../../scripts/relink/relink-stations.mjs';

const ring = (lng, r = 0.0002) => ({
  type: 'Polygon',
  coordinates: [
    [
      [lng - r, -r],
      [lng + r, -r],
      [lng + r, r],
      [lng - r, r],
      [lng - r, -r],
    ],
  ],
});
const stop = (id, lng, line = null) => ({
  id,
  name: id,
  informal: null,
  kind: 'hintuan',
  point: { type: 'Point', coordinates: [lng, 0] },
  area: ring(lng),
  line,
});
const LINE = {
  type: 'LineString',
  coordinates: [
    [0, 0],
    [0.01, 0],
    [0.02, 0],
    [0.03, 0],
  ],
};
const direction = (id, mode, routeCode = null) => ({
  id,
  direction_name: id,
  shape: LINE,
  route: { id: `r-${id}`, mode, route_code: routeCode, is_loop: false },
});
const hotspotRows = [
  stop('jeep-stop', 0.005),
  stop('lrt', 0.015, 'LRT-1'),
  stop('pier', 0.025, 'PRFS'),
];

test('a road route is owed the train station it passes, not the ferry station', () => {
  const { add, other } = planRelink({
    directionRows: [direction('jeep', 'jeepney')],
    hotspotRows,
    linkRows: [{ route_variant_id: 'jeep', stop_id: 'jeep-stop', stop_sequence: 0 }],
  });
  assert.deepEqual(
    add.map((a) => [a.variantId, a.stopId, a.sequence]),
    [['jeep', 'lrt', 1]],
  );
  assert.deepEqual(other, []);
});

test('a train is owed nothing new, and a link already there is not added again', () => {
  const { add } = planRelink({
    directionRows: [direction('train', 'lrt', 'LRT-1'), direction('jeep', 'jeepney')],
    hotspotRows,
    linkRows: [
      { route_variant_id: 'train', stop_id: 'lrt', stop_sequence: 1 },
      { route_variant_id: 'jeep', stop_id: 'jeep-stop', stop_sequence: 0 },
      { route_variant_id: 'jeep', stop_id: 'lrt', stop_sequence: 1 },
    ],
  });
  assert.deepEqual(add, []);
});

test('the SQL adds only, guarded by open drafts and changed subjects, and the revert removes the same pairs', () => {
  const add = [
    { variantId: 'v', routeId: 'r', routeRevision: 7, stopId: 's', stopRevision: 2, sequence: 3 },
  ];
  const { check, apply, revert } = relinkSql(add);
  assert.match(apply, /on conflict \(route_variant_id, stop_id\) do nothing/);
  assert.match(apply, /from public\.draft d/);
  assert.match(
    apply,
    /r\.revision <> w\.rev or r\.status <> 'approved'/,
    'refuses a route changed since',
  );
  assert.match(apply, /\('r'::uuid, 7\)/);
  assert.match(apply, /\('s'::uuid, 2\)/);
  assert.match(revert, /from public\.draft d/);
  assert.doesNotMatch(apply, /delete from|update public/i);
  assert.match(revert, /delete from public\.route_stop/);
  assert.doesNotMatch(check, /insert into|delete from|update public/i);
});
