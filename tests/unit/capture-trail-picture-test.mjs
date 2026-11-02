// History's picture of the trail (src/features/contribute/map/capture-trail-picture.ts): a capture
// whose frame is never drawn still ends, puts the camera back and says which step held it up.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/capture-trail-picture-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RENDER_MS,
  captureTrailPicture,
} from '../../src/features/contribute/map/capture-trail-picture.ts';

const trail = {
  lines: [
    {
      mode: 'walk',
      path: [
        [121.0, 14.6],
        [121.0056, 14.6],
      ],
    },
  ],
  markers: [],
  marks: [],
};

const point = (lng, lat) => ({
  lng,
  lat,
  // Metres enough for the capture's "still framed" test: degrees scaled, not a true distance.
  distanceTo: (other) => Math.hypot(other.lng - lng, other.lat - lat) * 111_000,
});

/** A stand-in map: idle at once after the framing, and a frame never drawn when `isDrawing` is false. */
function standInMap({ isDrawing }) {
  const listeners = new Map();
  let center = point(121.0056, 14.6);
  let zoom = 17;
  const jumps = [];
  const emit = (event) => [...(listeners.get(event) ?? [])].forEach((listener) => listener());
  const map = {
    jumps,
    getCanvas: () => ({ clientWidth: 400, clientHeight: 800, width: 800, height: 1600 }),
    getCenter: () => center,
    getZoom: () => zoom,
    getBearing: () => 0,
    getPitch: () => 0,
    on: (event, listener) => listeners.set(event, [...(listeners.get(event) ?? []), listener]),
    off: (event, listener) =>
      listeners.set(
        event,
        (listeners.get(event) ?? []).filter((l) => l !== listener),
      ),
    once: (event, listener) => {
      const once = () => {
        map.off(event, once);
        listener();
      };
      map.on(event, once);
      if (event === 'idle') queueMicrotask(() => emit('idle'));
    },
    getLayer: () => undefined,
    getLayoutProperty: () => 'visible',
    setLayoutProperty: () => {},
    fitBounds: ([[west, south], [east, north]]) => {
      center = point((west + east) / 2, (south + north) / 2);
      zoom = 15.5;
    },
    areTilesLoaded: () => true,
    triggerRepaint: () => {
      if (isDrawing) queueMicrotask(() => emit('render'));
    },
    jumpTo: (camera) => {
      jumps.push(camera);
      center = point(camera.center.lng, camera.center.lat);
      zoom = camera.zoom;
    },
  };
  return map;
}

test('a frame never drawn: the capture ends with no picture, in about RENDER_MS', async () => {
  const map = standInMap({ isDrawing: false });
  const warnings = [];
  const warn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  const startedAt = Date.now();
  try {
    const picture = await captureTrailPicture(map, trail, new AbortController().signal);
    const took = Date.now() - startedAt;
    assert.equal(picture, null);
    assert.ok(took >= RENDER_MS - 50 && took < RENDER_MS + 1000, `took ${took} ms`);
  } finally {
    console.warn = warn;
  }
  // The camera is back where the rider had it, not on the trail's frame.
  assert.equal(map.jumps.length, 1);
  assert.equal(map.jumps[0].center.lng, 121.0056);
  assert.equal(map.jumps[0].zoom, 17);
  // One warning, with each step and when it came: the frame is the step that held it up.
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /given up/);
  assert.match(warnings[0], /framed \d+ ms → idle \d+ ms → no frame drawn \d+ ms/);
});

test('the form closing mid-capture says nothing: no failure to report', async () => {
  const map = standInMap({ isDrawing: false });
  const warnings = [];
  const warn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  const controller = new AbortController();
  try {
    const capture = captureTrailPicture(map, trail, controller.signal);
    controller.abort();
    assert.equal(await capture, null);
  } finally {
    console.warn = warn;
  }
  assert.equal(warnings.length, 0);
});
