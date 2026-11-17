# phone-test taps rows a person could not reach at the sheet's Low

Status: done in the change that tapped where a person would (branch `claude/phone-test-sheet-snaps`). One question remains for the owner, at the end.

## What was found (2026-11-16)

phone-test reports "N tap(s) needed the click sent by hand: the runner dropped the touch": 78 in CI, 76 locally. So it is not the runner. A probe logged, for every one of them, the DOM events the page saw, their target, and `document.elementFromPoint` at the tap's point:

| Count | What happened |
| --- | --- |
| 62 | The touch was not dropped: pointerdown, touchstart, pointerup and touchend all fired, on `<html>`. The point was below the 844 px viewport (y 847–1,284). Nothing was under it. |
| 12 | The full sequence fired, on another element over the target: the dock handle (9), a chooser origin (2), a card box (1). |
| 1 | A map tap landed on a chooser row covering the map. |
| 1 | A real drop: touchstart and touchend on the map, no pointer events, right after the previous tap at the same point. |

The by-hand fallback (`locator.dispatchEvent('click')`) clicks the element wherever it is, so every check after it passed. Each one also cost a 1.5 s wait first: about 2.5–3 min of each phone-test run.

## Why the 62 are off the screen

Measured at each such tap: the card's sheet is at snap **Low**. Its top is at y = 711 of 844, so 133 px show. The sheet is 844 px tall (it reaches y = 1,555) and has no scroll container: it is translated down, not scrolled. "View more" (`trip-view-more`) sits at y ≈ 1,076–1,104 and a hintuan's pick (`trip-hintuan-pick`) at y ≈ 1,106–1,150. `scrollIntoViewIfNeeded` cannot bring them up.

A person at Low sees the sheet's top only and drags the handle up before tapping those rows. That is the bottom sheet working as designed, not an app defect. The test taps where the rows would be, which no person can.

## What the fix needs

Raise the sheet as a person does (drag the handle) before a tap on a row below the screen, and read each check at the snap a person would then be at. About 59 `buttonTap`/`touchTap` call sites, in sections 1b–5c (`tripChecks`, the chooser, the sheet sections).

Checks whose expected values depend on the sheet's height, and so may change when the sheet is raised first (from their labels):

- the camera gliding a pick "into the map above the card"; "a hintuan in view above the card: the camera stays"; "off the screen, it slides into view above the card at the same zoom"
- "the end picked after a start: the sheet stays where it is, the ride taken in above it"; "another end picked with the sheet raised"
- "picked at full height, the card stays there, the hintuan above the framed height"
- "the map gliding there above the card" (where the trip goes, picked in the hintuan's place)
- "a trip opened from the list at full height opens at full height too"; "‹ brings the list back at full height"; "another box from its row: Selected, the card staying at full height"
- "at Low, a tap on a card raises the list a third and picks nothing"; "a hotspot's card opens at Low"
- "the sheet at full height, then Low: the route taken in again"; "the sheet up to full height: no further out than 5 km"; "at Low: in closer, the whole route above the sheet"; "at full height, the sheet stays there"
- the map's ⓘ "12 over its sheet" and "still in the strip of map above it" at full height

Rules for the work: no forced clicks, no longer timeouts, no retries. A covered target waits for the actual layout state (an element stable, the sheet at rest). If any case turns out to be the app covering a button where a person would hit it too, stop and report before changing app code.

## Open question (the owner)

Should each check run at the snap a person would actually be at, raising the sheet by its handle first? The hub's recommendation is yes.

## The sheet handle's by-hand gestures: Chromium's emulated touch, not the app

phone-test also sends gestures on the sheet's handle "by hand": 30 in one CI run, 2 in the next, none locally. Two probe runs on the runner (draft #1012, closed) logged every pointer and touch event with its pointerId and buttons, and wrapped the app's `setPointerCapture`, `releasePointerCapture` and `preventDefault`.

- A healthy tap on the handle, many times over: pointerdown, touchstart, gotpointercapture, pointerup, lostpointercapture, touchend, click, all within about 10 ms.
- A failing tap, seconds later, on the same handle at the same snap with nothing animating: touchstart, gotpointercapture, lostpointercapture, touchend. No pointerdown, no pointerup, no click. Each failing tap has a fresh pointerId, so no pointer is stuck down.
- In the whole logged window the app called neither `setPointerCapture` nor `releasePointerCapture`, and never prevented a touch or pointer start or end. The `gotpointercapture` is Chromium's implicit capture of a touch pointer.

So Chromium, driven by the harness's emulated touch (CDP) on a slow runner, sometimes makes a touch pointer and gives the page none of its pointer events. Nothing points to real phones. The by-hand ladder in `tapHandle`, `dragHandle` and `mouseDrag` works around that, not a fault of the runner "making no pointer events" in general, as its comment says.

Options, with the sheet-snap rework:

- (a) Drive the handle with CDP mouse drags (`Input.dispatchMouseEvent`) where a check is not about touch itself.
- (b) Keep touch, and on a missing pointerdown fail and name it instead of resending, to see how red it gets.
- (c) For now: leave the ladder, and correct its comment to say what it works around, as part of this rework.

## phone-test runs in three parts (PHONE_PART)

The rework starts from this layout: `PHONE_PART=k/3` gates the sections, split by measured time.

| Part | Sections | Why together |
| --- | --- | --- |
| 1 | 2, 5, 6 | 5 and 6 read section 2's `routeA` |
| 2 | 5b, 5c, 5d, 6b, 6c | 6b and 6c run on the made-up map 5d leaves the page on |
| 3 | 1a, 1b, 3, 4, 4c, 4d | 4c and 4d read section 4's `hotspot` |

Section 1, the page's setup (the data, the page helpers, the ground-scale measurement after 1b, and 1b's closing page reload) and section 7 run in every part. The hintuan pick runs where a full run runs it: on section 2's first trip with a hintuan (part 1) and again on the made-up map (5d, part 2). Unset, one part runs it all. The sheet sections, 4c and 4d, are both in part 3.

## What was done (2026-11-17)

A logging copy of staging's phone-test, run in all three parts, counted 75 taps sent by hand: 36, 34
and 5. Each was logged with its section, its target, the point tapped, what was under it, and the
sheets' heights. Every one was the test's doing:

- 62 rows below the screen: View more, hintuan picks, Set/Remove as start and the destination row,
  in the trip card at Low and raised a third, and 1 in a trip opened from the list. Now the sheet
  is pulled to full by its handle first, when a stop the test taps is below the screen.
- 9 handle taps on a sheet still sliding. Now `fingerOn` waits for a box that holds still over two
  frames. `handleTo` also waits for the sheet's top to move, not only its data-snap: a step from
  one height between to another keeps `free`, and read as nothing happening.
- The list's handle, a 1×1 button at the screen's edge, twice. The route list draws no notch
  (route-card-list's `handle="hidden"`, kept for the keyboard). A person raises it by its header,
  and the test now drags the header.
- A map tap where the list covered the map. The point is now brought into the map above the list
  first.
- A box row tapped with the card at Low. At Low a tap on the top of the body raises the sheet and
  picks nothing (use-sheet-gestures.ts), and its click is swallowed (sheet-gesture.ts). The
  by-hand click got through only because the swallow skips a click with no pointer behind it. Now
  the card is raised a third by its handle first.

Six checks about a pick at Low or at the raised third now run at full height, renamed for what
they now prove, and one repeat was retired (the change's pull request lists them). A tap still
sent by hand is the one case in `.scratch/ci-speed/issues/01-chromium-touch-drop.md`.

## The owner's decision: the trip card's stops at the raised third (2026-11-17)

Raised a third, the trip card's top is near y 430 of an 844-high screen. Its stops sit at y
847–1,027, all below the screen, and at Low (the top at 711, 133 px shown) further still. The
sheet is translated, not scrolled: below full height its body does not scroll
(`touch-none overflow-hidden`).

The owner's decision (2026-11-17): keep it as it is. Pulling the sheet to full is the intended
way to reach the trip card's lower rows. phone-test's raise to full before those rows matches the
design. No app change.
