# 07: Count the fixes the native log could not write in the ride's own failedFixWrites

Status: needs-triage
Type: task
Blocked by: none

Impact: low. Since ticket 06 (#871), a fix the native fix log cannot write is said in the ride's diagnostics log, so it is no longer silent. The ride itself still does not count it: a ride saved after a full phone lost fixes says nothing about them, and the studio cannot tell.

## Why it was left out of 06

The page imports the native log more than once (on opening, on waking, at a Stop). Adding the native count to `Recording.failedFixWrites` at each import would count each failure again every time.

## What to build

- FixLog keeps its count per recording where it survives the process (beside the log, or in RideState) and `FixLog.read` returns it (`failedWrites`).
- The recording gets a field of its own for it (`nativeFailedFixWrites`, optional), set to the native count at each import: the latest value replaces the last, so importing twice counts once.
- `savedRecording` reports the sum of both counts in `failedFixWrites`, the field the studio already reads.

## Acceptance checks

- Unit: importing the same log twice leaves the count unchanged; the saved ride reports both counts together.
- `native-contract-test`: FixLog writes `failedWrites`, and the page reads it by the same key.
