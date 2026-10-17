import type { Fix } from './use-locator';

/*
 * The commuter's dot has three moods, neutral, happy and angry: glad as the commuter
 * arrives or moves, a reaction to a tap, and left to itself its mood swings;
 * and neutral and happy have several faces each, so it never reads as one
 * loop. The faces are drawn in locator.css.
 */

export type Mood = 'neutral' | 'happy' | 'angry';

/** One face of a mood: what locator.css draws for `data-face`. */
export type Face =
  | 'glance'
  | 'curious'
  | 'wink'
  | 'surprised'
  | 'sleepy'
  | 'smile'
  | 'hop'
  | 'squee'
  | 'wink-smile'
  | 'glare'
  | 'boing'
  | 'huff';

/** Taps on the LocatorButton this close together, three of them, make it cross. */
const ANGRY_TAPS = 3;
export const ANGRY_WITHIN_MS = 2000;
/** …and it stays cross this long after the third. */
export const ANGRY_FOR_MS = 3000;
/**
 * A tap on the LocatorButton gets a reaction, this long: glad, a boing; now
 * and then, one tap in ANGRY_ODDS, cross, a huff. Never cross at the first tap.
 */
export const REACT_FOR_MS = 2500;
export const ANGRY_ODDS = 4;

/** How the dot takes a tap: the `count`th (from 1), with `roll` a random number in [0, 1). */
export function reactionTo(count: number, roll: number): 'happy' | 'angry' {
  return count > 1 && roll < 1 / ANGRY_ODDS ? 'angry' : 'happy';
}

/** Happy this long when the location first comes, or the camera arrives on the commuter. */
export const HAPPY_FOR_MS = 3000;
/** Happy on the move from walking pace up, in metres a second. */
const MOVING_FROM_MPS = 1;
/** Sleepy, a neutral face, after standing still this long. */
export const SLEEPY_AFTER_MS = 60_000;

/**
 * With nothing going on, the dot's mood swings: a face every AMBIENT_EVERY_MS
 * from this list, half of them neutral, nearly all the rest happy, one in forty
 * cross — for one turn only, where a run of taps holds cross as long as it
 * lasts, so that one still reads as real.
 */
const AMBIENT_EVERY_MS = 5000;
const NEUTRAL_SWINGS = [
  'glance',
  'glance',
  'glance',
  'glance',
  'glance',
  'glance',
  'curious',
  'curious',
  'wink',
  'surprised',
] as const;
const HAPPY_SWINGS = [
  'smile',
  'smile',
  'hop',
  'hop',
  'squee',
  'wink-smile',
  'wink-smile',
  'smile',
  'hop',
] as const;
const AMBIENT: readonly Face[] = [
  ...NEUTRAL_SWINGS,
  ...NEUTRAL_SWINGS,
  ...HAPPY_SWINGS,
  ...HAPPY_SWINGS,
  'glare',
];

/** The mood each face wears: what `data-mood` says, for its breathing. */
export const MOOD_OF: Record<Face, Mood> = {
  glance: 'neutral',
  curious: 'neutral',
  wink: 'neutral',
  surprised: 'neutral',
  sleepy: 'neutral',
  smile: 'happy',
  hop: 'happy',
  squee: 'happy',
  'wink-smile': 'happy',
  boing: 'happy',
  glare: 'angry',
  huff: 'angry',
};
/** Happy changes face more often: it is short-lived, or the commuter is moving. */
const HAPPY_EVERY_MS = 2500;
const HAPPY: readonly Face[] = ['smile', 'hop', 'squee', 'wink-smile'];

export interface Signals {
  now: number;
  fix: Pick<Fix, 'accuracy' | 'speed' | 'time'> | null;
  /** When the location first came, or the camera last arrived on the commuter. */
  arrivedAt: number | null;
  /** When the LocatorButton was tapped, oldest first. */
  taps: readonly number[];
  /** The last tap's reaction, and when (reactionTo). */
  reaction?: { at: number; mood: 'happy' | 'angry' } | null;
}

/** Whether a tap's reaction is showing at `now`. */
export const reacting = ({ now, reaction }: Pick<Signals, 'now' | 'reaction'>): boolean =>
  !!reaction && now >= reaction.at && now - reaction.at < REACT_FOR_MS;

/** Whether a run of ANGRY_TAPS quick taps has the dot cross at `now`. */
export function inATemper({ now, taps }: Pick<Signals, 'now' | 'taps'>): boolean {
  for (let i = ANGRY_TAPS - 1; i < taps.length; i++) {
    const third = taps[i];
    if (
      third - taps[i - ANGRY_TAPS + 1] <= ANGRY_WITHIN_MS &&
      now - third < ANGRY_FOR_MS &&
      now >= third
    )
      return true;
  }
  return false;
}

/**
 * The mood for these signals, the strongest first: cross at a run of taps,
 * then a tap's own reaction, then glad as the commuter arrives, then glad on
 * the move. There is no low mood for the location itself: an old fix (a
 * browser sends none while the commuter stands still) or a rough one (common
 * indoors) is no reason for the dot to look unhappy.
 */
export function moodAt(s: Signals): Mood {
  const { now, fix, arrivedAt } = s;
  if (inATemper(s)) return 'angry';
  if (s.reaction && reacting(s)) return s.reaction.mood;
  if (arrivedAt !== null && now >= arrivedAt && now - arrivedAt < HAPPY_FOR_MS) return 'happy';
  if (fix && fix.speed >= MOVING_FROM_MPS) return 'happy';
  return 'neutral';
}

/** A small, steady hash: the same slot always shows the same face, slots differ unpredictably. */
function pick<T>(list: readonly T[], slot: number): T {
  const h = Math.imul(slot ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return list[((h ^ (h >>> 13)) >>> 0) % list.length];
}

/**
 * The face for a mood at `now`. Neutral is the dot left to itself: its mood
 * swings (AMBIENT), and it dozes after `stillFor` ms standing still.
 * `tapped`: the mood is a tap's reaction — a boing, or a huff. `taps`: how
 * many times it has been tapped; each tap rolls its swings afresh, so after
 * the reaction it comes back in another mood.
 */
export function faceFor(mood: Mood, now: number, stillFor: number, tapped = false, taps = 0): Face {
  if (tapped && mood === 'happy') return 'boing';
  if (tapped && mood === 'angry') return 'huff';
  switch (mood) {
    case 'angry':
      return 'glare';
    case 'happy':
      return pick(HAPPY, Math.floor(now / HAPPY_EVERY_MS));
    case 'neutral':
      return stillFor >= SLEEPY_AFTER_MS
        ? 'sleepy'
        : pick(AMBIENT, Math.floor(now / AMBIENT_EVERY_MS) + taps * 7919);
  }
}
