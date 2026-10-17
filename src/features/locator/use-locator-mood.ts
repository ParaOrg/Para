import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ANGRY_FOR_MS,
  ANGRY_WITHIN_MS,
  MOOD_OF,
  faceFor,
  inATemper,
  moodAt,
  reacting,
  reactionTo,
  type Face,
  type Mood,
  type Signals,
} from './locator-mood';
import { STILL_BELOW_MPS, type Camera, type Fix } from './locator-rules';

/**
 * The dot's mood and face, from the locator: its fix, its camera, and the
 * taps on its button (`taps`, counted by useLocator). Ticks once a second
 * while there is a fix to wear a face, for the faces
 * taking turns.
 */
export function useLocatorMood({
  fix,
  camera,
  taps,
}: {
  fix: Fix | null;
  camera: Camera;
  taps: number;
}): {
  mood: Mood;
  face: Face;
  /** The last tap's time: a new one plays the reaction again, even with the face unchanged. */
  beat: number;
  /** A tap on the dot itself: the same reaction as one on the button. */
  poke: () => void;
} {
  const [now, setNow] = useState(() => Date.now());
  // Taps on the dot itself, counted with the button's.
  const [pokes, setPokes] = useState(0);
  const poke = useCallback(() => setPokes((n) => n + 1), []);
  const touches = taps + pokes;
  // What happened, and when: taps on the button, the commuter arriving, standing still since.
  const [events, setEvents] = useState<{
    taps: number[];
    count: number;
    reaction: Signals['reaction'];
    arrivedAt: number | null;
    stillSince: number | null;
  }>({ taps: [], count: 0, reaction: null, arrivedAt: null, stillSince: null });
  const seen = useRef({ taps: touches, hadFix: !!fix, camera });

  // Read as they change, not on the tick: each is an event with a time.
  useEffect(() => {
    const t = Date.now();
    const was = seen.current;
    seen.current = { taps: touches, hadFix: !!fix, camera };
    // Taps quicker than a render come in one batch: each counts, or three
    // quick ones on a slow phone could read as two and never make it cross.
    const tapped = Math.max(0, touches - was.taps);
    // Rolled here, with the tap, not while rendering: the reaction is the tap's.
    const roll = Math.random();
    setEvents((e) => ({
      taps: tapped
        ? [
            ...e.taps.filter((x) => t - x < ANGRY_WITHIN_MS + ANGRY_FOR_MS),
            ...Array<number>(tapped).fill(t),
          ]
        : e.taps,
      count: e.count + tapped,
      reaction: tapped ? { at: t, mood: reactionTo(e.count + tapped, roll) } : e.reaction,
      arrivedAt:
        (fix && !was.hadFix) || (fix && camera !== 'free' && was.camera === 'free')
          ? t
          : e.arrivedAt,
      stillSince: !fix || fix.speed >= STILL_BELOW_MPS ? null : (e.stillSince ?? t),
    }));
    setNow(t);
  }, [touches, fix, camera]);

  useEffect(() => {
    if (!fix) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [fix]);

  const signals: Signals = {
    now,
    fix,
    arrivedAt: events.arrivedAt,
    taps: events.taps,
    reaction: events.reaction,
  };
  const tapped = reacting(signals) && !inATemper(signals);
  const face = faceFor(
    moodAt(signals),
    now,
    events.stillSince === null ? 0 : now - events.stillSince,
    tapped,
    events.count,
  );
  return {
    // The mood the face shows: a neutral dot's swings included.
    mood: MOOD_OF[face],
    face,
    beat: events.reaction?.at ?? 0,
    poke,
  };
}
