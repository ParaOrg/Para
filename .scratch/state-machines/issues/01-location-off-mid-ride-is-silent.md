# 01: Location switched off mid-ride is silent

Status: resolved
Type: task
Blocked by: none

Impact: high. The commonest way a ride stops collecting. The card keeps saying **Recording** and counting time while no fix arrives, and the page (if awake) says nothing. The contributor finds a straight line across the missing stretch only after the ride.

## Evidence

- `RideService.onStartCommand` checks `LocationManagerCompat.isLocationEnabled` at start only.
- The `LocationCallback` has no `onLocationAvailability`; nothing listens for `LocationManager.PROVIDERS_CHANGED_ACTION`.
- The page's location problem is set by the watch's `onError`, which only a start or a refused service raises (`use-recording.ts`).
- The same silence covers a revoked permission (`failed()` tells `tellFixProblem` only to a page alive at the time) and a long loss of signal.

## What to build

Invariant 3 (`docs/architecture/state-machines.md`): while recording, a fix in the last 2 minutes, or the card and the page say why not. The service watches location availability and the switch; the card says the reason (copy from the owner); the page's problem follows it; each breach goes to the diagnostics log. Fixes are never faked.

## Acceptance checks

- Emulator: `cmd location set-location-enabled false` mid-ride: the card's words change within 2 minutes, the log has a line; on again, fixes resume and the card says Recording.
- Unit: the staleness rule (last fix time, now, the 2-minute limit) as a pure function.

## Comments

Resolved by #858: the service hears the location switch and runs the 2-minute fix check; the card says "Location is off: not recording" or "No location: not recording" (Q95, Q96), and the page hears UNAVAILABLE. Emulator check: location off then on, in emulator-notification.sh.
