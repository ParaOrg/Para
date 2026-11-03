// The contributor page's layout (src/features/contribute/page-layout.ts): which screen shows over
// the map, what covers it, what is out of reach, and which toolbar tab is marked.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/page-layout-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageLayout, pageScreens } from '../../src/features/contribute/page-layout.ts';

/** Ready, signed in, in a build with accounts, no hash open: Start. */
const READY = {
  phase: 'ready',
  accountGate: 'ready',
  hasAccount: true,
  isPermissionsPending: false,
  isHistoryOpen: false,
  isRideDetailOpen: false,
  isProfileOpen: false,
  isAccountSettingsOpen: false,
  isChangePasswordOpen: false,
  isDeleteAccountOpen: false,
};

const NOTHING_OVER = {
  hasFigures: false,
  isTutorialOpen: false,
  tutorialDemo: null,
  isCreditsOpen: false,
  isCreditsLeaving: false,
  isStopShown: false,
};

function layoutOf(state, overlays = {}) {
  return pageLayout(pageScreens({ ...READY, ...state }), { ...NOTHING_OVER, ...overlays });
}

test('Ready with nothing open shows Start, Record marked, the map uncovered', () => {
  const layout = layoutOf({});
  assert.equal(layout.isStartShown, true);
  assert.equal(layout.isReadyClear, true);
  assert.equal(layout.toolbarTab, 'record');
  assert.equal(layout.isMapCovered, false);
  assert.equal(layout.hasCreditsButton, true);
  assert.equal(layout.isStartOutOfReach, false);
});

test('#history on Ready shows History over the map, History marked', () => {
  const layout = layoutOf({ isHistoryOpen: true });
  assert.equal(layout.isHistoryShown, true);
  assert.equal(layout.isStartShown, false);
  assert.equal(layout.isReadyClear, false);
  assert.equal(layout.toolbarTab, 'history');
  assert.equal(layout.isMapCovered, true);
  assert.equal(layout.hasCreditsButton, false);
});

test('#history shows nothing while signed out or recording', () => {
  assert.equal(
    layoutOf({ isHistoryOpen: true, accountGate: 'needs-account' }).isHistoryShown,
    false,
  );
  assert.equal(layoutOf({ isHistoryOpen: true, phase: 'recording' }).isHistoryShown, false);
  assert.equal(layoutOf({ isHistoryOpen: true, phase: 'loading' }).isHistoryShown, false);
});

test('Account shows with Account marked; a screen inside it shows with no toolbar', () => {
  const account = layoutOf({ isProfileOpen: true });
  assert.equal(account.isProfileShown, true);
  assert.equal(account.toolbarTab, 'account');
  assert.equal(account.isMapCovered, true);
  for (const inside of ['isAccountSettingsOpen', 'isChangePasswordOpen', 'isDeleteAccountOpen']) {
    const layout = layoutOf({ [inside]: true });
    assert.equal(layout.isInsideAccount, true, inside);
    assert.equal(layout.isProfileShown, true, inside);
    assert.equal(layout.toolbarTab, null, inside);
  }
});

test('a build with no accounts never shows Account, nor lists its screens as openable', () => {
  const layout = layoutOf({ hasAccount: false, isProfileOpen: true });
  assert.equal(layout.isProfileShown, false);
  assert.equal(layout.isStartShown, true);
  assert.equal(layout.openableScreens, '#history #ride');
});

test('the openable screens: History and a ride once signed in, Account and its screens with accounts', () => {
  assert.equal(
    layoutOf({}).openableScreens,
    '#history #ride #profile #account-settings #change-password #delete-account',
  );
  assert.equal(
    layoutOf({ accountGate: 'loading' }).openableScreens,
    '#profile #account-settings #change-password #delete-account',
  );
  assert.equal(layoutOf({ accountGate: 'loading', hasAccount: false }).openableScreens, '');
});

test('the permissions screen, pending, takes Ready before History or Account', () => {
  const layout = layoutOf({ isPermissionsPending: true, isHistoryOpen: true });
  assert.equal(layout.isPermissionsShown, true);
  assert.equal(layout.isHistoryShown, false);
  assert.equal(layout.isStartShown, false);
  assert.equal(layout.toolbarTab, null);
  assert.equal(layout.isMapCovered, true);
  assert.equal(
    layoutOf({ isPermissionsPending: true, phase: 'recording' }).isPermissionsShown,
    false,
  );
});

test('the account gate covers the map and shows no Start', () => {
  for (const accountGate of ['needs-account', 'needs-profile']) {
    const layout = layoutOf({ accountGate });
    assert.equal(layout.isAccountGateShown, true, accountGate);
    assert.equal(layout.isMapCovered, true, accountGate);
    assert.equal(layout.isStartShown, false, accountGate);
    assert.equal(layout.toolbarTab, null, accountGate);
  }
  const loading = layoutOf({ accountGate: 'loading' });
  assert.equal(loading.isAccountGateShown, false);
  assert.equal(loading.isMapCovered, false);
  assert.equal(loading.isStartShown, false);
});

test('the tutorial covers the map and puts Start and the toolbar out of reach', () => {
  const layout = layoutOf({}, { isTutorialOpen: true });
  assert.equal(layout.isStartShown, true);
  assert.equal(layout.isMapCovered, true);
  assert.equal(layout.isStartOutOfReach, true);
});

test("the tutorial's demo takes Start's place: no Start, no toolbar, no credits' ⓘ", () => {
  const layout = layoutOf({}, { isTutorialOpen: true, tutorialDemo: 'recording' });
  assert.equal(layout.isStartShown, false);
  assert.equal(layout.isReadyClear, true);
  assert.equal(layout.toolbarTab, null);
  assert.equal(layout.hasCreditsButton, false);
});

test('the credits, open over Start, cover the map; leaving, they are drawn but not shown', () => {
  const open = layoutOf({}, { isCreditsOpen: true });
  assert.equal(open.isCreditsShown, true);
  assert.equal(open.isCreditsDrawn, true);
  assert.equal(open.isMapCovered, true);
  assert.equal(open.isStartOutOfReach, true);
  const leaving = layoutOf({}, { isCreditsLeaving: true });
  assert.equal(leaving.isCreditsShown, false);
  assert.equal(leaving.isCreditsDrawn, true);
  assert.equal(leaving.isMapCovered, false);
  assert.equal(leaving.isStartOutOfReach, false);
});

test('the credits open with no ⓘ under them (History) are neither shown nor drawn', () => {
  const layout = layoutOf({ isHistoryOpen: true }, { isCreditsOpen: true, isCreditsLeaving: true });
  assert.equal(layout.isCreditsShown, false);
  assert.equal(layout.isCreditsDrawn, false);
});

test("the recording screen has the credits' ⓘ once its figures are here", () => {
  for (const phase of ['recording', 'paused']) {
    assert.equal(layoutOf({ phase }).isRecordingShown, true, phase);
    assert.equal(layoutOf({ phase }).hasCreditsButton, false, phase);
    assert.equal(layoutOf({ phase }, { hasFigures: true }).hasCreditsButton, true, phase);
    assert.equal(layoutOf({ phase }, { hasFigures: true }).toolbarTab, null, phase);
  }
  assert.equal(
    layoutOf({ phase: 'recording', accountGate: 'loading' }, { hasFigures: true }).hasCreditsButton,
    false,
  );
});

test('a recording left open (unfinished) leaves the map uncovered, with the ⓘ', () => {
  const layout = layoutOf({ phase: 'unfinished' }, { hasFigures: true });
  assert.equal(layout.isRecordingShown, false);
  assert.equal(layout.hasCreditsButton, true);
  assert.equal(layout.isMapCovered, false);
});

test("✕'s question covers the map and puts the recording screen out of reach", () => {
  const layout = layoutOf({ phase: 'paused' }, { hasFigures: true, isStopShown: true });
  assert.equal(layout.isMapCovered, true);
  assert.equal(layout.isRecordingOutOfReach, true);
  assert.equal(layout.isStartOutOfReach, false);
  const credits = layoutOf({ phase: 'paused' }, { hasFigures: true, isCreditsOpen: true });
  assert.equal(credits.isRecordingOutOfReach, true);
});

test('the Save form covers the map', () => {
  const layout = layoutOf({ phase: 'form' }, { hasFigures: true });
  assert.equal(layout.isFormShown, true);
  assert.equal(layout.isMapCovered, true);
  assert.equal(layout.hasCreditsButton, false);
});

test('#ride/<id> on Ready shows the ride over the live map, with no toolbar', () => {
  const layout = layoutOf({ isRideDetailOpen: true });
  assert.equal(layout.isRideDetailShown, true);
  assert.equal(layout.isHistoryShown, false);
  assert.equal(layout.isStartShown, false);
  assert.equal(layout.isReadyClear, false);
  assert.equal(layout.toolbarTab, null);
  assert.equal(layout.isMapCovered, false);
  assert.equal(layout.hasCreditsButton, false);
  assert.ok(layout.openableScreens.split(' ').includes('#ride'));
});

test('#ride/<id> shows nothing while signed out or recording', () => {
  assert.equal(
    layoutOf({ isRideDetailOpen: true, accountGate: 'needs-account' }).isRideDetailShown,
    false,
  );
  assert.equal(layoutOf({ isRideDetailOpen: true, phase: 'recording' }).isRideDetailShown, false);
});
