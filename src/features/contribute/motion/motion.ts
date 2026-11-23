import type { Motion } from '@/shared/utils/motion';

/*
 * The contributor page's motions, named by what moves, in the owner's tokens (tokens.css), played
 * with motionOf (shared/utils/motion.ts). Here, not in shared/utils, so the public map does not
 * carry them.
 */
/** Something arriving: a screen sliding in. */
export const ARRIVE: Motion = ['--transition-duration-base', '--ease-enter'];
/** Something on the screen changing place or shape: a pill opening into a card. */
export const MOVE: Motion = ['--transition-duration-gentle', '--ease-move'];
/** Something leaving, quickly: a button folding away. */
export const LEAVE: Motion = ['--transition-duration-quick', '--ease-exit'];
/** A quick change of place: a pill caught up under a finger. */
export const SHIFT: Motion = ['--transition-duration-quick', '--ease-move'];
/** A pill gliding to its place on a soft spring. */
export const PILL: Motion = ['--transition-duration-pill', '--ease-pill'];
/** The same spring, quicker: a pill turning to the newest of a run of taps. */
export const PILL_QUICK: Motion = ['--transition-duration-pill-quick', '--ease-pill'];
/** A colour changing in a pill's time, without its spring: a colour has nothing to overshoot. */
export const PILL_FADE: Motion = ['--transition-duration-pill', '--ease-move'];
/** The same, in the quicker pill's time. */
export const PILL_QUICK_FADE: Motion = ['--transition-duration-pill-quick', '--ease-move'];

/**
 * Every Motion duration in the owner's design (tokens.css), as custom properties: what ?slowmo
 * slows. A unit check holds it to tokens.css.
 */
export const MOTION_DURATIONS: readonly string[] = [
  '--transition-duration-instant',
  '--transition-duration-quick',
  '--transition-duration-base',
  '--transition-duration-gentle',
  '--transition-duration-sheet',
  '--transition-duration-turn',
  '--transition-duration-slow',
  '--transition-duration-pill',
  '--transition-duration-pill-quick',
];
