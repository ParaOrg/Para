# 04 — Split the biggest headless suites

Status: ready-for-agent
Type: task

## What

On 2026-10-13 `tests/e2e/phone-test.mjs` was 4,044 lines and
`visitor-test.mjs` 1,655; a phone run took over half an hour. Both hold
many screens' checks in one script, and each repeats lookups that
`tests/e2e/lib/` could share. On 2026-10-13 four places built a jeepney-only
token name inline (`--card-<livery>-…`), which took two review rounds to
find.

## How

- Move repeated in-page helpers (colour probes, token lookups by livery,
  pill and label readers) into `tests/e2e/lib/`, next to `looks.mjs`.
  Do this first, as its own PR: it is the smallest slice and the one that
  pays most.
- Then split `phone-test.mjs` by screen (the opening; the route list; the
  trip card; a hotspot's card; the mouse at 1280×800) into files that each
  open their own page, so CI can run them as separate jobs, as
  `VISITOR_PART` does for the visitor suite.
- Every check keeps its exact wording and its PASS/SKIP logic, so a run
  before and after can be compared line by line.
- Update `tests/e2e/README.md` and `.github/workflows/ci.yml` to match.

## Done when

- The same checks run: compare the sorted PASS/SKIP lines of a run before
  and after the change, and show the comparison in the PR.
- Each new file runs on its own against a dev server on a spare port (not
  5173).
- CI on the PR is green.

## Comments
