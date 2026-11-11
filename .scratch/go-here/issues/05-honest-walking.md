# 05: Honest walking

Status: logic built (words, maps link, the major-roads file, the footbridge hint); the dashed line, the card's lines and the button wait for the owner's design ("Owner designs first" 3 and 4)
Type: task

Footbridges' ticket 04 (the walk hint) is folded in here.

## What to build

**Logic, now** (pure functions in `routes/model/`):
- **The walks' words.** "about N m in a straight line", rounded to 10 m (as `walkToLandmark`).
- **The maps link.** For a walk's two ends: Android's `geo:` link, iPhone's `maps://`, openstreetmap.org's directions on a computer. No Google (question 4).
- **The footbridge hint.** Does the straight walk cross a major road (trunk, primary, secondary)? If so, the nearest footbridge over that road within about 300 m, on which side, and whether it has an elevator. The major roads come with the footbridge file or a sibling, simplified and near hintuans; measure the size first, out of the opening code.

**Once designed:**
- the dashed straight walk on the map;
- the walk lines and the hint on the trip card;
- "Open in your maps app".

## Acceptance checks

- **Unit checks:**
  - the words;
  - the link for each platform;
  - the hint: a walk that crosses and one that doesn't, a footbridge on either side, none within reach, two roads crossed.
- **Later, with the design:** stories and a phone-test check; CI green.

## Answer (so far)

**Built:** `routes/model/honest-walk.ts`.
- `roundedWalkM` and `walkWords`: "About 300 m in a straight line". Place search's `walkToLandmark` now shares the rounding.
- `mapsLink`: a `geo:` link on Android, Apple Maps walking directions on an iPhone, openstreetmap.org's walking directions on a computer; never Google.
- `mapsPlatformOf` reads the platform from the user agent.
- Unit checks: `tests/unit/honest-walk-test.mjs`.

**The major-roads file: built** (the owner's answer to Q178).
- **What.** `public/data/major-roads.v1.json`: the trunk, primary and secondary roads (not their links), only the stretches within 1 km of a published hotspot (Go here's widest walk, `WIDER_REACH_M`; a unit check holds the two equal). One entry per name and kind, OpenStreetMap's split ways chained end to start, simplified by at most 3 m, 5 decimals.
- **Built monthly** by `scripts/landmarks/build.sh` from the landmarks' own filter (it already keeps those roads), checked by `scripts/major-roads/check.mjs`, compared in the same refresh pull request (`scripts/major-roads/compare.mjs`). ODbL, the same header as the other two files.
- **Size.** From the 2026-11-05 extract: 275 roads (273 named), 716 lines, 536 km; 96 kB, 25 kB gzipped. The ceiling is 500 kB (unit check).
- **Not fetched yet.** Nothing in the app reads it until the hint's logic and the trip card's design. It is fetched only with a Go here walk, never on the opening path; its offline cache comes with that fetch.
- **A hotspot published after the monthly build** has no roads round it until the next build: the hint then says nothing, never a wrong crossing.
- Unit checks: `tests/unit/major-roads-test.mjs`, `tests/unit/major-road-file-test.mjs`.

**The footbridge hint: built** (`routes/model/footbridge-hint.ts`).
- `footbridgeHints(from, to, roads, footbridges)`: the major roads a straight walk crosses, in the order it meets them. A road's carriageways and kinds count as one road by its name, so a walk across EDSA reads once.
- For each, the nearest footbridge that crosses that road, within 300 m of the crossing (`FOOTBRIDGE_REACH_M`): how far, on which side (north, east, south or west, by the larger leg), and whether it has an elevator. A footbridge over another road doesn't count.
- `footbridgeHintWords`: "Cross Commonwealth Avenue by the footbridge 120 m south (elevator)", "Crosses Commonwealth Avenue: no footbridge mapped nearby", "a major road" when it has no name. The owner designs the final words ("Owner designs first" 3).
- Unit checks: `tests/unit/footbridge-hint-test.mjs`, the fixture cases above plus the committed files: a walk across each of the 269 footbridge segments over a mapped road finds that footbridge. About 0.3 ms a walk.
- **Not yet:** the fetch of the two files with a Go here walk, and the card's line. Both wait for the design.
