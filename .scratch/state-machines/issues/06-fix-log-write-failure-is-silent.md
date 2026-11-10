# 06: A fix the log cannot write is lost silently

Status: resolved
Type: task
Blocked by: none

Impact: low (a nearly full phone), but silent.

## Evidence

`FixLog.append` catches `IOException` and drops the fix; with the page asleep nothing else holds it. The page counts its own IndexedDB failures (`failedFixWrites`) and says so; the native side counts nothing.

## What to build

Count failed writes in RideState, write a diagnostics line on the first, and let the page add them to the ride's `failedFixWrites` when it imports the log.

## Acceptance checks

- Unit: the import adds the native count.

## Comments

Resolved in part by the fix-log failures pull request: FixLog counts the fixes it could not write for the recording being logged, and the diagnostics log says so at the first and in all when the log is sealed, so the loss is no longer silent. Not done: adding the count to the ride's own `failedFixWrites`. The page imports the log more than once, so it needs a field of its own to count each failure once, which is a schema change for its own ticket. No emulator check: an emulator cannot be filled to fail one write and not the rest.
