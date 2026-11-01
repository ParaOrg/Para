// The "Track your routes" offer, once per phone (src/features/contribute/tutorial/
// track-routes-offer.ts): answered by Tutorial or Later, kept in localStorage, and anything else
// kept there read as not answered.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/track-routes-offer-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const { isTrackRoutesOfferAnswered, markTrackRoutesOfferAnswered } =
  await import('../../src/features/contribute/tutorial/track-routes-offer.ts');

test('a phone that never answered it is offered it', () => {
  store.clear();
  assert.equal(isTrackRoutesOfferAnswered(), false);
});

test('once answered, it is answered for good', () => {
  store.clear();
  markTrackRoutesOfferAnswered();
  assert.equal(isTrackRoutesOfferAnswered(), true);
});

test('anything else kept under its key is not an answer', () => {
  store.clear();
  store.set('para.contribute.track-routes-offer', 'yes');
  assert.equal(isTrackRoutesOfferAnswered(), false);
});

test('storage that will not answer counts as not answered', () => {
  const saved = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
  };
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(isTrackRoutesOfferAnswered(), false);
  } finally {
    console.warn = warn;
    globalThis.localStorage = saved;
  }
});
