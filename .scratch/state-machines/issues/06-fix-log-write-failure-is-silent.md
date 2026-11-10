# 06: A fix the log cannot write is lost silently

Status: ready-for-agent
Type: task
Blocked by: none

Impact: low (a nearly full phone), but silent.

## Evidence

`FixLog.append` catches `IOException` and drops the fix; with the page asleep nothing else holds it. The page counts its own IndexedDB failures (`failedFixWrites`) and says so; the native side counts nothing.

## What to build

Count failed writes in RideState, write a diagnostics line on the first, and let the page add them to the ride's `failedFixWrites` when it imports the log.

## Acceptance checks

- Unit: the import adds the native count.
