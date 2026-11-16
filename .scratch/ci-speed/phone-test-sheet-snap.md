# phone-test taps rows a person could not reach at the sheet's Low

Status: open. Planned as its own piece of the CI-speed work, after the owner answers which snap these checks run at.
Starting point: branch `claude/phone-taps-in-view`, no PR. `fingerOn` and a `buttonTap`/`touchTap` that fail instead of clicking by hand.

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
