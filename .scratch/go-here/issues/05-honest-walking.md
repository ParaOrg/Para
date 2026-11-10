# 05: Honest walking

Status: words and maps link built; the footbridge hint waits for the hub's word on the roads file; the dashed line, the card's lines and the button wait for the owner's design ("Owner designs first" 3 and 4)
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

**The footbridge hint: measured, not built.**
- **What it needs.** The major roads as lines. Trunk, primary and secondary within 1 km of a hintuan are 4,840 ways, 321 kB (69 kB gzipped), simplified to 5 m. All of them in the map's box are 719 kB (163 kB gzipped).
- **Why it waits.** That is a second public file, bigger than the footbridge file, built monthly with it and fetched with the trip card's walk. It waits for the hub's word.
