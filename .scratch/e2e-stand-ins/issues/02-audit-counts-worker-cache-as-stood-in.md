# The outside-request audit counts the page's own service-worker cache hits as "stood in"

Status: resolved
Type: task
Priority: low

## What happens

`tests/e2e/lib/outside-requests.mjs` counts a response with no server address as "stood in". A
response the page gets from its own service worker's cache also has no server address, so it is
counted the same way, though no stand-in answered it.

For example, handover-test keeps the basemap unreachable on purpose (`keepBasemapUnreachable`,
.scratch/ci-flakes/issues/04), yet its line reads `tiles.openfreemap.org ×21 (network 0, stood in 5, failed 13,
cancelled 3)`. The 5 come from the worker's cache. Staging's handover line showed the same 5 before
the basemap stand-in existed.

## Option

Count a response the worker served (`response.fromServiceWorker()`) under a column of its own,
such as "from the worker", so that "stood in" means a stand-in or a route answered it. That
changes the audit line for every suite, so it is a change of its own.

## Why it matters now

A stood-in run now fails on any `network` answer (`outside-requests.mjs`). A worker's cache hit is
never `network`, so the guard is not weakened; only the "stood in" column over-counts.

## Comments

### Done: a column of its own

`outside-requests.mjs` now counts a response the page's own worker served
(`response.fromServiceWorker()`) under "from the worker", the last column of each outside line:
`outside: <host> ×n (network n, stood in n, failed n, cancelled n, from the worker n)`. The
worker's own requests are still responses of their own, counted as before, so the tripwire still
fails any network answer. `.claude/agents/ci-watcher.md` reads the new line.

The suites with a worker, stood in, on a build made as CI makes it, staging's audit then this
one (the totals move a little from run to run with the tiles a move cancels):

- handover-test: `×17 (network 0, stood in 5, failed 9, cancelled 3)`, then
  `×19 (network 0, stood in 0, failed 11, cancelled 3, from the worker 5)`.
- pwa-test: `×172 (network 0, stood in 126, failed 34, cancelled 12)`, then
  `×172 (network 0, stood in 51, failed 34, cancelled 8, from the worker 79)`.
- contribute-offline-test: `from the worker 0` on every host; its worker serves only /contribute/.
