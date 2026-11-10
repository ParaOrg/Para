# 03: A reboot or an app update stops the ride silently

Status: ready-for-human
Type: task
Blocked by: the owner's choice below

Impact: medium. A phone that restarts mid-ride (battery, crash, the contributor) loses the rest of the ride, and nothing says so until Para is opened. An update mid-ride needs a sideloaded APK during a ride, so it is rare (updates are offered on Ready only).

## Evidence

No `BOOT_COMPLETED` or `MY_PACKAGE_REPLACED` receiver in `AndroidManifest.xml`. RideState stays `recording` with no service (state X1 in `docs/architecture/state-machines.md`); the page opens `unfinished`.

## The owner's choice

Both broadcasts are allowed to start a location foreground service from the background (with "all the time" location granted). So after a reboot or an update, Para could:

- **A (recommended):** post a card "Your ride stopped when the phone restarted. Open Para to carry on or save it." No recording without a tap.
- **B:** record on by itself, the time off marked as a gap. Surprising after a long time off, and it runs without the contributor knowing.

## Acceptance checks

- Emulator: reboot mid-ride (`adb reboot`, wait for boot): the card chosen above; the page opens `unfinished`.
- Emulator: `adb install -r` mid-ride: the same.
