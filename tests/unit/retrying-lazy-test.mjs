// A part of the page fetched apart from the rest must never blank the page when its fetch
// fails (src/shared/lib/retrying-lazy.tsx): it draws nothing, throws nothing for an error
// boundary to catch, and is asked for again. The Map Style card and the studio's Contributors
// map are fetched this way. Rendered by React's own server renderer, the helper read through
// Vite (it is TSX, which Node cannot strip).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/retrying-lazy-test.mjs
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { Suspense, createElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});
after(() => vite.close());
const { retryingLazy } = await vite.ssrLoadModule('/src/shared/lib/retrying-lazy.tsx');

/** What a lazy part draws once React has waited for it, and every error React was handed. */
const drawn = (Part) =>
  new Promise((resolve) => {
    const errors = [];
    let html = '';
    const out = new Writable({
      write(chunk, _encoding, done) {
        html += String(chunk);
        done();
      },
      final(done) {
        resolve({ html, errors });
        done();
      },
    });
    const stream = renderToPipeableStream(
      createElement(
        'main',
        null,
        createElement(Suspense, { fallback: 'waiting' }, createElement(Part)),
      ),
      {
        onError: (error) => errors.push(error),
        onAllReady: () => stream.pipe(out),
      },
    );
  });

test('a part whose fetch fails draws nothing and throws nothing, and says so once', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const Part = retryingLazy(() => Promise.reject(new Error('Failed to fetch')));
  const { html, errors } = await drawn(Part);
  assert.deepEqual(errors, [], 'no error reaches a boundary');
  assert.doesNotMatch(html, /waiting/, 'it is done waiting');
  assert.deepEqual(html.match(/<[a-z][^>]*>/g), ['<main>'], 'it draws no element of its own');
  assert.doesNotMatch(html, />[^<]+</, 'and no text');
  assert.equal(warn.mock.callCount(), 1);
});

test('a part whose fetch succeeds is drawn', async () => {
  const Part = retryingLazy(() => Promise.resolve(() => createElement('p', null, 'the part')));
  const { html, errors } = await drawn(Part);
  assert.deepEqual(errors, []);
  assert.match(html, /<p>the part<\/p>/);
});

test('the Map Style card and the Contributors map are fetched this way, never by plain lazy', () => {
  for (const path of [
    'src/features/routes/map/lazy-map-style.ts',
    'src/features/studio/contributors/studio-contributors.tsx',
  ]) {
    const text = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
    assert.match(text, /retryingLazy\(/, `${path} does not fetch through retryingLazy`);
    assert.match(text, /retryingImport\(/, `${path} does not ask again through retryingImport`);
    assert.doesNotMatch(text, /\blazy\b[^;]*from 'react'/, `${path} still imports React's lazy`);
  }
});
