# A service worker under the basemap stand-in finds a new worker on every update check

Status: resolved
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

## The other suites with a service worker

The same build was run 3 times per suite and mode, counting `updatefound` per run. "Without" means
no routes at all and an unreachable basemap.

| Suite                   | With the basemap stood in | Without | Result     |
| ----------------------- | ------------------------- | ------- | ---------- |
| contribute-offline-test | 1                         | 1       | 6 of 6 pass |
| pwa-test                | 2                         | 1       | 6 of 6 pass |

pwa-test's extra worker is found right after "Update Para!" is tapped, the same moment as
handover's. Unlike handover's, no further worker is found after the reload, so pwa-test has
passed every run (5 of 5 locally, and both of #1041's CI runs). It stays on the stand-in: it needs
the basemap for its caching checks.

The check exposed is "tapping Reload brings the new worker in and the button goes" (pwa-test.mjs,
the update section). It would fail the way handover's did: a reload that finds yet another worker,
leaving one waiting and the button back. That check's detail now says how many new workers were
found (`…, 2 new worker(s) found` on a passing run), so a red there points here. If it does fail
on CI, the choice is between making the check allow for an extra worker and opting pwa-test out
of the basemap stand-in, with that run as evidence.

## For the next suite

A suite that runs a service worker and also has an outside host stood in may see extra worker
updates. Check its `updatefound` count before trusting an update flow under a stand-in.

## Comments

### The routes were the cause; pwa-test now gets a real server

The basemap stand-in can also be served by a real HTTPS server on a loopback port
(`serveBasemapOverHttps` in `tests/e2e/lib/stand-ins.mjs`). It gives the same answers, with a
certificate made for the run, and the browsers resolve tiles.openfreemap.org to it
(`--host-resolver-rules`), trusting that certificate alone (`--ignore-certificate-errors-spki-list`,
by its key's hash). Nothing is routed, so the service worker's requests leave Playwright alone.
The audit counts a loopback server's answers as stood in, so the tripwire still fails any real
network answer.

pwa-test, stood in, same build, worker updates found by the update check:

| Basemap stand-in      | Runs | New workers found | Result |
| --------------------- | ---- | ----------------- | ------ |
| Routes (before)       | 5    | 2 each            | 5 pass |
| Loopback server (now) | 3    | 1 each            | 3 pass |

1 is what a live run finds. So Playwright answering the worker's own requests was what made
Chromium find the extra worker. Why it does is still not pinned down inside Playwright and
Chromium, and does not need to be.

handover-test keeps `keepBasemapUnreachable()`: its hand-over is built on the basemap failing at
once. contribute-offline-test finds 1 either way and stays on routes.

### Behind a proxy, the loopback server was not what answered

On 2026-11-17 the local runs of pwa-test for the loopback server above (about 19 runs) were made
on a machine whose outbound HTTPS goes through a proxy on 127.0.0.1. A proxy carries HTTPS before
Chromium applies `--host-resolver-rules`, so those runs reached the real tile host,
tiles.openfreemap.org: about 1,000 tile requests in all. `--proxy-bypass-list` did not change
that. CI has no proxy, and there the server answers.

The audit missed it because it counted any answer from a loopback address as stood in, and the
proxy's address is loopback too.

Two fixes, in the pull request that adds the "from the worker" column (e2e-stand-ins 02):

- The audit counts as stood in only an answer from the stand-in server's own loopback port
  (`isStandInServer`). Any other address is the network's, a local proxy's included. A page
  whose worker forwards a request to an outside host, on a stood-in run behind the proxy, was
  `stood in 1` and exited 0 before; it is `network 1` and fails the run now.
- `serveBasemapOverHttps` refuses to start when `HTTPS_PROXY`, `HTTP_PROXY` or their lower-case
  forms are set, naming the reason: such a machine cannot run pwa-test stood in.
