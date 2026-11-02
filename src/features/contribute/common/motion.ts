import { durationToken, type Motion, type MotionDuration } from '@/shared/utils/motion';

/*
 * The contributor page's motions, named by what moves, in the owner's tokens (tokens.css), played
 * with motionOf (shared/utils/motion.ts). Here, not in shared/utils, so the public map does not
 * carry them.
 */
/** Something arriving: a screen sliding in. */
export const ARRIVE: Motion = ['base', 'enter'];
/** Something on the screen changing place or shape: a pill opening into a card. */
export const MOVE: Motion = ['gentle', 'move'];
/** Something leaving, quickly: a button folding away. */
export const LEAVE: Motion = ['quick', 'exit'];
/** A quick change of place: a pill caught up under a finger. */
export const SHIFT: Motion = ['quick', 'move'];
/** A pill gliding to its place on a soft spring. */
export const PILL: Motion = ['pill', 'pill'];
/** The same spring, quicker: a pill turning to the newest of a run of taps. */
export const PILL_QUICK: Motion = ['pill-quick', 'pill'];
/** A colour changing in a pill's time, without its spring: a colour has nothing to overshoot. */
export const PILL_FADE: Motion = ['pill', 'move'];
/** The same, in the quicker pill's time. */
export const PILL_QUICK_FADE: Motion = ['pill-quick', 'move'];

/**
 * Every Motion duration in the owner's design (tokens.css), as custom properties: what ?slowmo
 * slows. A unit check holds it to tokens.css.
 */
export const MOTION_DURATIONS: readonly string[] = (
  [
    'instant',
    'quick',
    'base',
    'gentle',
    'sheet',
    'turn',
    'slow',
    'pill',
    'pill-quick',
  ] satisfies MotionDuration[]
).map(durationToken);
