# The commuter app in the stores

Written 2026-10-28. The owner wants the commuter side in the App Store and on Google Play, aiming for December 2026. They chose React Native with Expo over Flutter ("I think it's okay for React Native"). They want the studio, the contributor page and the commuter screens polished on the web first, so the app is rebuilt from a settled design and not twice. Plan only: nothing here is built until the owner says go.

## Scope

- **In:** the commuter side, meaning the public map, the route and hintuan cards, the trip and its timeline, "Where am I", fares, and the map's offline copy.
- **Out:**
  - The contributor app stays the Capacitor Android app (ADR 0006).
  - The studio stays on the web.
  - The website stays.
  - Commuters keep reading only the published map (ADR 0001), so the app never talks to the database.

## Why React Native (Expo), and not Flutter or a wrapper

| | Wrap the web app (Capacitor) | React Native (Expo) | Flutter |
| --- | --- | --- | --- |
| Rebuilt | Almost nothing | The screens: map, cards, sheets, gestures | Everything, in Dart |
| Reused | All of it | The route rules, fares, timelines and the published map's reader (below) | Nothing |
| Feels native | Least (a web map in a web view) | Yes | Yes |
| App Store risk | Guideline 4.2 ("a repackaged website") | Low | Low |

Flutter would throw away the TypeScript the project is built on and gain nothing the app needs. The wrapper is the fastest, but it is the riskiest with Apple and the least native. It stays the fallback for a December date (09).

## What is reused and what is rebuilt

Counted on `staging` on 2026-10-28:

- **Reused, about 4,700 lines.** `src/features/routes/model/`, `geo/` and `published/` are plain TypeScript with Zod: no React, no MapLibre, no browser. They hold the route rules, fares, the timeline, the places, the ride and the published map's reader. The only browser use is in `published/fetch-index.ts`, its stored-copy fallback, which 03 splits out.
- **Rebuilt, about 18,800 lines.**
  - `routes/cards/` and `routes/map/`, as React Native screens.
  - The map moves to MapLibre React Native, which reads the same style and tiles from our tiles Worker.
- **The rule from now on:** while the web is polished, new logic goes into `routes/model/` (or `geo/`), never into a component. Everything that lands there the app gets for free.

## Addresses the app depends on

An app in a store keeps running for months after a release, on phones that never update. So the addresses it reads must not change:

- **The map:** `https://www.para-commute.org/data/` (the index and the line files).
- **The tiles:** `https://tiles.para-commute.org`.

**The custom domain (`.scratch/custom-domain/`) therefore lands before the first store release.** That means 05: the switch, the tiles' custom domain and the rate limit.

**The published map's older shapes** (platform-16 in the codebase review) are kept as long as a store version still reads them, not one month.

## Store paperwork (the slow part)

- **Apple:** $99 a year. **Google Play:** $25 once.
- **Organisation or personal account:**
  - As an organisation, "Para" is the publisher. Both stores ask for a D-U-N-S number, a free business ID that can take days to weeks.
  - As a personal account, the owner's name is the seller. Google then also needs a **closed test with 12 testers for 14 days in a row** before the app can be public. That rule is for personal accounts made after November 2023; check Google's own page when the account is opened.
- **Both stores need:** a privacy policy, the data-safety and privacy forms (location is used on the phone only; ADR 0004), icons, screenshots and a short description.

## Timeline, if the polish takes about three weeks

| When | What |
| --- | --- |
| Now to mid-November | The owner polishes the web. In parallel: the accounts (01), and the native map spike (02) once the owner says go |
| Mid-November to about 12 December | The app: shared code (03), shell and data (04), screens from the settled design (05), offline (06) |
| From about 1 December | TestFlight, and Google's closed test (07); the 14-day clock must start by then |
| 1 December | Checkpoint (09): on track for the stores, or ship the wrapper in December and the native app as an update |
| About 12 to 20 December | Submit and review, with room for one rejection (08) |

## Open questions for the owner

1. Is Para a registered organisation, so it has a D-U-N-S number or can ask for one?
2. Is the store name "Para"? The bundle id would be `ph.para.commuter`, beside the contributor's `ph.para.contributor`.
3. Which phones must it run well on (the cheapest Android the owner's commuters use)?

## Tickets

| # | Ticket | Who | Blocked by |
| --- | --- | --- | --- |
| 01 | [Store accounts and paperwork](issues/01-store-accounts.md) | Owner | – |
| 02 | [Native map spike](issues/02-native-map-spike.md) | Opus | – (waits on the owner's go) |
| 03 | [Shared code the app can import](issues/03-shared-core.md) | Opus | 02 |
| 04 | [App shell and the published map](issues/04-shell-and-data.md) | Opus | 03 |
| 05 | [The commuter screens](issues/05-screens.md) | Opus, from the owner's design | 04, the web polish |
| 06 | [Offline map](issues/06-offline.md) | Opus | 04 |
| 07 | [TestFlight and Google's closed test](issues/07-store-testing.md) | Owner, hub | 01, 04 |
| 08 | [Submit](issues/08-submit.md) | Owner, hub | 05, 06, 07, custom-domain 05 |
| 09 | [The 1 December checkpoint](issues/09-december-checkpoint.md) | Owner, hub | – |
