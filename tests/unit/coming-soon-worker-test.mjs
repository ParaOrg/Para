// The site Worker's Coming soon: which hosts show it, which addresses it takes, and what it
// serves, with the static-assets binding stood in for.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/coming-soon-worker-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  COMING_SOON_PATH,
  isComingSoonHost,
  servePage,
  showsComingSoon,
} from '../../workers/site/src/coming-soon.ts';

test('the production site shows it: the custom domain, bare and www, and the Worker on workers.dev', () => {
  for (const host of ['www.para-commute.org', 'para-commute.org', 'para.para-ph-info.workers.dev'])
    assert.equal(isComingSoonHost(host), true, host);
});

test('every Preview keeps the map, staging among them, and so does a local server', () => {
  for (const host of [
    'staging-para.para-ph-info.workers.dev',
    'claude-coming-soon-para.para-ph-info.workers.dev',
    'tiles.para-commute.org',
    'localhost',
    'para-commute.org.example.com',
  ])
    assert.equal(isComingSoonHost(host), false, host);
});

test('a page takes it, but the editor, the contributor page and Coming soon itself are kept', () => {
  for (const path of ['/', '/app/', '/app', '/route/123', '/index.html'])
    assert.equal(showsComingSoon(path, 'text/html; charset=utf-8'), true, path);
  for (const path of [
    '/studio/',
    '/studio',
    '/studio/review',
    '/contribute/',
    '/contribute',
    '/coming-soon/',
  ])
    assert.equal(showsComingSoon(path, 'text/html'), false, path);
});

test('files are served as they are: scripts, data, pictures, a redirect', () => {
  assert.equal(showsComingSoon('/sw.js', 'text/javascript'), false);
  assert.equal(showsComingSoon('/app/para-logo.svg', 'image/svg+xml'), false);
  assert.equal(showsComingSoon('/manifest.webmanifest', 'application/manifest+json'), false);
  assert.equal(showsComingSoon('/index.html', null), false);
});

/** A stand-in for the assets binding: the map's page for any address it is not told otherwise. */
function assets(pages = {}) {
  const asked = [];
  return {
    asked,
    fetch: async (request) => {
      const { pathname } = new URL(request.url);
      asked.push(pathname);
      const page = pages[pathname] ?? { body: 'the map', type: 'text/html' };
      return new Response(page.body, { headers: { 'content-type': page.type } });
    },
  };
}

test('on the production site, / answers with Coming soon at the same address', async () => {
  const binding = assets({ [COMING_SOON_PATH]: { body: 'coming soon', type: 'text/html' } });
  const response = await servePage(new Request('https://www.para-commute.org/'), binding);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'coming soon');
  assert.deepEqual(binding.asked, ['/', COMING_SOON_PATH]);
});

test('on a Preview, / is the map, asked once', async () => {
  const binding = assets();
  const response = await servePage(
    new Request('https://staging-para.para-ph-info.workers.dev/'),
    binding,
  );
  assert.equal(await response.text(), 'the map');
  assert.deepEqual(binding.asked, ['/']);
});

test('on the production site, the editor, the contributor worker and a script are served as they are', async () => {
  const binding = assets({
    '/contribute/sw.js': { body: 'contributor worker', type: 'text/javascript' },
    '/old-app-cleanup.js': { body: 'cleanup', type: 'text/javascript' },
  });
  const studio = await servePage(new Request('https://www.para-commute.org/studio/'), binding);
  assert.equal(await studio.text(), 'the map');
  const contributor = await servePage(
    new Request('https://www.para-commute.org/contribute/sw.js'),
    binding,
  );
  assert.equal(await contributor.text(), 'contributor worker');
  const script = await servePage(
    new Request('https://www.para-commute.org/old-app-cleanup.js'),
    binding,
  );
  assert.equal(await script.text(), 'cleanup');
  assert.deepEqual(binding.asked, ['/studio/', '/contribute/sw.js', '/old-app-cleanup.js']);
});
