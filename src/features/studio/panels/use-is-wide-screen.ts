import { useSyncExternalStore } from 'react';

/**
 * A computer's screen, as far as the studio's layout goes: Tailwind's `lg`,
 * 1024 px. Below it the map is too narrow to share with a panel beside it.
 */
const WIDE_SCREEN = '(min-width: 64rem)';

const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(WIDE_SCREEN);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
};
const isWideNow = () => window.matchMedia(WIDE_SCREEN).matches;

/** Whether the screen is wide enough for the route's panel beside the map, kept current as the window resizes. */
export function useIsWideScreen(): boolean {
  return useSyncExternalStore(subscribe, isWideNow, () => false);
}
