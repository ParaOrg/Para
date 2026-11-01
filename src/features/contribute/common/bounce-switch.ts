import * as z from 'zod/mini';

/**
 * The toolbar pill's spring at the three strengths the owner is choosing between, by how far past
 * its tab the pill goes before it settles. Medium is tokens.css's `--ease-pill`.
 */
const PILL_SPRINGS = {
  soft: 'cubic-bezier(0.34, 1.35, 0.64, 1)', // about 4% past
  medium: 'cubic-bezier(0.34, 1.45, 0.64, 1)', // about 6.5% past
  strong: 'cubic-bezier(0.34, 1.55, 0.64, 1)', // about 9.5% past
} as const;

const strengthSchema = z.enum(['soft', 'medium', 'strong']);

/**
 * A preview switch for picking the pill's spring: `?bounce=soft|medium|strong` sets
 * `--ease-pill` for this page. Anything else leaves the token as it is.
 * TODO: remove, with its call in main.tsx, once the owner has picked a strength for --ease-pill.
 */
export function applyBounceIfAsked(): void {
  const asked = strengthSchema.safeParse(new URLSearchParams(window.location.search).get('bounce'));
  if (!asked.success) return;
  document.documentElement.style.setProperty('--ease-pill', PILL_SPRINGS[asked.data]);
}
