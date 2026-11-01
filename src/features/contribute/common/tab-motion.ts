import './tab-motion.css';

/**
 * Where each screen sits in the toolbar's order, by its hash: Record (no hash), History, Account,
 * and Account settings inside Account. Moving to a higher one goes right, to a lower one left.
 */
const SCREEN_ORDER: Readonly<Record<string, number>> = {
  '': 0,
  '#history': 1,
  '#profile': 2,
  '#account-settings': 3,
};

/** How long a move waits for its hash to change before it is shown anyway. */
const SETTLE_MS = 150;

/**
 * How long a move waits for its new screen to be drawn (its chunk fetched, React's commit) before
 * the transition goes on without it. Fetched ahead (screen-loaders.ts), it is there at once.
 */
const DRAWN_MS = 300;

/** How long after a move a screen that mounts still counts as arriving by it. */
const MOVE_MS = 500;

export type MotionDirection = 'forward' | 'back';

/** The owner's Motion tokens a move uses (tokens.css), by what moves. */
const MOTION_TOKENS = {
  /** A screen arriving. */
  arrive: ['--transition-duration-base', '--ease-enter'],
  /** Something already on screen changing place: the toolbar's pill, the Start pill opening. */
  move: ['--transition-duration-gentle', '--ease-move'],
  /** Something on its way out, quickly: Start tracking folding into its pill. */
  leave: ['--transition-duration-quick', '--ease-exit'],
} as const;

/**
 * A move's timing, read from the same Motion tokens tab-motion.css uses, so the script's
 * fallbacks and the view transitions can never part.
 */
export function motionOf(kind: keyof typeof MOTION_TOKENS): { duration: number; easing: string } {
  const style = getComputedStyle(document.documentElement);
  const [duration, easing] = MOTION_TOKENS[kind];
  return {
    duration: Number.parseFloat(style.getPropertyValue(duration)) || 0,
    easing: style.getPropertyValue(easing).trim() || 'ease-out',
  };
}

/** How far a screen slides on its way in, as tab-motion.css has it: `--tab-motion-shift`. */
export const tabShift = (sign: 1 | -1): string =>
  `translateX(calc(${sign} * ${getComputedStyle(document.documentElement).getPropertyValue('--tab-motion-shift').trim() || '0px'}))`;

/** Whether the person asked their phone for less motion: then screens and the pill just switch. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const directionOf = (from: string, to: string): MotionDirection | null => {
  const a = SCREEN_ORDER[from];
  const b = SCREEN_ORDER[to];
  if (a === undefined || b === undefined || a === b) return null;
  return b > a ? 'forward' : 'back';
};

/*
 * Every move between the screens, however it came (a tab, a button, the browser's Back), as the
 * hash changes: heard before the screens' own stores, as this module loads before them.
 */
let shownHash = window.location.hash;
let lastMove: { direction: MotionDirection; at: number } | null = null;
window.addEventListener('hashchange', () => {
  const direction = directionOf(shownHash, window.location.hash);
  shownHash = window.location.hash;
  lastMove = direction ? { direction, at: performance.now() } : null;
  // The view transition's slides read it (tab-motion.css).
  if (direction) document.documentElement.dataset.tabMotion = direction;
  else delete document.documentElement.dataset.tabMotion;
});

/** True while a view transition is drawing its new state: what mounts now, it shows moving. */
let isCapturing = false;

/**
 * The way a toolbar screen mounting now should come in, or null when it should just appear: no
 * move just now, less motion asked for, or a view transition already showing it come in.
 */
export function screenEntryDirection(): MotionDirection | null {
  if (!lastMove || isCapturing || prefersReducedMotion()) return null;
  return performance.now() - lastMove.at < MOVE_MS ? lastMove.direction : null;
}

/**
 * Whether the screen for `hash` is on the page: its own `[data-screen-hash]` (History, Account,
 * Account settings) in sight, or for Record none of them over the map. A screen the page cannot open now
 * (its `[data-screens]`) never draws: nothing to wait for.
 */
function isDrawn(hash: string): boolean {
  // A screen kept but hidden (contribute-page.tsx) is not drawn.
  const screens = [...document.querySelectorAll('[data-screen-hash]')].filter((screen) =>
    screen.checkVisibility(),
  );
  if (SCREEN_ORDER[hash] === undefined) return true;
  const openable = document.querySelector('[data-screens]')?.getAttribute('data-screens');
  if (
    hash !== '' &&
    openable !== null &&
    openable !== undefined &&
    !openable.split(' ').includes(hash)
  )
    return true;
  if (hash === '') return screens.length === 0;
  return screens.some((screen) => screen.getAttribute('data-screen-hash') === hash);
}

/**
 * Settles once the hash has changed and React has drawn the screen for it, so the view transition
 * shows the real screen, never a blank one; or after SETTLE_MS with no change, or DRAWN_MS with the
 * screen still on its way.
 */
function hashSettled(): Promise<void> {
  return new Promise((resolve) => {
    let observer: MutationObserver | null = null;
    let drawnTimer = 0;
    const finish = () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.clearTimeout(changeTimer);
      window.clearTimeout(drawnTimer);
      observer?.disconnect();
      resolve();
    };
    const checkDrawn = () => {
      if (isDrawn(window.location.hash)) finish();
    };
    function handleHashChange() {
      window.removeEventListener('hashchange', handleHashChange);
      window.clearTimeout(changeTimer);
      drawnTimer = window.setTimeout(finish, DRAWN_MS);
      // React draws the screen in a task after the change, or shows one it kept: watched for,
      // not guessed.
      observer = new MutationObserver(checkDrawn);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'hidden'],
      });
      window.setTimeout(checkDrawn, 0);
    }
    const changeTimer = window.setTimeout(finish, SETTLE_MS);
    window.addEventListener('hashchange', handleHashChange);
  });
}

let running: ViewTransition | null = null;

/**
 * A run of taps starts with one that comes while a move is under way. How soon after a tap of
 * the run the next still belongs to it: the length of a move (the gentle Motion token, 300) and a
 * little over. A tap once a move has ended, outside a run, slides as ever.
 */
const RUN_MS = 400;
let lastRunAt = Number.NEGATIVE_INFINITY;

/*
 * While a view transition runs, the browser hit-tests its picture of the page, not the page: a
 * tap on the toolbar lands on the document, whatever `::view-transition { pointer-events: none }`
 * says, and is lost. The toolbar stands still through every move, so the tab under the tap is
 * the one the person sees there: the tap is handed to it, and its move skips this one's end.
 */
document.addEventListener(
  'click',
  (event) => {
    if (!running || event.target !== document.documentElement) return;
    const tab = [...document.querySelectorAll<HTMLElement>('[data-tab]')].find((candidate) => {
      const box = candidate.getBoundingClientRect();
      return (
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom
      );
    });
    if (!tab) return;
    event.stopPropagation();
    tab.click();
  },
  { capture: true },
);

/**
 * Moves between the toolbar's screens with `change`, which changes the URL's hash, when
 * `willChange` says it would. Where the browser can, the move is a view transition: the screen over the map slides
 * the way the tabs run, a short way, and fades, while the map stays put (tab-motion.css). A move during
 * another skips the first to its end, so a second tap always lands where it points. Nothing waits
 * on it: focus and input go to the new screen as it is drawn.
 */
export function moveBetweenScreens(willChange: () => boolean, change: () => void): void {
  // Taps faster than the moves: the one under way ends at once, and this one just shows, as a
  // phone's own tab bar does, and so does every tap of the run that follows it. A slide costs two
  // pictures of the page before it moves; in a run of taps, the screen comes first.
  const now = performance.now();
  const isInRun = running !== null || now - lastRunAt < RUN_MS;
  if (isInRun) lastRunAt = now;
  running?.skipTransition();
  // No slide left over from the last move; this one's way is set as its hash changes.
  delete document.documentElement.dataset.tabMotion;
  // Nothing to move to (the screen already showing, a second tap): nothing to show.
  if (!willChange()) return;
  if (isInRun || !('startViewTransition' in document) || prefersReducedMotion()) {
    change();
    return;
  }
  const transition = document.startViewTransition(async () => {
    // Listened for from before the change: replacing the URL tells the screens at once.
    const settled = hashSettled();
    isCapturing = true;
    try {
      change();
      await settled;
    } finally {
      isCapturing = false;
    }
  });
  running = transition;
  // A move skipped by the next one rejects its `ready` with AbortError: that is the skip itself.
  transition.ready.catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    console.warn(
      'The move between screens could not be shown; the screen changed all the same.',
      error,
    );
  });
  void transition.finished.finally(() => {
    if (running === transition) running = null;
  });
}
