# Recorder lifecycle audit (Q80): brief for the session that takes it

The owner approved Q80 for after release 0.4.0. This brief is from the session that fixed check 6 ("swipe-away") for that release. It covers what we found, what the emulator can and cannot show, where the tests are, and what we suspect but did not prove. The deliverable is `docs/architecture/state-machines.md` (contributor section). Q78 (brand-aware Keep Para recording) is a separate job. This session will hand it over too, because its context is long.

## The two halves of a ride

A ride in the app is held in two places, and most bugs live in the gap between them.

- **The page** (WebView, React). Its phase is `loading | ready | unfinished | recording | paused | form` (`src/features/contribute/recorder/recording-state.ts`). The ride and its fixes are in IndexedDB (`storage/recording-store.ts`).
- **The native side** (Android, `android/app/src/main/java/ph/para/contributor/`):
  - `RideService` is a started foreground service of type location, with `stopWithTask=false` and `START_STICKY`. It writes every fix to `FixLog` (`files/fixlog.ndjson`).
  - `RideState` is the ride as the notification knows it (SharedPreferences): phase `none | recording | paused | finished`, plus the mode, the times and the notification taps waiting for the page.
  - `RideNotification` posts the card.
  - `RideActionReceiver` handles the card's taps while the page is gone.
  - `RidePlugin` is the bridge: `setState`, `startRecording`/`stopRecording`, `events`/`dropEvents`, `recordingNow`.

The page imports the FixLog on opening (`recorder-opening.ts`, `native/import-fix-log.ts`). While a ride is recording it also reads the FixLog through the watch's catch-up (`native/fix-catch-up.ts`). Taps made on the card while the page was gone are applied on opening (`native/apply-ride-taps.ts`) and while it is awake (`recorder/use-ride-notice.ts`).

## What we found (all merged or in 0.4.0)

1. **#809, catch-up gap.**
   - A live fix that came before the watch's first log read was handed on first. The read then started after it.
   - Every reopen lost the fixes between the opening import and the watch's start.
   - Fix: a live fix waits for the first read.
2. **#825, reopen as cut off.**
   - A ride still `recording` in IndexedDB always opened as `unfinished`, which is right on the web, where nothing records without the page.
   - In the app, the service may still be recording. The page now asks `RidePlugin.recordingNow()` (service running and RideState RECORDING) and opens `recording`.
3. **#841, MIUI kills the process on a swipe from Recents.**
   - On stock Android, the sticky service restarts within about 1 s and records alone. The emulator check now proves this: swipe, `kill -9`, then 60 s with no page.
   - On the owner's POCO X3 GT (MIUI, Autostart on), nothing restarts. The ride stops. The notification posted with `notify()` outlives the process, and its buttons do nothing.
   - The answer is guidance, not code: Keep Para recording names Autostart and Battery saver → No restrictions, and Android's ignore-battery-optimisations dialog shows at the first Start (#844).
   - Whether No restrictions (and locking Para in Recents) is enough on MIUI is the owner's Q75 retest. Read its result before building on this.
4. **#845, the loading page ended a live ride.**
   - While `loading`, `useRideNotice` told the card "no ride". `RidePlugin.setState` wrote NONE over a ride the service was recording, so `recordingNow()` said no. This was a second cause of the reopen-as-cut-off bug, on any phone.
   - Fix: nothing is told while loading (`recorder/notice-phase.ts`).
   - Second half: a service left running for a ride no longer recording kept its foreground notification, which `NotificationManager.cancel()` cannot remove, so the card stayed stale. `setState` now stops the service for any phase but recording.
   - The reviewer then found that `noteRideWatch` re-sent a stale "none" right after a Start. That could have stopped the new ride, so it now re-sends only while recording.

Also in 0.4.0, though not lifecycle: #842 (the app reads the published map from www.para-commute.org; its build has no `/data/`), and #799 (`JSArray.from(String)` returned null, so no notification tap was ever applied).

## What the emulator can and cannot show

The checks are in `.github/workflows/contributor-app.yml`, with jobs `emulator-ride` and `emulator-notification`. The scripts are in `scripts/apk/`.

- **The page is a driver.** The emulator APK is built with `VITE_EMULATOR_RIDE=1`. Its page runs `native/emulator-ride.ts`, which takes fixes the way the recorder does but holds the notification itself. `ride-notice-bridge.ts` therefore does nothing in that build. **The page's notification path (`useRideNotice`, `setState` from the page) is not exercised on the emulator.** #845's bugs could not have shown there.
- **Kill with the task still in Recents.** `kill -9` with the app's task still in Recents makes Android relaunch the activity. The page comes back and restarts recording, which hides whether the service recovers alone. To test the service alone, remove the task first (`am clear-recent-apps`, with a swipe fallback; see `emulator-notification.sh`).
- **No OEM killers.** Stock Android restarts sticky services. MIUI, ColorOS, Funtouch and others don't, or not reliably. No emulator image has them, so OEM behaviour is a phone test or a mock.
- **No real phone conditions.** GPS comes from `adb emu geo fix` once a second. Doze, airplane mode and the location switch can be driven with `adb shell` (`cmd deviceidle force-idle`, `settings put global airplane_mode_on`, `cmd location set-location-enabled`). None of that is written yet.
- **Logcat.** The checks parse logcat (`PARA_RIDE` lines from the driver, `PARA_RIDE_TEST` marks from the scripts). Each run's artifacts hold logcat, the fixlog at kill, dumpsys and screenshots. They are the best evidence for any question.

## Where the tests live

- **Unit** (`tests/unit/`, Node test runner with the TS hook):
  - `fix-catch-up-test`;
  - `recording-transitions-test` (reopenPoint, including still-recording);
  - `ride-events-test` (taps, `noticePhaseOf`, the `noteRideWatch` guard);
  - `native-contract-test` (it reads the Java sources for every name, key and method both sides share);
  - `native-fixes-test`, `app-update-test`.
- **Emulator:** `scripts/apk/emulator-ride.sh` (rebuilds, screen off 15 min, kill, reopen, the published map read) and `scripts/apk/emulator-notification.sh` (card bars, taps, swipe, swipe-and-kill).
- **Web e2e:** `tests/e2e/contribute-test.mjs` covers the recorder on the web (no native).

## Invariants we would start with

Each one should self-heal where it can, and write a line to the local diagnostics log (ADR 0004: kept on the phone, shared only by the contributor's choice).

1. **The notification shows a ride ⇔ RideState is not NONE ⇔ IndexedDB holds an open ride.**
   - Checked on every page open and on every `setState`.
   - Heal: a card with no open ride is cancelled. Its service, if any, is stopped (#845 does the stop for `setState`). An open ride with no card gets its card back once the page is caught up.
2. **The service is running ⇔ RideState is RECORDING.**
   - Checked in `RideService.onStartCommand`, on a sticky restart, and in `setState`.
   - Heal: stop the stray service, or start the missing one only on the contributor's own tap. A location FGS cannot start from the background.
3. **While recording, a fix arrives within 2 min** (the FixLog's last time against the clock).
   - If not, log the cause the phone can tell: location off, permission, no service, Doze. Show it on the card or the page. Never fake fixes.
4. **The FixLog is the open ride's** (its first line names the recording).
   - A log for another ride is never imported (already enforced). A log left after a Save is cleared.
5. **Every tap in RideState's events is applied once** (`dropEvents` after applying). There is already a guard for the null-array bug (#799).

## Suspected, not proven

- **App update mid-ride.** Installing a new APK kills the process and the service, and a sticky restart does not happen after `MY_PACKAGE_REPLACED`. A ride may stop silently until the app is opened. Not tested.
- **Reboot mid-ride.** There is no `BOOT_COMPLETED` handling, so a ride left `recording` reopens `unfinished`. That may be right, but the card is gone and nothing says so.
- **`RideNotification.pageGone`.** When the page's plugin is destroyed and the service isn't running, it sets NONE. On a MIUI kill no `onDestroy` runs, so RideState stays RECORDING with no service. #825/#845 then open the ride `unfinished`, which is correct, but the stale card stays until the page opens.
- **Sticky restart and starting in the foreground.** On Android 14+, `startForeground` (type location) from a sticky restart in the background worked on the emulator (API 36, background location granted). With only "while using" location it may throw, and `RideService.failed()` would pause the ride. Not tested.
- **Clock change.** Fix times come from `Location.getTime()` (GPS time), while the page's own times come from `Date.now()`. A clock change mid-ride could misorder gaps and pauses. Not tested.
- **Low storage.** FixLog's write ignores `IOException`, so the fix still reaches the page live. With the page asleep it is lost silently. `failedFixWrites` covers only IndexedDB.

## Notes

- **CI download outages.** On 2026-11-08, between about 08:56 and 09:25 UTC, the Gradle distribution and the CodeQL and gitleaks downloads failed. The hub has a guardrails item to cache them.
- **No SDK in cloud sessions.** Cloud sessions here have no Android SDK. The Java compiles only in CI, so read logcat artifacts, not local builds.
