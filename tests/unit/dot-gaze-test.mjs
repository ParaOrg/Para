// The dot's gaze at what was just picked (src/features/locator/dot-gaze.ts, the
// owner's ask of 2026-10-01): which way it gazes, where its eyes go for it,
// where on the routes it gazes, and what the public map hands it to gaze at.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/dot-gaze-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAZE_PX,
  eyesDeg,
  gazeOffset,
  gazeSubjects,
  gazeToward,
  nearestOnLines,
} from '../../src/features/locator/dot-gaze.ts';
import { placeKey } from '../../src/features/routes/model/places.ts';
import { directionLine } from '../../src/features/routes/model/routes.ts';

const here = [121.05, 14.7];
const m = 1 / 111_320;

test('it gazes the way on the ground, clockwise from north, as the beam heads', () => {
  assert.equal(gazeToward(here, [here[0], here[1] + 0.01]), 0);
  assert.equal(gazeToward(here, [here[0] + 0.01, here[1]]), 90);
  assert.equal(gazeToward(here, [here[0], here[1] - 0.01]), 180);
  assert.equal(gazeToward(here, [here[0] - 0.01, here[1]]), 270);
});

test('a metre of longitude is shorter than one of latitude: north-east is 45°', () => {
  const to = [here[0] + (100 * m) / Math.cos((here[1] * Math.PI) / 180), here[1] + 100 * m];
  assert.equal(gazeToward(here, to), 45);
});

test('nothing to gaze toward when it is already there', () => {
  assert.equal(gazeToward(here, [here[0] + 0.5 * m, here[1]]), null);
});

test('the eyes go GAZE_PX out, the dot lying north up: east right, north up', () => {
  assert.deepEqual(gazeOffset(90), { x: GAZE_PX, y: 0 });
  assert.deepEqual(gazeOffset(0), { x: 0, y: -GAZE_PX });
  assert.deepEqual(gazeOffset(180), { x: 0, y: GAZE_PX });
  assert.deepEqual(gazeOffset(270), { x: -GAZE_PX, y: 0 });
  for (let deg = 0; deg < 360; deg += 15) {
    const { x, y } = gazeOffset(deg);
    assert.ok(Math.abs(Math.hypot(x, y) - GAZE_PX) < 0.1, `${deg}°: ${x},${y}`);
  }
});

test('on the routes, the point nearest the dot, between their points too', () => {
  const across = [
    [here[0] - 0.01, here[1] + 0.001],
    [here[0] + 0.01, here[1] + 0.001],
  ];
  const far = [
    [here[0] + 0.05, here[1]],
    [here[0] + 0.06, here[1]],
  ];
  const p = nearestOnLines(here, [far, across]);
  assert.ok(Math.abs(p[0] - here[0]) < 1e-9 && Math.abs(p[1] - (here[1] + 0.001)) < 1e-9, p.join());
  assert.equal(nearestOnLines(here, []), null);
  assert.deepEqual(nearestOnLines(here, [[[1, 2]]]), [1, 2]);
});

// ------------------------------------------------- what the public map gazes at
// gazeSubjects (2026-10-05): the subjects CommuterLocation hands the dot,
// built as CommuterApp built them before the locator moved off it (the
// cheap-phone plan, step 15) — that code, word for word but for its names,
// is `before` here.
function before(ride, stops, saved, locator) {
  const nearestLit = (lines) => (locator.fix ? nearestOnLines(locator.fix.at, lines) : null);
  const routesOf = (vs) => [...new Set(vs.map((v) => v.routeId))].sort().join() || null;
  return [
    { key: ride.pickedId, at: () => ride.pinAt },
    {
      key: stops.selected && placeKey(stops.selected),
      at: () => stops.selected?.point.coordinates ?? null,
    },
    {
      key: saved.selected?.routeId ?? null,
      at: () => nearestLit(saved.selected ? [directionLine(saved.selected)] : []),
    },
    {
      key: saved.highlight && `${saved.highlight.where}:${saved.highlight.from}`,
      at: () => nearestLit(saved.litDirections.map(directionLine)),
    },
    {
      key: routesOf(saved.candidates),
      at: () => nearestLit(saved.litDirections.map(directionLine)),
    },
  ];
}

test("the public map's subjects: the same keys, gazed at the same places, as PublicMapApp's were", () => {
  const line = (id, routeId, pts) => ({
    id,
    routeId,
    reversed: false,
    shape: { type: 'LineString', coordinates: pts },
  });
  const a = line('a1', 'A', [
    [here[0] - 0.01, here[1] + 0.002],
    [here[0] + 0.01, here[1] + 0.002],
  ]);
  const a2 = line('a2', 'A', [
    [here[0] + 0.01, here[1] + 0.003],
    [here[0] - 0.01, here[1] + 0.003],
  ]);
  const b = line('b1', 'B', [
    [here[0] + 0.004, here[1] - 0.01],
    [here[0] + 0.004, here[1] + 0.01],
  ]);
  const place = {
    id: 's1',
    kind: 'hintuan',
    name: 'SM Fairview',
    informal: null,
    aliases: [],
    point: { type: 'Point', coordinates: [here[0] + 0.001, here[1] - 0.001] },
  };
  const nothing = {
    pickedId: null,
    pinAt: null,
    place: null,
    trip: null,
    highlight: null,
    candidates: [],
    litDirections: [],
  };
  const states = [
    nothing,
    { ...nothing, candidates: [b, a, a2], litDirections: [b, a, a2] },
    {
      ...nothing,
      candidates: [a, b],
      litDirections: [a],
      highlight: { where: 'list', card: 'Tala', from: 'Tala', ids: ['a1'], livery: 'violet' },
    },
    {
      ...nothing,
      place,
      candidates: [],
      litDirections: [a, b],
      highlight: {
        where: 'hotspot',
        card: 'SM Fairview',
        from: 'SM Fairview',
        ids: ['a1'],
        livery: 'blue',
      },
    },
    { ...nothing, trip: a2, litDirections: [a2], candidates: [a, a2, b] },
    {
      ...nothing,
      trip: a,
      litDirections: [a],
      pickedId: 'h7',
      pinAt: [here[0] + 0.002, here[1] + 0.002],
    },
  ];
  for (const fix of [null, { at: here }, { at: [here[0] + 0.003, here[1] + 0.004] }]) {
    for (const p of states) {
      const old = before(
        { pickedId: p.pickedId, pinAt: p.pinAt },
        { selected: p.place },
        {
          selected: p.trip,
          highlight: p.highlight,
          candidates: p.candidates,
          litDirections: p.litDirections,
        },
        { fix },
      );
      const now = gazeSubjects(p, fix?.at ?? null);
      assert.deepEqual(
        now.map((s) => s.key),
        old.map((s) => s.key),
      );
      assert.deepEqual(
        now.map((s) => s.at()),
        old.map((s) => s.at()),
      );
    }
  }
  // Keyed by route: the list of A's two directions and B is "A,B", either way round.
  assert.equal(gazeSubjects(states[1], here)[4].key, 'A,B');
  assert.deepEqual(
    gazeSubjects(nothing, here).map((s) => s.key),
    [null, null, null, null, null],
  );
});

// The way the phone faces (eyesDeg): the eyes follow the beam's heading, a pick
// wins while its gaze lasts, and with neither they wander.

test('the eyes look the way the phone faces; a pick wins while its gaze lasts', () => {
  assert.equal(eyesDeg(null, 120), 120);
  assert.equal(eyesDeg(30, 120), 30);
  assert.equal(eyesDeg(0, 120), 0, 'a gaze due north is a gaze, not none');
  assert.equal(eyesDeg(null, 0), 0, 'facing due north is a heading, not none');
  assert.equal(eyesDeg(null, null), null);
});

/** The eyes as the screen shows them: the dot lies north up and turns with the map's bearing. */
function onScreen(deg, bearing) {
  const { x, y } = gazeOffset(deg);
  const t = (-bearing * Math.PI) / 180;
  return { x: x * Math.cos(t) - y * Math.sin(t), y: x * Math.sin(t) + y * Math.cos(t) };
}
const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 0.15;

test('on a map at a bearing the eyes point the same way on the ground as the beam', () => {
  for (const bearing of [0, 45, 120, 200, 359]) {
    for (const heading of [0, 90, 135, 270, 359]) {
      const want = (((heading - bearing) % 360) + 360) % 360;
      assert.ok(
        near(onScreen(heading, bearing), gazeOffset(want)),
        `facing ${heading}° on a map at ${bearing}°: ${want}° from up on the screen`,
      );
    }
  }
});

test('in the compass view, the map turned with the phone, the eyes look up the screen', () => {
  for (const heading of [0, 1, 90, 120, 200, 359]) {
    assert.ok(near(onScreen(heading, heading), { x: 0, y: -GAZE_PX }), `${heading}°`);
  }
});

test('the heading wraps: 359° and 1° put the eyes a hair apart, 0° and 360° in one place', () => {
  const a = gazeOffset(359);
  const b = gazeOffset(1);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.2 * GAZE_PX, JSON.stringify({ a, b }));
  assert.deepEqual(gazeOffset(0), gazeOffset(360));
});
