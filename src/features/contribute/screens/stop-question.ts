import type { Phase } from '../recorder/recording-state';

/** What the recording was doing when ✕ asked, so Keep recording puts it back; null when nothing is asked. */
export type StopAskedWhile = 'recording' | 'paused' | null;

/**
 * ✕'s question as it stands in this phase. It belongs to the recording screen, so it is dropped
 * the moment the page leaves it: in the app a Finish still reading the native log swallows the
 * pause ✕ asked for and lands on the form, and a question kept past that would come back unasked
 * at the next pause.
 */
export function stopQuestionIn(phase: Phase, askedWhile: StopAskedWhile): StopAskedWhile {
  return phase === 'recording' || phase === 'paused' ? askedWhile : null;
}

/**
 * Whether the question shows: once the pause it asked for has landed. In the app the pause reads
 * the native log first, and a Keep recording before then would be undone by the pause after it.
 */
export function isStopQuestionShown(phase: Phase, askedWhile: StopAskedWhile): boolean {
  return phase === 'paused' && askedWhile !== null;
}
