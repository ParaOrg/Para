# upload-test: "it can still be sent from History, one at a time" failed once

Status: ready-for-agent
Type: task
Priority: low

## What happened

On #909 (no app code changed: an ADR and a migration), CI run 43026265054, attempt 1, job
130541709903, `upload-test` printed:

```
PASS    after a reload it is not asked again and still not sent
FAIL    it can still be sent from History, one at a time, from its ride's sheet
53 passed, 1 failed, 0 skipped
```

Attempt 2 of the same run passed 54 of 54. The step took 1.6 s (13:09:15.56 → 13:09:17.17).
The job kept no screenshot that shows it: the step takes none.

## The step

`tests/e2e/upload-test.mjs`, the block "earlier recordings: asked about, Keep on phone". After
Keep on phone and a reload, it opens History, opens "Earlier one", raises the sheet, taps
`Tap to upload, …`, taps Close, waits for the card's status line to read `Uploaded`
(`waitForStatus`), then checks three things in one boolean:

1. `fake.rows.size === 1`
2. `fake.rows.has(a)`
3. `statusOf(page, 'Earlier two') === 'Only on this phone'`

The check passes no detail, so the log cannot say which of the three was false.

## The rules (as for #880)

- Find the cause. Fix the test if the test is wrong, the app if the app is wrong.
- No retries added, no longer timeouts as a cure, no skipping or quarantining the step.

## First step

1. Give the check its values as the third argument, e.g.
   `JSON.stringify({ rows: [...fake.rows.keys()], two: await statusOf(page, 'Earlier two') })`,
   and take a screenshot when it fails. Then the next failure says which condition broke.
2. Run upload-test locally in a loop (CI's set-up: `.env.production` copied to `.env.local`,
   uploads on, the always-pass Turnstile key, `PARA_TURNSTILE=1`) until it fails, or 50 runs.

## Leads, unproven

- `statusOf` reads the "Earlier two" card the moment "Earlier one" reads Uploaded. If History
  re-renders the list when one upload settles (the overlay status, `useUploads`), the card's
  `aria-live` line may briefly read something other than `Only on this phone`.
- Tapping upload on one earlier recording may change the gate (`gate.earlier`) for the
  other, so `useUploadSending`'s on-its-own send fires for "Earlier two" as well. That would be
  an app bug (two rows), not a test bug.
- `waitForStatus` matches any `li` containing the name; a card from the screen being left
  (History's `<Activity>`) could satisfy it before the shown one does.
