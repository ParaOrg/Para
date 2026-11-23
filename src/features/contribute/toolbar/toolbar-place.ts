/** The toolbar's height, kept free at the foot of each tab's screen for the page's toolbar. */
export const TOOLBAR_ROOM = 'h-14 shrink-0';

/**
 * How far the toolbar stands over the screen's edge, on Record, History and Account alike: 48, as
 * Figma's 852-high frames draw it (4520:3197, 4518:24819), and as much as a phone's gesture bar
 * when that is more. The screens' feet under it are this too, so it sits where they leave room.
 */
export const TOOLBAR_FOOT = 'pb-[max(3rem,env(safe-area-inset-bottom))]';

/**
 * Where the page stands its one toolbar (contribute-page.tsx): over the foot of Record, History
 * and Account alike (TOOLBAR_FOOT); lifted over the earlier-recordings question where Record shows
 * it (`--toolbar-lift`). Over the tab screens, under the sheets and dialogs over them.
 */
export const TOOLBAR_PLACE =
  'pointer-events-none absolute inset-x-0 bottom-[var(--toolbar-lift,0px)] z-25 px-4 *:pointer-events-auto ' +
  TOOLBAR_FOOT;
