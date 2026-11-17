# Re-check phone-test's one by-hand tap on each Chromium or Playwright update

Status: open
Type: task
Priority: low

## What it is

phone-test's `buttonTap` and `mapTap` (tests/e2e/phone-test.mjs) never click by hand for a tap that
could not reach its target: off the screen, under another element, on something still moving. Each
of those fails the suite.

One case is still sent again by hand: a tap on a target `fingerOn` verified (on the screen, the
topmost thing at its middle, its box the same over two frames) that made no pointer press at all.
The page's pointer count is unchanged, and the target is still the topmost thing there. Chromium's
emulated touch (CDP) on a slow runner sometimes gives the page only touchstart and touchend (two
probe runs on the runner, draft #1012; `.scratch/ci-speed/phone-test-sheet-snap.md`).

- Each use prints `by hand: Chromium made no pointer events from the touch on …`.
- The summary line gives the count: `(N tap(s) sent again by hand: …)`.
- More than one in a part fails it (`CHROMIUM_DROPS_ALLOWED`). The measured rate was about 1 in 76
  taps, and 0 in the runs that came with this change. More than one points at something else.

The handle's own ladder (`tapHandle`, `dragHandle`, `mouseDrag`) works around the same drop and
is counted apart (`handleByHand`).

## Seen so far (2026-11-17, local)

- At normal speed, all three parts: 0 taps sent again by hand.
- With the CPU throttled 4×, parts 1 and 2: 0. Part 3: 0, 0 and 2 in three runs.
- The two came together right after section 4c's mouse drags on the handle: map taps reopening
  the hotspot's card. In the same stretch of that run the handle's ladder sent 3 gestures by
  hand, against none in the other runs. Over two taps the ceiling failed the part, as it is meant
  to.
- This fits the note of 2026-09-29: after the mouse has been used, Chromium for a while makes no
  pointer events from emulated touches.
- If CI shows the same, the next step is to run the mouse-drag checks on a page of their own, so
  the touches after them start clean. It is not to raise the ceiling.

## The trigger, on CI (2026-11-17)

Playwright 1.65.0, Chromium 153.0.8010.12, on GitHub's runner. Two probe runs of part 3 on draft
#1051, which logged every CDP command the suite and Playwright sent:

- Probe 2 (closeCard's Escape sent as a key, as the suite did then): 5 map taps and 31 handle
  gestures sent by hand. The first drop was the first touch after the first key press to come
  after touches: 25 good touches, Escape, then a touch the page never saw, not even a touchstart.
  Nothing else was sent between them: no Emulation, Page, Target or Overlay command. The touch
  environment (maxTouchPoints 1, coarse, no hover) was the same before and after. No touch or
  mouse sequence was left open.
- Probe B (the same Escape dispatched on the page's document, so no key reached the browser): 2
  map taps and 3 handle gestures by hand. The first drop moved about three minutes later. It came
  right after the second of 4c's mouse drags on the handle (Playwright's drag interception on),
  with no key at all.
- Neither kind of input stops touches every time. The page's six key presses and four clicks
  before any touch, the first mouse click in section 3 and 4c's first mouse drag were each
  followed by good touches. Once touches were dropped, most later ones were too.

So the trigger is another kind of input after touches, a key or a mouse drag, each raising the
chance. Why Chromium then drops the touches is below what CDP shows.

## What the suite does about it

Sections 4 to 4d run on a new phone touched by finger alone (`newPhone`, `isTouchOnly`). There,
closeCard taps ✕ by finger, never a mouse click or Escape, and dragHandle has no mouse fallback.
4c's two mouse-drag checks moved to 4e, on another new phone of their own. 4f, on a third, checks
the keyboard's close of a hotspot's card: Escape takes it away and focus goes back where it was
(before, Escape there was only closeCard's silent fallback, never checked). A person rarely
switches between finger, mouse and keys mid-task, so each phone tests one honest way of using
the map. The keyboard checks elsewhere stay as they are. The ceiling stays at 1 a part. If the
touch-only phone still drops touches on CI, that is a new finding: report it, don't raise the
ceiling.

## What to do

On each update of Chromium or Playwright (package.json's `playwright`, the runner image):

1. Read the "sent again by hand" counts in the phone-test parts of the update's CI run and of the
   next few staging runs.
2. If they stay at 0, remove the by-hand branch from `buttonTap` and `mapTap`, along with
   `CHROMIUM_DROPS_ALLOWED` and its check, so a dropped touch fails like any other miss.
3. If they do not, note the count and the Chromium version here.
4. Re-check the trigger on the new versions with a probe like #1051's (every CDP command logged)
   before taking the phones apart again.
