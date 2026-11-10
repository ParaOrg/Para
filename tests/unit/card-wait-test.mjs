import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_WAIT_MS,
  STARTED_CARD_WAIT_MS,
  cardWaitMs,
} from '../../src/features/contribute/motion/card-wait.ts';

const FOLD_MS = 150;

test('a start that did not happen keeps the short wait after the fold', () => {
  assert.equal(cardWaitMs(FOLD_MS, false), FOLD_MS + CARD_WAIT_MS);
});

test('once Start tracking has gone the morph waits about two seconds for the card', () => {
  assert.equal(cardWaitMs(FOLD_MS, true), FOLD_MS + STARTED_CARD_WAIT_MS);
  assert.ok(STARTED_CARD_WAIT_MS >= 1500 && STARTED_CARD_WAIT_MS <= 2500);
});

test('the wait for a started recording is longer than for a failed start', () => {
  assert.ok(cardWaitMs(FOLD_MS, true) > cardWaitMs(FOLD_MS, false));
});
