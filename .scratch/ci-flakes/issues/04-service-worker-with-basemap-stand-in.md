# A service worker under the basemap stand-in finds a new worker on every update check

Status: needs-triage
Type: task
Priority: low

## What happened

On #1041 (the basemap stand-in), handover-test failed "tapping Reload brings it in and the
button goes" on CI (run 44002880529), and locally in 2 of 5 runs, with a third run crashing on a
late navigation. Staging passed 5 of 5. The two builds' `dist/sw.js` are byte-identical (md5
59d8f2b4…), so the app is the same.

## What is measured

Every `updatefound` and worker `statechange`, logged per document in a throwaway copy:

- Staging, with only the router routed: 2 `updatefound` per run. Ours replaces the old app's
  worker, then the test's "updated build" waits until "Update Para!" is tapped. After the reload,
  nothing new is found.
- #1041, with the router and the basemap routed: the same 2, then a third about 30 ms after the
  tap. After the reload, a fourth is found and waits, so "Update Para!" comes back and the test
  times out. Passing runs show the extra ones too; they only win the race.
- #1041's own build with no routes at all (`PARA_LIVE_SERVICES=1`): 2 per run, 3 of 3 pass.
- The click handler runs, and `SKIP_WAITING` reaches the waiting worker each time.
- The basemap route's handler (a regex, `^https://tiles\.openfreemap\.org/`, answering every
  request it gets with no fallback or continue) saw 25 to 33 requests a run. All were on
  tiles.openfreemap.org, and none was for `/sw.js` or the app's origin. Nearly all came from the
  service worker (`request.serviceWorker()`): its runtime caching of the style, the TileJSON, the
  sprite and the tiles.

So when Playwright answers the service worker's own requests through `context.route`, Chromium
treats `/sw.js` as changed on every update check, though its bytes are the same. The mechanism
inside Playwright and Chromium is not pinned down.

## What was done

handover-test calls `keepBasemapUnreachable()` (`tests/e2e/lib/stand-ins.mjs`) before it launches,
so its basemap is unreachable as the test was built to have it (`--host-resolver-rules`, tile
requests failing at once). The audit then shows its basemap requests as failed, not stood in.
No other suite uses the option.

## For the next suite

A suite that runs a service worker and also has an outside host stood in may see extra worker
updates. Check its `updatefound` count before trusting an update flow under a stand-in.
