# The contributor app's emulator jobs reach live hosts on a pull request

Status: ready-for-human
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

What the jobs reach, measured (#1074's pull request run, both jobs, with the capture's checks
passing; the lists are under Comments):

| Host | From where |
| --- | --- |
| tiles.openfreemap.org | The ride page's map, in the WebView: styles, tiles, sprite, glyphs |
| www.para-commute.org | The published map's index and lines, read through the phone's own HTTP client (`src/features/contribute/map/published-source.ts`). By design |
| challenges.cloudflare.com, brunhild.challenges.cloudflare.com, stun.cloudflare.com | Turnstile, at page load. A phone with no account opens on Sign in (`useAccountGate`, `account-gate.tsx`), and Sign in, Create an account and Forgot password each carry the check (`use-captcha.ts`). The emulator has no account |
| The database | Not seen in either job: no lookup and no TLS name for it. That covers these runs only, not every run |
| Android, Play Services and Chrome (connectivitycheck, *.googleapis.com, www.google.com, www.gstatic.com, mtalk, dl.google.com, STUN and others) | The phone itself, not the app |

Also: tiles.openfreemap.org's three styles are fetched from Node at build time
(`vite.apk.config.ts`, `basemapStylesInTheApp`), outside the capture.

fonts.gstatic.com appeared once, in #1072's run, and in neither job of #1074's. The app's fonts are
self-hosted (`src/design-system/foundation/fonts.css`), and nothing in `src/`, `contribute/` or
`android/app/src` names a Google font host. So it is the phone's, not the app's.

The contributor-page docs say Turnstile runs on a contributor's first save. It also runs on the
contributor's own Sign in, Create an account and Forgot password, as it does on the studio's
sign-in. That is intended; only the documentation leaves it out (CLAUDE.md's stack table, the
owner's to change).

Nothing is written anywhere live as far as the code shows: the driver records into the phone's
own storage and the native log only.

## Why it matters

The browser suites prove, on every pull request, that nothing leaves the runner. These two jobs
are the remaining browser-like code on a pull request with no such proof. The build-time style
fetch is the same kind of automated fetch from OpenFreeMap that the own-tiles stand-in no longer
makes.

## Options

Sizes: S is an hour or two and one small pull request; M is a day; L is several days.

1. **Measure (done).** Both jobs capture the emulator's traffic (`-tcpdump`). With Private DNS and
   Wi-Fi off, a control lookup and, in the ride, the tile host must be in the capture, or the job
   says the capture is incomplete and names nothing. Only names and counts are printed, and the
   capture is deleted in the job.
2. **Cut the emulator's network (M).** Turn data off as well, once the app is installed. The ride
   is GPS-only, and the map would draw from the style copies baked into the app
   (`basemap-copies.ts`) with no tiles. The ride's kept-tiles check (`tiles>0`) would then fail by
   design, so it would have to change into a check of the no-signal map. That is a change to what
   the job proves, so it is the owner's call.
3. **Stand in through a local proxy (L).** The emulator's `-http-proxy` points at a local server
   that answers the basemap and the published map from fixtures, refuses everything else, and
   prints an audit line as the browser suites do. This is the full offline step. It needs the
   most new code: the native HTTP client's reads of the published map have to honour the proxy
   too.
4. **Stand-in values in the emulator build (S).** In the two emulator jobs' build step only, add
   Turnstile's always-pass test key and a database address no request can reach (a loopback
   port). The release build and `.env.apk` are unchanged. The jobs then carry no live key and no
   live database address. Turnstile's script still loads from challenges.cloudflare.com, since
   test keys are served from the same host. A variant: `VITE_CONTRIBUTIONS=0` for the emulator
   build, which removes the database client and the Sign in gate altogether, and so Turnstile too.
   But the job would then test a page with no account step, a change to what it proves.
5. **Para's own tile host in the emulator build (S).** Set `VITE_BASEMAP_HOST` to
   https://tiles.para-commute.org in the same build step. The ride's tiles, and the three styles
   fetched at build time, then come from Para's own server, not OpenFreeMap. The kept-tiles check
   stays as it is: the cache rules already match the own host's addresses
   (`src/shared/config/basemap-cache-rules.ts`, `/{z}/{x}/{y}.pbf` and `/styles|assets/`). Two
   things to know:
   - The emulator would then test a different basemap host from the APK testers install, which
     reads OpenFreeMap (`.env.apk` sets none). The website already uses the own host
     (`.env.production`), so the own host's path is tested elsewhere. The APK's own path
     (OpenFreeMap) would lose its emulator coverage until `.env.apk` follows.
   - The runs still reach the network, now Para's own Worker instead of OpenFreeMap.

**4 and 5 together** are one small pull request: three variables in the two emulator jobs' build
step (`env:` beside `VITE_EMULATOR_RIDE`). It touches `.github` only, so it merges alone. The
host list then shows what changed.

## Decision

The owner decides. The hub recommends 4+5 now and 3 later as the full offline step. Before 4+5 is
built, the owner answers a product question: should the shipped APK (`.env.apk`) also move to
Para's own tile host, as the website has? If yes, 4+5 tests the shipped path again. If no, the
emulator tests the own host while the shipped APK reads OpenFreeMap, a gap this ticket records
and accepts. The emulator trigger's paths stay as they are until the owner says otherwise.

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

**Read after exit, still incomplete** (#1073). Both captures were written in full, ~30 KB each,
with packets from boot to the last minute. Yet both held only the boot-time check (2 names, 3
connections) and not the control lookup. So the phone's traffic leaves by an interface the
capture does not record: the emulator's Wi-Fi, once it is up. The one whole list would be a run
where it never came up. Next: Wi-Fi off before the app starts, and the active network printed.
If the cellular NIC carries nothing, the ride's kept-tiles check fails. That is a finding, and the
check stays as it is.

**Trusted lists** (#1074: Wi-Fi off, the active network printed). Both captures were full (22 MB
and 11 MB, from ~30 KB), each held the control lookup, and the ride's tile check passed. Hosts
(dns/tls/http counts) from the ride: tiles.openfreemap.org 4/2/0, www.para-commute.org 4/2/0,
challenges.cloudflare.com 6/3/0, brunhild.challenges.cloudflare.com 5/0/0, stun.cloudflare.com
3/0/0, and Android's own: android.googleapis.com, connectivitycheck.gstatic.com,
content-autofill.googleapis.com, dl.google.com, edgedl.me.gvt1.com, geller-pa.googleapis.com,
mtalk.google.com, play.googleapis.com, stun.l.google.com, stun1.l.google.com,
update.googleapis.com, voilatile-pa.googleapis.com, www.google.com, www.googleapis.com,
www.gstatic.com. The notification job: the same, plus infinitedata-pa.googleapis.com and
youtubei.googleapis.com. No database host in either.
