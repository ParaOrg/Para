# 03: Native location in the recorder

Status: claimed
Type: task
Who: a session
Blocked by: 02

- In the app, the recorder takes fixes from the background-location plugin (the spike's adapter, `native-location.ts`), started on Start and stopped on Stop, with the "ParaPo is recording" notice; on the web (dev, tests) `watchPosition` stays.
- **Fix rate:** set the plugin's interval to about one fix a second while recording; check it in the emulator ride while moving (the spike saw one per 4–5 s while still).
- **Permissions, in order, with a plain reason each:** notifications (13+), location, then "Allow all the time". A refusal says what still works (recording only with the screen on) and how to change it in Settings.
- **Battery restrictions:** detect makers known to kill background apps (Xiaomi, Oppo, Vivo, Samsung, Huawei, Realme) and show, once, how to allow "no restrictions" for ParaPo, with that maker's steps; a link to the app's battery settings.
- The fixes still go to IndexedDB fix by fix; resume after the app is killed and reopened works as today (Unfinished).
- The emulator screen-off ride (from the spike) runs in CI on app changes and must pass. `npm run check` passes.

## From the spike's emulator ride (2026-10-24, run 40102525554)

The screen was off for 10 minutes, with fixes coming at 1 per second:
- The app stayed alive, the foreground service and its notice stayed, 655 fixes arrived and none were lost.
- **But the page's JavaScript froze about 5 minutes after the screen went off**, even with `useLegacyBridge: true`. That is the plugin's known 5-minute problem.
- The native side queued the fixes and handed them all over on wake.

So, with the screen off past about 5 minutes:
- no IndexedDB writes;
- no auto-stop at the start;
- if Android kills the process, the queued fixes are lost.

**Required here:**
- **Persist fixes natively** as they arrive, inside the foreground service: a small append-only store, such as SQLite or a file, in our own Capacitor plugin or a fork of the location plugin.
- On wake, start and resume, the page imports what it hasn't stored yet, de-duplicated by time, before anything else reads the ride.
- A ride killed mid-way comes back as Unfinished with every fix up to the kill.
- **Auto-stop "back at the start"** must work with the screen off. Either check it natively, or accept that it happens on wake and say so.
- Extend the emulator ride:
  - **20 minutes** with the screen off;
  - force-stop the app at 15 minutes (`am kill`), then relaunch;
  - assert every fix up to the kill is in the ride after reopening.
- Check on the owner's phone with a 30-minute ride once the build is ready.
