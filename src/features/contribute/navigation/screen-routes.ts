import * as z from 'zod/mini';

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
 * The contributor page's screens reached by the URL's hash: Record (no hash), History, a ride
 * inside History, Account, Account settings inside Account, and Change password and Delete account
 * inside Account settings. A ride's hash carries its id after a slash: `#ride/<id>`.
 */
export const SCREENS = {
  record: { hash: '', order: 0, tab: 'record' },
  history: { hash: '#history', order: 1, tab: 'history' },
  // Past History, short of Account: opened from History, it slides in from the right.
  ride: { hash: '#ride', order: 1.5 },
  profile: { hash: '#profile', order: 2, tab: 'account' },
  accountSettings: { hash: '#account-settings', order: 3 },
  changePassword: { hash: '#change-password', order: 4 },
  deleteAccount: { hash: '#delete-account', order: 4 },
} as const satisfies Record<string, ScreenRoute>;

export type ScreenName = keyof typeof SCREENS;

export type ScreenHash = (typeof SCREENS)[ScreenName]['hash'];

/** The screen's own hash in a URL's hash: `#ride/<id>` is the ride screen's `#ride`. */
export function screenHashOf(hash: string): string {
  const slash = hash.indexOf('/');
  return slash === -1 ? hash : hash.slice(0, slash);
}

/** The order of the screen at `hash` (any URL hash), or undefined for one that is not a screen. */
export function orderOf(hash: string): number | undefined {
  const own = screenHashOf(hash);
  return Object.values(SCREENS).find((screen) => screen.hash === own)?.order;
}

/**
 * A recording's id: any 128-bit hex id, as the database's uuid column takes it. Not z.uuid()'s
 * RFC check, which an upload made by another app could fail, and its card would then open nothing.
 */
const rideIdSchema = z.guid();

/** The URL hash of the ride screen for the recording `rideId`. */
export const rideHashOf = (rideId: string): string => `${SCREENS.ride.hash}/${rideId}`;

/** The recording a URL's hash opens, or null when it is not a ride's or its id is not one. */
export function rideIdOf(hash: string): string | null {
  const prefix = `${SCREENS.ride.hash}/`;
  if (!hash.startsWith(prefix)) return null;
  const id = rideIdSchema.safeParse(hash.slice(prefix.length));
  return id.success ? id.data : null;
}
