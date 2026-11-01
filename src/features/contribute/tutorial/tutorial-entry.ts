/** The key of the history entry the tutorial adds as it opens, so Back closes it. */
export const TUTORIAL_ENTRY = 'paraTutorial';

/** Whether the history entry showing is the one the tutorial added. */
export function isTutorialEntry(state: unknown): boolean {
  return typeof state === 'object' && state !== null && TUTORIAL_ENTRY in state;
}
