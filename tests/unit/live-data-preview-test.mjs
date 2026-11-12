// Which pages are previews that work on the live data (src/shared/config/env.ts): staging's and
// every branch's workers.dev address, never the production site, a computer's own dev server or
// the contributor app.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/live-data-preview-test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { isLiveDataPreview } from '../../src/shared/config/env.ts';

test('the production site is not a preview', () => {
  assert.equal(isLiveDataPreview('www.para-commute.org', 'production'), false);
  assert.equal(isLiveDataPreview('para-commute.org', 'production'), false);
});

test("staging's address is a preview", () => {
  assert.equal(isLiveDataPreview('staging-para.para-ph-info.workers.dev', 'production'), true);
});

test("a branch's address is a preview", () => {
  assert.equal(
    isLiveDataPreview('claude-some-branch-para.para-ph-info.workers.dev', 'production'),
    true,
  );
});

test("a computer's own dev server is not a preview", () => {
  assert.equal(isLiveDataPreview('localhost', 'development'), false);
  assert.equal(isLiveDataPreview('127.0.0.1', 'development'), false);
});

test('the contributor app is never a preview, whatever serves its page', () => {
  assert.equal(isLiveDataPreview('localhost', 'apk'), false);
  assert.equal(isLiveDataPreview('staging-para.para-ph-info.workers.dev', 'apk'), false);
});

test('only a workers.dev address counts, not a name that merely ends like one', () => {
  assert.equal(isLiveDataPreview('workers.dev.example.org', 'production'), false);
  assert.equal(isLiveDataPreview('notworkers.dev', 'production'), false);
});
