import type { AccountGateState } from './account/use-account-gate';
import { SCREENS } from './navigation/screen-routes';
import type { Phase } from './recorder/recording-state';
import type { ToolbarTab } from './toolbar/bottom-toolbar';
import type { TutorialDemo } from './tutorial/tutorial-steps';

/*
 * What the contributor page shows, worked out from its state during render: which screen is over
 * the map, which question covers it, what is out of reach under them, and which tab is marked.
 * No React and no DOM, so a unit check can walk its cases (tests/unit/page-layout-test.mjs).
 */

/** What decides the screens over the map. */
export interface PageScreensState {
  phase: Phase;
  accountGate: AccountGateState;
  /** Whether this build has accounts: Account is a tab, and its screens can open. */
  hasAccount: boolean;
  /** The Android app's permissions screen, once per phone, not yet done. */
  isPermissionsPending: boolean;
  /** Each screen a hash opens, as the URL has it (useScreenView). */
  isHistoryOpen: boolean;
  /** A ride's screen, inside History (useRideView). */
  isRideOpen: boolean;
  isProfileOpen: boolean;
  isAccountSettingsOpen: boolean;
  isChangePasswordOpen: boolean;
  isDeleteAccountOpen: boolean;
}

export interface PageScreens {
  /** Account settings or a screen inside it, which Account shows in its place, with no toolbar. */
  isInsideAccount: boolean;
  /** Sign-in, sign-up or the profile step, before anything else. */
  isAccountGateShown: boolean;
  isPermissionsShown: boolean;
  isHistoryShown: boolean;
  /** A ride's screen: over the map, which stays live under it, with no toolbar. */
  isRideShown: boolean;
  /** Account, or a screen inside it. */
  isProfileShown: boolean;
  /** Ready with no screen of its own over it: Start, or the tutorial over Start. */
  isReadyClear: boolean;
  /** The recording screen, running or paused. */
  isRecordingShown: boolean;
  /** The recording screen, or the card of one left open: each has the credits' ⓘ. */
  isRideScreenShown: boolean;
  isFormShown: boolean;
  /** The hashes of the toolbar's screens that can open now, space-separated (OPENABLE_SCREENS_ATTR). */
  openableScreens: string;
}

/** The screens over the map: the one the phase and the URL's hash call for, if it may show. */
export function pageScreens(state: PageScreensState): PageScreens {
  const { phase, accountGate, hasAccount } = state;
  const canSend = accountGate === 'ready';
  const isInsideAccount =
    state.isAccountSettingsOpen || state.isChangePasswordOpen || state.isDeleteAccountOpen;
  // Once per phone, after sign-in: the screen itself closes at once if every permission is granted.
  const isPermissionsShown = state.isPermissionsPending && canSend && phase === 'ready';
  const isHistoryShown = phase === 'ready' && canSend && state.isHistoryOpen && !isPermissionsShown;
  const isRideShown = phase === 'ready' && canSend && state.isRideOpen && !isPermissionsShown;
  const isProfileShown =
    phase === 'ready' &&
    canSend &&
    hasAccount &&
    (state.isProfileOpen || isInsideAccount) &&
    !isPermissionsShown;
  const isRecordingShown = phase === 'recording' || phase === 'paused';
  return {
    isInsideAccount,
    isAccountGateShown: accountGate === 'needs-account' || accountGate === 'needs-profile',
    isPermissionsShown,
    isHistoryShown,
    isRideShown,
    isProfileShown,
    isReadyClear:
      canSend &&
      phase === 'ready' &&
      !isHistoryShown &&
      !isRideShown &&
      !isProfileShown &&
      !isPermissionsShown,
    isRecordingShown,
    isRideScreenShown: canSend && (isRecordingShown || phase === 'unfinished'),
    isFormShown: phase === 'form',
    // A move to any other screen draws nothing to wait for (tab-motion.ts).
    openableScreens: [
      canSend && SCREENS.history.hash,
      canSend && SCREENS.ride.hash,
      hasAccount && SCREENS.profile.hash,
      hasAccount && SCREENS.accountSettings.hash,
      hasAccount && SCREENS.changePassword.hash,
      hasAccount && SCREENS.deleteAccount.hash,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

/** What is drawn over the screens: the tutorial, the map's credits and ✕'s question. */
export interface PageOverlays {
  /** The recording's time and distance are here: the recording screens wait for them. */
  hasFigures: boolean;
  isTutorialOpen: boolean;
  /** The tutorial's demo recording, drawn in Start's place under its later steps. */
  tutorialDemo: TutorialDemo;
  isCreditsOpen: boolean;
  /** Closed and sliding down: still drawn, the page under it live again. */
  isCreditsLeaving: boolean;
  isStopShown: boolean;
}

export interface PageLayout extends PageScreens {
  isStartShown: boolean;
  /** The recording screen's ⓘ is there once the screen is, with the figures it waits for. */
  hasCreditsButton: boolean;
  isCreditsShown: boolean;
  isCreditsDrawn: boolean;
  /** Every screen drawn over the whole map, and the questions that must be answered first. */
  isMapCovered: boolean;
  /** Start and the toolbar: inert under the credits and the tutorial, as the map is. */
  isStartOutOfReach: boolean;
  /** The recording screen: inert under the credits and ✕'s question. */
  isRecordingOutOfReach: boolean;
  /** The tab the page's one toolbar marks, or null when it is not drawn. */
  toolbarTab: ToolbarTab | null;
}

/** The whole page's layout: its screens, with what is drawn over them. */
export function pageLayout(screens: PageScreens, overlays: PageOverlays): PageLayout {
  const isStartShown = screens.isReadyClear && overlays.tutorialDemo === null;
  const hasCreditsButton = isStartShown || (screens.isRideScreenShown && overlays.hasFigures);
  const isCreditsShown = hasCreditsButton && overlays.isCreditsOpen;
  // The page's one toolbar, over Record, History and Account alike.
  let toolbarTab: ToolbarTab | null = null;
  if (screens.isHistoryShown) toolbarTab = 'history';
  else if (screens.isProfileShown && !screens.isInsideAccount) toolbarTab = 'account';
  else if (isStartShown) toolbarTab = 'record';
  return {
    ...screens,
    isStartShown,
    hasCreditsButton,
    isCreditsShown,
    isCreditsDrawn: hasCreditsButton && (overlays.isCreditsOpen || overlays.isCreditsLeaving),
    // Unfinished is not one: its card leaves the map and its buttons in sight, and in use.
    isMapCovered:
      screens.isAccountGateShown ||
      screens.isHistoryShown ||
      screens.isProfileShown ||
      screens.isPermissionsShown ||
      isCreditsShown ||
      overlays.isTutorialOpen ||
      overlays.isStopShown ||
      screens.isFormShown,
    isStartOutOfReach: isCreditsShown || overlays.isTutorialOpen,
    isRecordingOutOfReach: isCreditsShown || overlays.isStopShown,
    toolbarTab,
  };
}
