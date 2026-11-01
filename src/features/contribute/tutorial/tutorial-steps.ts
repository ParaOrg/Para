/**
 * What the tutorial shows under a step: Record as it is (null), or a demo recording, running or
 * paused, with nothing recorded and no location asked for.
 */
export type TutorialDemo = 'recording' | 'paused' | null;

/** The control a step points at, found on the page by these words (tutorial.tsx). */
export type TutorialTarget = { kind: 'start' } | { kind: 'button'; name: string };

export interface TutorialStep {
  title: string;
  body: string;
  demo: TutorialDemo;
  target: TutorialTarget;
}

/** The tutorial's seven steps, as Figma's Tutorial frames have them (4530:3552). */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: 'Start tracking',
    body: 'Tap here when you start your trip. Para keeps recording even with your screen off.',
    demo: null,
    target: { kind: 'start' },
  },
  {
    title: 'Lakad or Sakay',
    body: 'You start on Lakad (walking). Tap Sakay when you board a jeep or bus, and Lakad again when you get off.',
    demo: 'recording',
    target: { kind: 'button', name: 'Switch to Sakay' },
  },
  {
    title: 'Flag a stop',
    body: 'Tap the flag where the vehicle stops to pick up or drop off passengers.',
    demo: 'recording',
    target: { kind: 'button', name: 'Flag a stop' },
  },
  {
    title: 'Pause anytime',
    body: "Taking a break? Pause, then Resume when you're moving again.",
    demo: 'recording',
    target: { kind: 'button', name: 'Pause' },
  },
  {
    title: 'See more of the map',
    body: 'Fold the card down to see your route. Tap the arrow to bring it back.',
    demo: 'recording',
    target: { kind: 'button', name: 'Hide the recording card' },
  },
  {
    title: 'Stop without saving',
    body: 'Changed your mind? Tap ✕ to stop. Para asks first, so nothing is lost by accident.',
    demo: 'recording',
    target: { kind: 'button', name: 'Discard recording' },
  },
  {
    title: 'Finish and save',
    body: 'Arrived? Pause, then Finish, and add your start and end points so we can map your route.',
    demo: 'paused',
    target: { kind: 'button', name: 'Finish' },
  },
];
