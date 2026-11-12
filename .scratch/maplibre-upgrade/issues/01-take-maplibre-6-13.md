# 01: Take MapLibre 6.13 or later

Status: needs-triage
Type: task
Who: Opus, with the owner's answer on the size budget first
Blocked by: the owner's decision below

## Why

Para is on `maplibre-gl` 6.7.0 and cannot take a newer one as it stands. Dependabot's weekly group
wanted 6.17.0 (#898) and could not go green. Until this is done, `.github/dependabot.yml` holds
MapLibre's minor and major versions back, so the other packages in the group can be updated without it.

Two separate things stand in the way. Both were measured on 2026-11-11, on staging at `d921c9db`, by
installing the version and running `npm run build`.

**1. MapLibre got bigger.** The budget for what every page shares (MapLibre, React and the shared code)
is 413 kB gzipped (`SHARED_MAX_GZ_KB`, `scripts/checks/build-weight.mjs`).

| MapLibre | its page chunk | its shared chunk | its worker | the shared total | budget 413 kB |
| --- | --- | --- | --- | --- | --- |
| 6.7.0 (today) | 137.3 kB | 134.8 kB | 5.8 kB | 408.4 kB | fits |
| 6.12.0 | 143.2 kB | 144.3 kB | 5.8 kB | 423.9 kB | 10.9 kB over |
| 6.17.0 | 283.8 kB | none | 144.5 kB | 420.1 kB | 7.1 kB over |

**2. MapLibre changed the files it ships, at 6.13.0.** Sizes on disk, not gzipped:

| MapLibre | `maplibre-gl.mjs` | `maplibre-gl-shared.mjs` | `maplibre-gl-worker.mjs` |
| --- | --- | --- | --- |
| 6.7.0 to 6.12.0 | 565 to 583 kB | 481 to 505 kB | 19 kB |
| 6.13.0 to 6.18.0 | 1,054 to 1,084 kB | empty | 496 to 508 kB |

Up to 6.12.0 the worker is a small file that imports the shared one, and Para's build is made around
that: the worker reuses the chunk the page has already downloaded (`maplibreWorkerWithThePage` in
`scripts/node/vite-plugins/maplibre-worker.ts`, the `maplibre-gl-shared` group in `vite.config.ts`). From
6.13.0 the page's file and the worker's file each carry everything. With 6.17.0 seven build guards
fail: the `maplibre` chunk is 283.8 kB against its 160 kB limit, there is no `maplibre-gl-shared` chunk,
the worker is 144.5 kB against 20 kB, the shared total is over, and the checks that the shared chunk
holds MapLibre's shared file alone and that the worker imports only what the page already loaded no
longer hold.

There is also a type error from 6.12.0 on, which is the easy part: `AddProtocolAction` now wants
`data` to be bytes, text, an image or an object, and `src/features/contribute/map/basemap-cache.ts`
returns `unknown`. The fix is to narrow the JSON body to an object and type the style copy as an
object. It adds about ten lines to a file that sits at its long-file limit (156), so the small helper
`bodyOf` moves to a file of its own first.

## The decision for the owner

Which of these, if any:

- **Stay on 6.7** until something in a newer MapLibre is wanted. Costs nothing; fixes and features in
  6.8 and later are not taken.
- **Go to 6.12.0**, the last version with the old layout, and raise the shared budget from 413 to
  about 425 kB. A commuter downloads about 15 kB more on a first visit. The build and its guards stay
  as they are. It only buys time: 6.13 is still ahead.
- **Go to 6.13 or later** (this ticket). The worker becomes a 145 kB download of its own instead of a
  6 kB file that reuses the page's chunk, so a first visit downloads more in total even though the
  page's own share is about the same. The budgets and seven guards are re-set to the new layout.

## What to build (if the answer is 6.13 or later)

1. Measure first: the cheap-phone timer (`scripts/research/phone-speed.mjs`, both profiles) on 6.7.0 and
   on the target version, a first visit and a second, so the cost on a slow phone is a number.
2. `vite.config.ts`: drop the `maplibre-gl-shared` group; decide where the worker's file goes and
   whether the page preloads it. `maplibreWorkerWithThePage` either goes or shrinks.
3. `scripts/checks/build-weight.mjs`, `scripts/checks/build/weight.mjs` and
   `scripts/checks/build/maplibre-worker.mjs`: new limits and new guards for the new layout, each with
   the number it was set from. The offline workers' precache lists (`public-worker.mjs`,
   `contribute-worker.mjs`) hold MapLibre's worker by name: check them.
4. The type fix in `basemap-cache.ts`, after `bodyOf` has moved out.
5. Remove MapLibre's entry from `ignore` in `.github/dependabot.yml`.

## Acceptance

- `npm run check` passes with the new version, every guard re-set on purpose and none merely loosened.
- The timer's numbers, before and after, are in the pull request.
- The browser suites that draw the map pass: commuter, phone, pwa (both basemap hosts), scale, the
  drawing suites, contribute and contribute-offline.
- Dependabot proposes MapLibre again.

## Notes

The versions between 6.7.0 and 6.18.0 were compared by the sizes of the files each release ships (the
registry's own listing), and 6.12.0 and 6.17.0 by building Para with them.
