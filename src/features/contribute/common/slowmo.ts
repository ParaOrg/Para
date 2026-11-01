import * as z from 'zod/mini';

import { SLOWMO_KEY } from './slowmo-switch';

/**
 * A test switch for looking at the page's motion slowly: `/contribute/?slowmo` multiplies every
 * motion duration by 5, `?slowmo=N` by N (1 to 10), and `?slowmo=off` turns it off. Kept for the
 * browser tab's session, so the hash moves and reloads keep it. It changes nothing else: harmless
 * in any build, so it needs no build flag.
 */

const DEFAULT_FACTOR = 5;
const MIN_FACTOR = 1;
const MAX_FACTOR = 10;

/** The owner's Motion durations (tokens.css): every motion on the page reads one of them. */
const DURATION_TOKENS = [
  '--transition-duration-instant',
  '--transition-duration-quick',
  '--transition-duration-base',
  '--transition-duration-gentle',
  '--transition-duration-sheet',
  '--transition-duration-turn',
  '--transition-duration-slow',
] as const;

const factorSchema = z.pipe(
  z.string(),
  z.transform((text) => {
    const factor = Number(text);
    if (text.trim() === '' || !Number.isFinite(factor)) return DEFAULT_FACTOR;
    return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, factor));
  }),
);

/** What the switch asks for: a factor to slow by, 'off' to stop, or null when it says nothing. */
type SlowmoAsk = number | 'off' | null;

/** `?slowmo`'s value in a query string, read as the switch reads it. */
export function slowmoAsked(search: string): SlowmoAsk {
  const value = new URLSearchParams(search).get('slowmo');
  if (value === null) return null;
  if (value.trim().toLowerCase() === 'off') return 'off';
  return factorSchema.parse(value);
}

/**
 * The factor the page's motion is slowed by: the address's `?slowmo` if it has one, else the one
 * kept for the session (`stored`), else none.
 */
export function slowmoFactor(search: string, stored: string | null): number | null {
  const asked = slowmoAsked(search);
  if (asked === 'off') return null;
  if (asked !== null) return asked;
  if (stored === null) return null;
  const kept = slowmoAsked(`slowmo=${encodeURIComponent(stored)}`);
  return typeof kept === 'number' ? kept : null;
}

function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(SLOWMO_KEY);
  } catch {
    // Storage refused (a private window): the switch lasts for this page only.
    return null;
  }
}

function keep(factor: number | null): void {
  try {
    if (factor === null) window.sessionStorage.removeItem(SLOWMO_KEY);
    else window.sessionStorage.setItem(SLOWMO_KEY, String(factor));
  } catch {
    // Storage refused: the switch still holds until the page reloads.
  }
}

/** Slows every motion duration on the page by the switch's factor, if it is on. Once, at boot. */
export function applySlowmo(): void {
  const factor = slowmoFactor(window.location.search, readStored());
  keep(factor);
  if (factor === null || factor === 1) return;
  const root = document.documentElement;
  const style = getComputedStyle(root);
  for (const token of DURATION_TOKENS) {
    const ms = Number.parseFloat(style.getPropertyValue(token));
    if (Number.isFinite(ms)) root.style.setProperty(token, `${ms * factor}ms`);
  }
}
