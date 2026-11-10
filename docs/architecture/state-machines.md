# State machines

The states Para's apps can be in, the events from outside that move them, and what each does to them. Each section is one app. Every cell says what should happen, what does happen, and the evidence: code (file and the line of reasoning), an emulator check (job and step), a phone test, or "not proven".

## Contributor app: the ride

Written on 2026-11-10 for the owner's Q80, from the code on `staging` at #853. The emulator was not run for this audit (cloud sessions have no Android SDK); where a cell cites the emulator, it is an existing check in `.github/workflows/contributor-app.yml`.

### Where a ride lives

A ride is held in four places. Most bugs live in the gaps between them.

| Holder | What it holds | Who writes it | Survives a process kill |
| --- | --- | --- | --- |
| **The page's phase** (`recorder/recording-state.ts`) | `loading`, `ready`, `unfinished`, `recording`, `paused`, `form` | the page | no (rebuilt on opening) |
| **IndexedDB** (`storage/recording-store.ts`) | the open ride (`status` `recording` or `stopped`), its fixes, the saved rides | the page | yes |
| **RideState** (SharedPreferences `para.ride`) | `phase` `none`, `recording`, `paused`, `finished`; mode, times, `isPageWatching`, the card's taps not yet applied | the page (`RidePlugin.setState`), `RideService`, `RideActionReceiver`, `RideNotification.pageGone` | yes |
| **RideService** (foreground service, type location, sticky, `stopWithTask=false`) | running or not; the location request; the foreground notification | `RidePlugin.startRecording`/`stopRecording`, the receiver, `setState` (stops it for any phase but recording), Android | no (Android may restart it, sticky) |

Beside them: **FixLog** (`files/fixlog.ndjson`), every fix the service received, its first line naming the ride, sealed at a Stop; and **the card** (notification id 28351), posted from RideState, the service's foreground notification while it runs, an ordinary one otherwise.

### The combined states

What the phone can be in, named by the four holders. Only the first five are meant to exist.

| # | Name | Page | IndexedDB | RideState | Service | Card |
| --- | --- | --- | --- | --- | --- | --- |
| S0 | No ride | `ready` or gone | nothing open | `none` | stopped | none |
| S1 | Recording, page awake | `recording` | `recording` | `recording`, watching | running | Recording |
| S2 | Recording, page frozen or gone | frozen, or gone | `recording` | `recording` | running | Recording |
| S3 | Paused | `paused`, or gone | `stopped` (or `recording` with a pause tap waiting) | `paused` | stopped | Paused |
| S4 | Finished from the card | gone or frozen | `recording` or `stopped`, a finish tap waiting | `finished` | stopped | Ride finished, tap to save |
| **X1** | **Says recording, records nothing** | gone | `recording` | `recording` | **stopped** | **Recording** (stale), or none |
| **X2** | **Records with no fix** | any | `recording` | `recording` | running, **no fix arriving** | Recording, time counting |
| X3 | Cut off, known | `unfinished` | `recording` | `none` | stopped | none |

X3 is the page's honest answer to X1 once it opens: it offers Resume and Stop at the last fix. X1 and X2 are the bugs: the card says a ride is recording while nothing is kept, and nobody is told.

### Outside events against the recording ride (S1, S2)

| Event | Should | Does | Evidence | Verdict |
| --- | --- | --- | --- | --- |
| Swipe from Recents, stock Android | records on; the card stays | records on; the card stays; the page opens `recording` | emulator `emulator-notification` "swiped away" (#841) and `recordingNow` (#825, #845) | ✅ |
| Process kill, stock Android (task removed) | sticky restart within seconds, records on | restarts in about 1 s, records on; fixes in the gap lost, and the page marks them a `silent` gap (`SILENCE_SECONDS`) | emulator "killed away from Recents" (#841); `RideService.onStartCommand` restart branch | ✅ |
| Process kill with the task in Recents | the activity comes back and records on | Android relaunches the activity, the page reopens and restarts the watch | brief, emulator note `killed-away-task.txt` | ✅ |
| MIUI-style kill, no restart (owner's POCO) | the ride stops, and the contributor learns it at once | the ride stops; the card stays saying **Recording** with the time counting no more and buttons that do nothing; RideState stays `recording` (X1). Healed only when the page opens (`unfinished`, then `setState none` cancels the card) | owner's test (#841); `pageGone` never runs without `onDestroy`; `RideNotification.post` uses `notify()`, which outlives the process | ❌ ticket 02 |
| Phone reboot | the ride stops, and the contributor learns it (or it records on: owner's choice) | the ride stops; reboot clears the card; nothing says so until the app is opened (`unfinished`) | code: no `BOOT_COMPLETED` receiver in the manifest | ❌ ticket 03 |
| App update mid-ride | as reboot | as reboot: installing kills the process and the service, and a force-stopped package is not restarted sticky | code: no `MY_PACKAGE_REPLACED` receiver. Low odds: the app offers updates on Ready only (`app-update-gate.tsx`), so it takes a sideloaded APK while a ride records | ❌ ticket 03 (same fix) |
| Location switched off | the card and the page say location is off; the time between is a gap | the service checks the switch only at start (`RideService.onStartCommand`); mid-ride the fused provider simply stops delivering. The card goes on saying **Recording**, the time counting; the page, if awake, says nothing (`onError` comes only from a start) (X2). The fixes come back on their own when it is on again, and the page marks the silence a `silent` gap | code: no `onLocationAvailability`, no `PROVIDERS_CHANGED` receiver; `setLocationProblem` is cleared by fixes only | ❌ ticket 01 |
| Location switched on again | fixes resume | resume: the fused request outlives the switch | not proven on the emulator; `cmd location set-location-enabled` can | ⚠️ add an emulator check |
| Permission revoked mid-ride | the ride pauses and says why | Android kills the process on a revoke; the sticky restart's `startForeground` (14+) or `requestLocationUpdates` throws; `failed()` pauses the ride and adds a pause tap. The page applies it on opening (`paused`); the reason is said only to a page alive at the time (`tellFixProblem`), which it is not | code: `RideService.inForeground`, `failed()` | ⚠️ right state, no reason. Ticket 01 carries the reason |
| Location downgraded to "while using" mid-ride | as revoked | as revoked (the change kills the process too) | code | ⚠️ as above |
| Sticky restart with only "while using" granted | records on, or pauses and says why | not proven. On Android 14+ a location foreground service started from the background without background location may be refused; then `failed()` pauses it (silently, as above) | brief's suspicion; the emulator can show it (`pm revoke … ACCESS_BACKGROUND_LOCATION`, then the swipe-and-kill step) | ❓ emulator check to write |
| Battery saver (Android's) | records on | not proven. A location foreground service should be exempt; Android's battery saver location mode is per phone | — | ❓ emulator check (`cmd power set-mode 1`) |
| Doze | records on | records on: foreground services keep location in Doze | emulator `emulator-ride` "screen off 15 min" (not forced Doze) | ⚠️ add `cmd deviceidle force-idle` |
| MIUI battery saver / Autostart off | records on, or the contributor is told before | with Autostart on and Battery saver → No restrictions, the ride records on alone after a swipe from Recents; with either left off, MIUI kills it (the row above). Keep Para recording (#844) names both | owner's Q75 retest, 2026-11-10, POCO X3 GT, APK run 42485212627: all six checks passed (locking Para in Recents not confirmed as needed) | ✅ with the settings; ❌ without (ticket 02) |
| Airplane mode | records on (GNSS receives with the radios off) | records on; the fused provider loses Wi-Fi and cell help, so the first fix may be slow | not proven; `settings put global airplane_mode_on 1` + broadcast | ❓ emulator check |
| Clock set back mid-ride | records on | fixes are dropped until the clock passes the last logged fix: FixLog and the page both drop a fix "not newer" than the last (`FixLog.append`, `takeWatchedFixes`), and fix times are `Location.getTime()`, which Android documents as not monotonic. Set back an hour, an hour of fixes is lost | code; Android's `Location.getTime` docs | ❌ ticket 05 (rare: phones here keep network time) |
| Clock set forward | records on | records on; the card's time and the ride's figures jump by the change | code: `RideState.elapsedMs`, the page's `Date.now()` | ⚠️ accepted |
| Card tapped while the process is dead | opens the app on the ride | the content tap opens the app, the page opens the ride; Pause and Finish start the process and apply natively (stock Android); Resume opens the app | code: `RideNotification.openApp`, `RideActionReceiver` | ✅ stock; on MIUI after a kill the buttons do nothing (owner) |
| Low storage | records on and says when fixes cannot be kept | IndexedDB failures are counted (`failedFixWrites`) and said; a failed FixLog write is ignored (`FixLog.append` catches `IOException`), so with the page asleep the fix is lost and nobody knows | code | ❌ ticket 06 |
| A process starts with RideState `recording` and no service (X1), the page not yet open | the card says nothing until it knows | `RidePlugin.load` posts the card from RideState: **Recording**, for the second or two until the page tells `none` | code: `RidePlugin.load` → `RideNotification.post` | ❌ ticket 04 (small, heals itself) |

### Outside events against the other states

| State | Event | Does | Verdict |
| --- | --- | --- | --- |
| S0 No ride | any | nothing to keep; a sticky restart finds RideState `none` and stops (`onStartCommand`) | ✅ |
| S3 Paused | kill, MIUI kill, swipe | the card is an ordinary notification and stays; Resume opens the app; the page opens `paused` (IndexedDB `stopped`) or applies the pause tap | ✅ |
| S3 Paused | reboot, update | the card goes; the page opens `paused` | ✅ (nothing was recording) |
| S4 Finished | kill, reboot, update | the card goes on reboot or update; the page opens on the Save form when the finish tap is applied (`applyOpeningTaps`) | ✅ |
| `loading` | any | the page tells the card nothing while loading (#845, `notice-phase.ts`) | ✅ |
| `unfinished` | any | the page tells `none`: the card goes, a stray service stops (#845) | ✅ |
| `form` | kill | the ride stays `stopped` in IndexedDB; opens `paused` | ✅ |

### The six suspicions, checked

1. **App update mid-ride: confirmed by code**, low odds. Ticket 03.
2. **Reboot mid-ride: confirmed by code.** Ticket 03.
3. **`pageGone` on a MIUI kill: confirmed** (code, and the owner's phone in #841). Ticket 02.
4. **Sticky restart with only "while using": not proven.** An emulator check comes with the build (step 3).
5. **Clock change: confirmed by code** for a clock set back. Ticket 05.
6. **Low storage: confirmed by code.** Ticket 06.

### What the emulator can and cannot prove

The emulator's driver build (`VITE_EMULATOR_RIDE=1`) holds the card itself, so `useRideNotice` and the page's `setState` are never exercised there (#845's bugs could not show). No emulator has an OEM killer: MIUI cells are phone tests or mocks. Location off and on, airplane mode, battery saver, Doze, a permission revoke and a clock change can all be driven with `adb shell` and are the regression checks for the build.

### Since the audit

The Ride module (Design A, the owner's Q92) was built after this audit. The native side now owns the
ride: `ride/RideMachine.java` holds every rule above as plain Java with JUnit tests, `Rides.java`
runs it on the phone, and the page reads the ride's history (`RidePlugin.now`) instead of replaying
taps. Tickets 01 to 04 are resolved (#857, #858); 05 (clock set back) and 06 (a failed fix-log
write) are open. The rows marked ❌ for those four now read as below.

| Event | Now |
| --- | --- |
| MIUI-style kill, no restart | the card goes by itself 2.5 min after its last post; the page opens the ride cut off, with Resume or Stop at its last fix |
| Phone reboot, app update | the card says "Your ride stopped when the phone restarted. Open Para to carry on or save it."; nothing records by itself |
| Location switched off | the card says "Location is off: not recording", and the page hears it; on again, Recording |
| No fix for 2 minutes, location on | the card says "No location: not recording" |
| A process starts with a ride cut off | no card says Recording: only a running service shows it |

### Invariants for the Ride module

Checked where the native side can check them, healed where it can, and each breach written to the phone's own diagnostics log (ADR 0004: it leaves the phone only by the contributor's choice).

1. A ride card shows only while RideState is not `none`, and **Recording** only while the service runs.
2. The service runs only while RideState is `recording`.
3. While recording, a fix arrived in the last 2 minutes, or the card and the page say why not (location off, permission, no signal).
4. The FixLog belongs to the open ride; a log left after a Save is cleared.
5. Every tap on the card is applied once.
