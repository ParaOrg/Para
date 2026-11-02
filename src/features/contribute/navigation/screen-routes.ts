import type { ToolbarTab } from '../toolbar/bottom-toolbar';

interface ScreenRoute {
  /** The URL's hash while the screen shows: a reload stays on it, and Back leaves it. */
  hash: string;
  /**
   * Where the screen sits in the toolbar's order: moving to a higher one slides right, to a lower
   * one left (tab-motion.ts). Screens side by side share a number and just appear.
   */
  order: number;
  /** The toolbar tab marked while it shows; a screen inside Account has no toolbar. */
  tab?: ToolbarTab;
}

/**
 * The contributor page's screens reached by the URL's hash: Record (no hash), History, Account,
 * Account settings inside Account, and Change password and Delete account inside Account settings.
 */
export const SCREENS = {
  record: { hash: '', order: 0, tab: 'record' },
  history: { hash: '#history', order: 1, tab: 'history' },
  profile: { hash: '#profile', order: 2, tab: 'account' },
  accountSettings: { hash: '#account-settings', order: 3 },
  changePassword: { hash: '#change-password', order: 4 },
  deleteAccount: { hash: '#delete-account', order: 4 },
} as const satisfies Record<string, ScreenRoute>;

export type ScreenName = keyof typeof SCREENS;

export type ScreenHash = (typeof SCREENS)[ScreenName]['hash'];

/** The order of the screen at `hash` (any URL hash), or undefined for one that is not a screen. */
export function orderOf(hash: string): number | undefined {
  return Object.values(SCREENS).find((screen) => screen.hash === hash)?.order;
}
