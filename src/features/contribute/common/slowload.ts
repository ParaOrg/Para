import { SLOWLOAD_KEY } from './slowload-switch';

/**
 * A test switch for looking at the skeletons on a phone: `/contribute/?slowload` holds every load
 * of History's and Account's data back by 2 s, `?slowload=N` by N seconds (1 to 10), and
 * `?slowload=off` turns it off. Kept for the browser tab's session, so the hash moves and reloads
 * keep it. It changes nothing else.
 */

const DEFAULT_SECONDS = 2;
const MIN_SECONDS = 1;
const MAX_SECONDS = 10;

/** The delay `?slowload` asks for in a query string, in ms: 'off', or null when it says nothing. */
export function slowloadAsked(search: string): number | 'off' | null {
  const value = new URLSearchParams(search).get('slowload');
  if (value === null) return null;
  if (value.trim().toLowerCase() === 'off') return 'off';
  const seconds = Number(value);
  if (value.trim() === '' || !Number.isFinite(seconds)) return DEFAULT_SECONDS * 1000;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, seconds)) * 1000;
}

/**
 * The delay the loads are held back by, in ms: the address's `?slowload` if it has one, else the
 * one kept for the session (`stored`, in ms), else none (0).
 */
export function slowloadDelayMs(search: string, stored: string | null): number {
  const asked = slowloadAsked(search);
  if (asked === 'off') return 0;
  if (asked !== null) return asked;
  if (stored === null) return 0;
  const kept = slowloadAsked(`slowload=${encodeURIComponent(Number(stored) / 1000)}`);
  return typeof kept === 'number' ? kept : 0;
}

function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(SLOWLOAD_KEY);
  } catch {
    // Storage refused (a private window): the switch lasts for this page only.
    return null;
  }
}

function keep(ms: number): void {
  try {
    if (ms === 0) window.sessionStorage.removeItem(SLOWLOAD_KEY);
    else window.sessionStorage.setItem(SLOWLOAD_KEY, String(ms));
  } catch {
    // Storage refused: the switch still holds until the page reloads.
  }
}

/** Reads the switch, keeps it for the tab, and says the delay in ms. Once, at boot. */
export function applySlowload(): number {
  const ms = slowloadDelayMs(window.location.search, readStored());
  keep(ms);
  return ms;
}
