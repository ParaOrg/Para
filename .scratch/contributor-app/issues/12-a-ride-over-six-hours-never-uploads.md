# 12: A ride over six hours never uploads, and nothing warns before it is too late

Status: needs-triage
Type: product decision, then a small change in the recorder
Who: the owner decides; then a builder session in `features/contribute`
Source: the 2026-11-11 review, finding UX-04

## What happens today

- The database takes a contribution only if it ends at most 6 hours after it starts (migration `20261019125900_contributions`, `ended_at <= started_at + interval '6 hours'`). The phone keeps the same number in `recorder/recording-limits.ts` (`UPLOAD_LIMITS.hours`), and a unit check holds the two together.
- The 6 hours count from Start to Stop, pauses included (`uploads/packing/pack-recording.ts`, `packRecording`).
- Nothing in the recorder knows the limit. The web recorder and the app's `RideService` keep recording past 6 hours. No card, notice or toast says the ride is getting long.
- After Save, `packRecording` refuses the ride (`'too-long'`). History shows "Longer than 6 hours, so it cannot be uploaded. It stays on this phone." (`uploads/upload-failures.ts`). It is never retried (`willRetry: false`; `history/card-status.ts` lists it under `NEVER_FITS`).
- So a contributor who forgets to press Stop, or records a long day, loses the whole ride for the map, not just the part after 6 hours.

## Options

1. **Say it before it happens.** Near the limit (for example at 5½ hours), the recording says the ride ends at 6 hours. At 6 hours the recorder stops by itself and opens Save, as Finish does. The native app does the same through its ride card. Nothing is lost.
2. **Upload the first 6 hours.** Keep recording, but when packing, cut the ride at 6 hours and upload that part. History says the rest stayed on the phone. The contributor is not interrupted, but the end of the ride (often where they got off) is what goes missing.
3. **Both:** stop at 6 hours as in 1, and pack only the first 6 hours of rides recorded before the change, so earlier rides stuck at "Longer than 6 hours" can still upload.

## Recommendation

Option 3. Option 1 keeps every new ride whole. Its second half rescues rides already on phones, and it changes only packing (pure, unit-tested).

## Questions for the owner

- Should the recorder stop by itself at 6 hours, or only warn?
- If it warns: when, and in which words? There is no Figma frame for a warning or for an automatic stop, and this ticket invents no look.
- For rides already stuck at "Longer than 6 hours": upload their first 6 hours, or leave them on the phone?

## Where the code is

`src/features/contribute/recorder/recording-limits.ts`, `uploads/packing/pack-recording.ts`, `uploads/upload-failures.ts`, `history/card-status.ts`; in the app, `android/.../ride/RideMachine.java` (where a time limit would live beside `FIX_LIMIT_MS`).
