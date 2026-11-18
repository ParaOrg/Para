# The contributor app's emulator jobs reach live hosts on a pull request

Status: needs-info
Type: task
Priority: medium

## What happens

`emulator-ride` and `emulator-notification` (`.github/workflows/contributor-app.yml`) build a debug
APK with the ride's driver (`VITE_EMULATOR_RIDE=1`) and run it on an Android emulator. They run on
a pull request that touches the app (the workflow's `paths`), on a push to `staging` that does, and
on "Run workflow". Nothing in them is stood in, and no audit counts what they reach. The browser
suites have both (`tests/e2e/lib/stand-ins.mjs`, `tests/e2e/lib/outside-requests.mjs`).

What the APK carries, from `.env.apk` (all public by design, shipped inside the app):

- the database's address and publishable key: the live database;
- Turnstile's site key: the live key, not a test key;
- the update check's address. A debug build has no `VITE_APP_VERSION_CODE`, so it never checks;
- the basemap host: unset, so OpenFreeMap (`src/shared/config/env.ts`).

What the jobs are known to reach, and what is not yet known:

| Host | Known? | From where |
| --- | --- | --- |
| OpenFreeMap: styles, tiles, sprite, glyphs | Yes | The app's WebView draws the ride page's map |
| OpenFreeMap: the three styles, at build time | Yes | `vite.apk.config.ts` (`basemapStylesInTheApp`) fetches them from Node and fails the build without them |
| The database | Not measured | The driver signs nobody in and saves nothing (`src/features/contribute/native/emulator-ride.ts`). Whether the page's client makes any request at start is not measured |
| Turnstile | Not measured | The challenge loads only on a contributor's first save; the driver never saves. Not measured either |

Nothing is written anywhere live as far as the code shows: the driver records into the phone's
own storage and the native log only.

## Why it matters

The browser suites prove, on every pull request, that nothing leaves the runner. These two jobs
are the remaining browser-like code on a pull request with no such proof. The build-time style
fetch is the same kind of automated fetch from OpenFreeMap that the own-tiles stand-in no longer
makes.

## Options

1. **Measure first (under way).** Both jobs start the emulator with its own capture
   (`-tcpdump`). A step in the job reads the capture with `scripts/apk/hosts-in-capture.mjs` and
   prints only the names looked up (DNS), the names TLS was opened to (the server name), the hosts
   asked over plain HTTP, and the TCP connections opened, each with its count. Then it deletes the
   capture, which is never uploaded. The capture is the whole phone's, so Android's own hosts show
   beside the app's. After one pull request run and one push run, the host list goes under
   Comments.
2. **Cut the emulator's network.** Turn off Wi-Fi and data before the app starts
   (`adb shell svc wifi disable`, `svc data disable`). The ride under test is GPS-only. The map
   would draw from the copies baked into the app (`basemap-copies.ts`), which is itself a case
   worth covering. Needs a check that `keptBasemap()` in the driver's report still means what the
   checker expects.
3. **Stand in through a proxy.** Start the emulator with `-http-proxy` pointed at a local server
   that answers the basemap from `tests/e2e/fixtures/basemap/`, refuses everything else, and
   prints an audit line as the browser suites do. This needs the most new code, and gives the
   closest match to the browser suites.
4. **Build the emulator APK with stand-in values.** A Turnstile test key, and a database address
   no request can reach, for the emulator build only (never the release build, which
   `contributor-app.yml` already checks for the driver). This combines with 2 or 3.

The build-time style fetch is its own, lower-priority change: `basemapStylesInTheApp` could read
`tests/e2e/fixtures/basemap/` for a debug build. It can't do the same for the release build,
which must carry the real styles.

## Decision

The owner decides between 2, 3 and 4 once the measurement in 1 is in. The emulator trigger's paths
stay as they are until the owner says otherwise.

## Comments

**First lists, from the measurement's pull request run (not trusted).** Both jobs showed only
Android's connectivity check (connectivitycheck.gstatic.com, www.google.com) and two connections
to the emulator's resolver on port 853. No tile host appeared, though the ride's map kept tiles.
Port 853 is DNS over TLS: Android's Private DNS hides every later lookup. One TLS server name also
had no matching SYN. So the capture was incomplete, and "not measured yet" still stands.

**The follow-up.**
- Both scripts turn Private DNS off before the app starts, and look up `capture-check.example.com`
  once on purpose.
- Connections are counted from either end (SYN or SYN-ACK).
- The list is printed only when the capture holds that control lookup and, in the ride, the
  basemap's host while the map kept tiles. Otherwise the step prints `capture incomplete: …`.
- If names are still missing, the next suspect is the WebView's own DNS over HTTPS. The TLS
  server names on the tile connections are the fallback evidence.

**The follow-up's first run.** Both jobs said `capture incomplete: the control lookup … was not
seen`, while the ride's map kept tiles (`tiles=2 meta=3`). The control was `capture-check.invalid`,
and a resolver answers `.invalid` itself without sending a query (RFC 6761). So that control could
never pass. The control is now `capture-check.example.com`. The log prints Private DNS's setting
and the lookup's first line. An incomplete capture says how many names and connections it held,
without naming them.

**With the control fixed** (#1072's second run). The notification job's capture held the control
lookup, so its list is trusted. The ride's held 2 names and 3 connections, while its map kept
tiles (`tiles=2 meta=3`). So its capture is incomplete, cause not yet known. In both jobs the host
step began 4–6 s after the runner's `emu kill`, which gives the emulator 20 s to shut down. Next:
the step waits for the emulator to exit before reading, prints the capture's size, and an
incomplete capture says when its first and last packets were. That shows whether the capture
stopped early or was read before it was written.
