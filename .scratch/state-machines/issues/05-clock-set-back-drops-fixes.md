# 05: A clock set back mid-ride drops fixes

Status: ready-for-agent
Type: task
Blocked by: none

Impact: low (phones here keep network time; a manual change mid-ride is rare), but the loss is silent and as long as the change.

## Evidence

`FixLog.append` drops a fix whose `Location.getTime()` is not newer than the last logged one; the page's `takeWatchedFixes` does the same. Android documents `getTime()` as wall-clock time that is not monotonic, and says to order fixes by `getElapsedRealtimeNanos()`.

## What to build

Order and deduplicate by elapsed realtime natively; keep the wall-clock time for the ride. Log a diagnostics line when the wall clock and elapsed time disagree by more than a minute.

## Acceptance checks

- Unit: in the page's dedupe (`takeWatchedFixes`), a fix with an older wall time but a newer elapsed time is kept.
- Emulator: `date -s` back an hour mid-ride (root): fixes keep arriving in the log.
