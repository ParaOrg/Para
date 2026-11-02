import { cssDurationMs } from './css-duration';

/**
 * A motion: one of the owner's Motion durations with one of the easings, by their custom
 * properties in tokens.css. Always written out whole, never built from parts: Tailwind keeps a
 * token in the page's CSS only where its full name is in the source, so a token a script alone
 * reads, under a built name, is dropped and reads empty.
 */
export type Motion = readonly [
  durationToken: `--transition-duration-${string}`,
  easingToken: `--ease-${string}`,
];

/*
 * Each motion a script plays is one of these, named by what moves, in the owner's tokens
 * (tokens.css): CSS reads the same tokens, so a script and a stylesheet never part. Here the ones
 * the public map plays; the contributor page's own are in features/contribute/common/motion.ts,
 * so the public map does not carry them (the shared chunk takes any module two chunks import).
 */
/** A sheet going down, with its scrim. */
export const SINK: Motion = ['--transition-duration-gentle', '--ease-exit'];

/** A motion's duration in milliseconds and its easing, read from the tokens as the page has them. */
export function motionOf([duration, easing]: Motion): { duration: number; easing: string } {
  const style = getComputedStyle(document.documentElement);
  return {
    duration: cssDurationMs(style.getPropertyValue(duration)) ?? 0,
    easing: style.getPropertyValue(easing).trim() || 'ease-out',
  };
}

/** Whether the person asked their device for less motion: then things change without moving. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
