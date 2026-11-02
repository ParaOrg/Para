/*
 * The data-* attributes one file of the contributor page writes and another finds the element by.
 * JSX writes them by spreading `{ [NAME]: value }`, so the name is written once, here. The
 * headless suites (tests/e2e) find some by their literal names too: a rename goes there as well.
 */

/** The hashes of the screens the page can open now, space-separated (contribute-page.tsx). */
export const OPENABLE_SCREENS_ATTR = 'data-screens';

/** The hash of the screen a section is (screen-routes.ts): what a move waits to see drawn. */
export const SCREEN_HASH_ATTR = 'data-screen-hash';

/** The toolbar tab a tab is (bottom-toolbar.tsx), its ToolbarTab as its value. */
export const TOOLBAR_TAB_ATTR = 'data-tab';

/** The attribute Start tracking carries (start-bar.tsx): where the morph begins. */
export const START_BUTTON_ATTR = 'data-start-tracking';

/** The attribute the recording card's place carries (recording-screen.tsx), its phase as its value: where the morph ends. */
export const RECORDING_CARD_ATTR = 'data-recording-card';
