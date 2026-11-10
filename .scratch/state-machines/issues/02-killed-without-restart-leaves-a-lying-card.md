# 02: A kill with no restart (MIUI) leaves a card that says Recording

Status: ready-for-agent
Type: task
Blocked by: none

Impact: high on the owner's POCO X3 GT and every phone whose maker kills apps (MIUI, ColorOS, Funtouch, XOS). The ride has stopped; the card still says **Recording** and its buttons do nothing, until Para is opened.

## Evidence

- Owner's phone test in #841.
- `RideNotification.pageGone` is the only code that clears a recording RideState with no service, and it runs from `onDestroy`, which a kill skips.
- `RideNotification.post` uses `notify()`, which outlives the process.

## What to build

The card must not outlive the recording. Proposed: post the recording card with `setTimeoutAfter` a little past the next tick (the service re-posts it every tick, so a live ride never times out; a dead one's card goes within about 2 minutes). Whether the card should instead turn into "Ride stopped, open Para to carry on" needs a process to post it, which a MIUI kill does not leave: so the honest answer on those phones is the card going, plus the page's `unfinished` on opening. Owner to confirm the behaviour (question batched to the hub).

## Acceptance checks

- Emulator: `am force-stop` mid-ride (no restart, as MIUI): no **Recording** card 3 minutes later; a diagnostics line on the next opening ("ride found cut off").
- The existing swipe-and-kill check still passes (the sticky restart keeps the card).
