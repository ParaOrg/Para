// The browser's install offer (src/features/published-map/install-offer.ts):
// kept only on Android (the owner's pick, 2026-10-13), Chrome's own infobar
// held back, good for one ask, and gone once the app is installed.
//
// The module keeps the offer in module state, so each test imports a fresh
// copy (a query string makes a new module) against a window of its own.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/install-offer-test.mjs
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const nodeNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
afterEach(() => {
  delete globalThis.window;
  Object.defineProperty(globalThis, 'navigator', nodeNavigator);
});

let copies = 0;
/** A fresh install-offer module, on a phone with this user agent. */
async function onPhone(userAgent) {
  const window = new EventTarget();
  globalThis.window = window;
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent },
    configurable: true,
  });
  const offer = await import(`../../src/features/published-map/install-offer.ts?copy=${copies++}`);
  offer.listenForInstallOffer();
  return { window, ...offer };
}

/** Chromium's beforeinstallprompt, recording what is asked of it. */
function installPrompt(outcome = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompts = 0;
  event.prompt = async () => {
    event.prompts++;
  };
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

test('on Android the offer is kept, and Chrome’s own infobar is held back', async () => {
  const { window, installApp } = await onPhone(ANDROID);
  const event = installPrompt();
  window.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  await installApp();
  assert.equal(event.prompts, 1);
});

test('an offer is good for one ask: the second installApp asks nothing', async () => {
  const { window, installApp } = await onPhone(ANDROID);
  const event = installPrompt('dismissed');
  window.dispatchEvent(event);
  await installApp();
  await installApp();
  assert.equal(event.prompts, 1);
});

test('a later offer replaces the earlier one', async () => {
  const { window, installApp } = await onPhone(ANDROID);
  const first = installPrompt();
  const second = installPrompt();
  window.dispatchEvent(first);
  window.dispatchEvent(second);
  await installApp();
  assert.equal(first.prompts, 0);
  assert.equal(second.prompts, 1);
});

test('once the app is installed the offer is gone', async () => {
  const { window, installApp } = await onPhone(ANDROID);
  const event = installPrompt();
  window.dispatchEvent(event);
  window.dispatchEvent(new Event('appinstalled'));
  await installApp();
  assert.equal(event.prompts, 0);
});

test('an event without prompt() is not an offer, and is left alone', async () => {
  const { window, installApp } = await onPhone(ANDROID);
  const event = new Event('beforeinstallprompt', { cancelable: true });
  window.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  await assert.doesNotReject(installApp());
});

test('with nothing offered, installApp does nothing and does not throw', async () => {
  const { installApp } = await onPhone(ANDROID);
  await assert.doesNotReject(installApp());
});

test('off Android nothing is listened for: an iPhone keeps no offer', async () => {
  const { window, installApp } = await onPhone(IPHONE);
  const event = installPrompt();
  window.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  await installApp();
  assert.equal(event.prompts, 0);
});
