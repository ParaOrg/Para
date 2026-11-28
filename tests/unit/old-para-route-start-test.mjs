// "Start from an old Para route" in the studio (src/features/studio/old-para-routes/,
// .scratch/old-para-routes/spec.md): the files read through the studio's schema, the search by
// name, a place in it and Para ID, the routes near a point, and that the public map's offline
// worker keeps none of the files.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs --test tests/unit/old-para-route-start-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { runtimeCaches } from '../../scripts/node/offline-worker-caches.ts';
import { basemapCacheRules } from '../../src/shared/config/basemap-cache-rules.ts';
import {
  fetchOldParaRoute,
  fetchOldParaRouteIndex,
} from '../../src/features/studio/old-para-routes/fetch-old-para-routes.ts';
import { oldParaRouteFacts } from '../../src/features/studio/old-para-routes/old-para-route-facts.ts';
import {
  oldParaRouteIndexSchema,
  oldParaRouteSchema,
} from '../../src/features/studio/old-para-routes/old-para-route-schema.ts';
import {
  oldParaRoutesNear,
  paraIdOf,
  searchOldParaRoutes,
} from '../../src/features/studio/old-para-routes/search-old-para-routes.ts';
import { seedPoints } from '../../src/features/studio/osm-routes/seed-points.ts';

const DIR = new URL('../../public/data/old-para-routes/v1/', import.meta.url);
const readJson = (name) => JSON.parse(readFileSync(new URL(name, DIR), 'utf8'));
const routes = oldParaRouteIndexSchema.parse(readJson('index.json'));

test('the committed files read through the studio’s schema', () => {
  assert.equal(routes.length, 1734, 'the source’s 1,737 less the 3 hidden test rows');
  const ikot = routes[0];
  assert.equal(ikot.paraId, 'PARA-0001');
  assert.equal(ikot.name, 'UP - IKOT');
  assert.equal(ikot.isVerified, true);
  assert.ok(ikot.coarse && ikot.coarse.length >= 2);
  const file = oldParaRouteSchema.parse(readJson('para-0001.json'));
  assert.equal(file.paraId, 'PARA-0001');
  assert.ok(file.line.length > ikot.coarse.length, 'the file holds the finer line');
  assert.ok(seedPoints(file).length >= 2, 'a drawing can be seeded from it');
  const noLine = routes.find((route) => route.paraId === 'PARA-0049');
  assert.equal(noLine.coarse, null);
  assert.ok(noLine.start && noLine.end, 'its ends are known');
});

test('the hidden test rows never reach the studio: not listed, searched or near', () => {
  const hidden = ['PARA-1734', 'PARA-1735', 'PARA-1736'];
  assert.ok(routes.every((route) => !hidden.includes(route.paraId)));
  for (const paraId of hidden) assert.deepEqual(searchOldParaRoutes(paraId, routes), []);
  assert.deepEqual(searchOldParaRoutes('HEALTH_CHECK', routes), []);
  assert.deepEqual(searchOldParaRoutes('health check', routes), []);
});

test('the fetchers read the files by their URLs and fail on a missing one', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const name = String(url).replace('/data/old-para-routes/v1/', '');
    let body;
    try {
      body = readJson(name);
    } catch {
      return { ok: false, status: 404 };
    }
    return { ok: true, json: async () => body };
  };
  try {
    assert.equal((await fetchOldParaRouteIndex()).length, routes.length);
    assert.equal((await fetchOldParaRoute('PARA-0002')).name, 'UP - Philcoa');
    await assert.rejects(fetchOldParaRoute('PARA-0049'), /HTTP 404/, 'no line, no file');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('a Para ID is typed whole, any case, with or without its PARA', () => {
  assert.equal(paraIdOf('PARA-0123'), 'PARA-0123');
  assert.equal(paraIdOf(' para0123 '), 'PARA-0123');
  assert.equal(paraIdOf('para 12'), 'PARA-0012');
  assert.equal(paraIdOf('0123'), 'PARA-0123');
  assert.equal(paraIdOf('123'), null, 'three digits alone are a name’s');
  assert.equal(paraIdOf('Cubao'), null);
  const ids = (query) => searchOldParaRoutes(query, routes).map((route) => route.paraId);
  assert.deepEqual(ids('para-0002'), ['PARA-0002']);
  assert.deepEqual(ids('0002'), ['PARA-0002']);
});

test('a search finds routes by name, a place in it, and a typo, at most 20', () => {
  const cubao = searchOldParaRoutes('Cubao', routes);
  assert.equal(cubao.length, 20);
  assert.ok(cubao.every((route) => /cubao/i.test(route.name)));
  const guinto = searchOldParaRoutes('Guinto', routes);
  assert.ok(
    guinto.some((route) => route.name === 'Baclaran - P. Campa via L. Guinto'),
    'a place inside the name',
  );
  const typo = searchOldParaRoutes('Divisorya', routes);
  assert.ok(
    typo.some((route) => /divisoria/i.test(route.name)),
    'a typo forgiven',
  );
  const ikot = searchOldParaRoutes('UP - Ikot', routes);
  assert.equal(ikot[0].paraId, 'PARA-0001', 'the name typed whole first');
  assert.deepEqual(searchOldParaRoutes('  ', routes), []);
  assert.deepEqual(searchOldParaRoutes('zzzzqxw', routes), []);
});

test('a result names its mode, whether it was verified, and "No line" where there is none', () => {
  assert.equal(oldParaRouteFacts(routes[0]), 'Jeepney · PARA-0001 · Verified');
  const noLine = routes.find((route) => route.paraId === 'PARA-0049');
  assert.match(oldParaRouteFacts(noLine), /· Unverified · No line$/);
});

test('the routes near a point are those with a line passing it, nearest first', () => {
  // Inside UP Diliman, on the Ikot's loop.
  const near = oldParaRoutesNear([121.0624, 14.6525], routes);
  assert.ok(near.length > 0 && near.length <= 20);
  assert.ok(near.some((route) => route.paraId === 'PARA-0001'));
  assert.ok(near.every((route) => route.coarse !== null));
  assert.deepEqual(oldParaRoutesNear([120.65, 15.0], routes), [], 'none in a field');
});

test("the public map's offline worker keeps none of the old Para route files", () => {
  const ORIGIN = 'https://www.para-commute.org';
  globalThis.self = { location: { origin: ORIGIN } };
  const rules = runtimeCaches(basemapCacheRules('https://tiles.openfreemap.org'));
  for (const name of ['index.json', 'para-0001.json']) {
    const url = new URL(`/data/old-para-routes/v1/${name}`, ORIGIN);
    const request = { method: 'GET', destination: '' };
    const matching = rules.filter(
      (rule) => typeof rule.urlPattern === 'function' && rule.urlPattern({ url, request }),
    );
    assert.deepEqual(matching, [], name);
  }
});
