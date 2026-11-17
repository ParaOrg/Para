# 14: Re-request location when the 2-minute fix check fires

Status: ready-for-agent
Type: task, a robustness fix with no visible change
Who: an agent, after app-v0.4.0 is out
Source: the emulator-notification failure on #912's merge head (d6e02e87), run 43108343937, job 130817463108

## What happens today

`RideService` asks Google Play services' fused location provider for fixes once, in
`onStartCommand` (`requestLocationUpdates`). Nothing asks again while the service lives.

The fused provider keeps that request inside Play services' own process
(`com.google.android.gms.persistent`). If that process dies, the request dies with it. GPS
stops, and our service stays in the foreground reading "Recording" while no fixes come. It
records again only when the service itself restarts: Android killing our process
(START_STICKY), or the contributor's Pause and Resume.

The fix check (`RideMachine.check`, every 30 s) notices after two minutes (`FIX_LIMIT_MS`).
It says so, with "No location for two minutes." on the card and a diagnostics line, but it
only reports. It does not try to recover.

## The evidence

The job's logcat, from the swipe-away step of `scripts/apk/emulator-notification.sh`:

- 22:22:14: `com.google.android.gms.persistent` stops responding (an ANR in its
  GeoTimeZoneService) on an overloaded emulator, with CPU pressure at about 90%.
- 22:22:21: the test's `am clear-recent-apps`. This is not the cause: the ANR started
  before it.
- 22:22:23.5: Android kills gms.persistent ("bg anr"). The log then shows "Scheduling restart
  of crashed service …FusedLocationService".
- 22:22:25.005: the GNSS HAL stops (`GnssHwConn:workerThread:119`). The emulator kept
  feeding fixes, but no app's request was left to want them.
- 22:22:25 to 22:23:01: the restarted Play services can't serve location ("NullBinder …
  GoogleLocationManagerService … Service without Chimera impl"). It dies again and restarts
  healthy at 22:23:01.
- 22:22:57: the test's `kill -9`. The service restarts sticky and requests again. GPS starts
  at 22:23:14 and fixes resume.

`RideService` (pid 5276) was alive and in the foreground throughout. The test saw "swiped
away, the ride stopped recording: 14 then 14" because of the gap. On a phone the same gap
would last until the contributor noticed and paused.

A real phone's Play services crashes far less often than this emulator's, but it does crash,
and updates restart it too. A ride can be an hour long.

## What to build

When the fix check moves the ride to `TROUBLE_NO_FIX` (the effect `DIAGNOSE` in
`RideService.check`), `RideService` asks for location again:
`removeLocationUpdates(callback)`, then `requestLocationUpdates` with the same request.
`onStartCommand` already does this, so move that block into one private method that both
call.

- Re-request only while the ride is recording live. Pause, Finish and a refused permission
  stop the service as today.
- Handle a `SecurityException` as `onStartCommand` does (`failed(...)`).
- Add a diagnostics line, e.g. "asked for location again after no fix".
- No change to the card, the page or the ride's states. The existing "No location for two
  minutes." still shows, and the first new fix clears the trouble as today.

## Open question for the builder

`RideMachine.check` moves to `TROUBLE_NO_FIX` once and then holds there. If Play services is
still broken at that moment (as it was here for 36 s), one re-request may fail. Choose one of
these and say which:

1. Re-request on each check (every 30 s) while the trouble is `TROUBLE_NO_FIX`.
   Recommended: it costs one binder call every 30 s, and only in trouble.
2. Re-request once, on the transition only.

## How to prove it

- A unit check, if the decision lives in `RideMachine`: a new `Effect` (e.g.
  `REQUEST_LOCATION`) comes out of `check` when the ride is in no-fix trouble, and never
  when it is paused or finished.
- On the emulator: while recording, `adb shell am force-stop com.google.android.gms` (or
  kill `com.google.android.gms.persistent`), wait past two minutes, and see fixes resume
  without restarting our process. Add this as a step in
  `scripts/apk/emulator-notification.sh` only if it runs reliably in CI.

## Not in scope

- Changing the swipe-away step or its 30 s wait. That step was right to fail on a real gap.
- Moving off the fused provider to `LocationManager`'s GPS provider.
