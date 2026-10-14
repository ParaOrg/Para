# `src/app/public-map/public-map-app.tsx` — the plan

354 lines on 2026-10-13 (staging `6e718da`). The public map's shell: CLAUDE.md
says an app shell is wiring only, no business logic. Stage 10 already took
its hooks, notices and trip card out (`3a3ef8b`); what is left is 130 lines
of comments, 70 of hook calls and 150 of JSX that hands each component its
props. The goal here is not 150 lines but no logic in the shell and no
wiring written twice: the studio's shell repeats three blocks of it.

## 1. What the file does today

| lines | what |
| --- | --- |
| 1–39 | Imports: the locator's and the published map's public APIs, the cards, the map's components and hooks, three model functions, `useTurn`, `useStatusBarColour`. |
| 41–48 | `openOnRoutes`, module-level: the routes' framing for `MapView`'s `openOn`. |
| 50–58 | The page's doc. |
| 59–66 | `map` state; `useSavedRoutes` with the file's loaders; `useSavedHotspots` muted while a trip is open; `tooNew`. |
| 68–92 | `useCardStack`, `useCardCamera` (its thirteen returns), `useLitRides`. |
| 94–113 | `useTurn` for the locator's camera (after the cards' camera, comment 94–99), `useGazeHush`, `useOffline`, `useStatusBarColour`, `useMapAge`, `useNeedRefresh`, the install offer and its `isInstallPostponed` state. |
| 115–131 | `tripLivery`, `litLivery`, `height`; the open trip's timeline, memoised on the trip and the hotspots (the cheap-phone plan's step 15). |
| 133–159 | The root `<div>` with `data-dock-host` and `data-directions`; `MapView` with `openOn`. |
| 160–224 | What is drawn over the map: `VisitorLocation` (164–180, its `picks`), `EndTitles` (182–190), `StationLabels` (197–208), `HintuanPin` (214–224). |
| 226–250 | `Notices`, `InstallPrompt`. |
| 252–282 | `TripCard`. |
| 284–328 | `HintuanCard`, after the trip on purpose (comment 284–291). |
| 330–351 | `RouteCardList`. |

`studio-app.tsx` holds the same timeline memo (166–176 there, with a note
that the memo is load-bearing) and the same three overlays (321–345 there),
each gated by `!draw.drawing`, without `onPick` and `onTrip`.

## 2. The split

Three moves, each taking a thing out of the shell into the feature that owns
it. None adds a layer of indirection that the shell did not already have.

| new file | takes | public surface |
| --- | --- | --- |
| `features/routes/cards/use-trip-timeline.ts` | 117–131 (and `studio-app.tsx:166-176`) | `useTripTimeline(trip: Direction \| null, hotspots: { hotspots; hotspotsAlong }): Timeline \| null`. The memo as it is, deps `[trip, hotspots.hotspots, hotspots.hotspotsAlong]`. The glossary: a direction is a trip while its card is open; this is that trip's timeline. |
| `features/published-map/install-offer.ts` gains | 111–113, the gate at 245 | `useInstallPrompt(ready: boolean): { shouldShow: boolean; postpone: () => void }`: `useInstallOffer()`, the postponed state and the `ready` gate in one hook; the shell renders `InstallPrompt` with `install.postpone`. |
| `features/routes/map/ride-markers.tsx` | 182–224 (and `studio-app.tsx:321-345`) | `RideMarkers({ map, rides, litLivery, trip, onPlace?, onTrip?, onPickHintuan? })` where `trip` is `{ selected, livery, timeline, hotspots, pickedId, pinAt, pickedLabel, pickedCode, rest }` or null: `EndTitles`, `StationLabels` and `HintuanPin` with the props and keys they have today. The studio renders it only while not drawing, as it gates the three today. |
| `app/public-map/public-map-app.tsx` keeps | the rest | `PublicMapApp`. About 270 lines, 110 of them comments. |

The third is the one judgement call. It is a move of JSX into a component,
but the two shells differ in three callbacks and a gate, so the component
takes three optional props. If the owner prefers each shell to say in full
what sits over its map, skip it: the shell is then about 330 lines, and the
other two moves stand on their own.

## 3. What must not change

- `data-dock-host` and `data-directions` on the root (phone-test, pwa-test
  on a production build reads the count; loading-screen-test 68 checks the
  page before the app carries neither).
- The children's order: the map, the overlays, the notices, the trip card,
  then the hotspot's card ("their first `card` is then the trip", 284–291),
  then the list. `RideMarkers` keeps `EndTitles`, `StationLabels`, `HintuanPin`
  in that order.
- Keys: `placeKey(hotspots.selected)` on `HintuanCard` (296), the choice's
  ids on `RouteCardList` (338), `ride.pickedId` on `HintuanPin` (216).
- The hook order: `useSavedRoutes`, `useSavedHotspots`, `useCardStack`,
  `useCardCamera`, `useLitRides`, then `useTurn` (100): the locator's camera
  moves at the page's turn after the cards' camera (commit-turn-test 247 and
  263, where-test's "the card that tap opened set to another height while the
  camera follows"). `useTripTimeline` is called where the memo is (117), after
  them.
- Module-level loaders and `openOnRoutes` (comment 45): a new function per
  render reloads the file.
- `VisitorLocation`'s `picks` object's seven keys (170–178): dot-gaze-test 92
  builds the subjects from that shape.
- `muted: !!saved.selected` (65); the `hush()` wrappers on ‹ and ✕ (262, 325,
  326); `pickedMetres` only once the full line is in (268).
- The timeline memo's deps, unchanged, and that it is one memo for the card's
  rows and the dots along the line (studio-app's note): timeline-test 564
  ("the same for the same trip and hotspots, and touches neither").
- Budgets: the cheap-phone plan's step 15 (a fix renders `VisitorLocation`
  alone, not the page: nothing of the locator's state comes back into the
  shell), the timeline worked out once per trip, and the public suites'
  tap checks ("a trip's tap compiling no GL program" is the layers', but a
  shell that re-renders more would show in phone-test's tap timing).

## 4. Risks and the nets

| risk | net |
| --- | --- |
| The hook order moved while editing | commit-turn-test (5), where-test's sheet-height check; no unit test renders the shell. |
| `RideMarkers` drops a prop or a key | visitor-test's end circles and pills (`end-title`, 10 reads), station labels (5), the picked pin (`hintuan-pin`, 13), phone-test's picked hintuan; group-test and save-test for the studio's copy (no `onPick` there). |
| `useTripTimeline` changes the memo's identity | timeline-test 564; StationLabels' dots (visitor-test and phone-test: "the dots along the rest ring in the card's pale"). |
| The install prompt | pwa-test (43) and the install prompt's stories; PR #133 (the iPhone's side, a draft) edits `install-offer.ts`: land or close it first. |
| The studio shell | `studio-app.tsx` is being split by the studio sessions (their README). Commits 1 and 3 touch it: do them after that wave merges, on the new file layout. |
| The order of `data-*` reads | loading-screen-test (4), phone-test 787. |

Nothing becomes pure. No new unit test; the count stays.

## 5. Step order

One pull request, three commits, after the studio wave and after PR #133 is
settled:

1. `useTripTimeline` in `features/routes/cards/`; both shells call it.
   Typecheck, lint, unit, build.
2. `useInstallPrompt` in `published-map/install-offer.ts`; the shell uses it.
3. `RideMarkers` in `features/routes/map/`, both shells; or skipped on the
   owner's word.

Then every public suite, and group-test and save-test for the studio's
shell. A PR touching `src/app/studio/` and `src/features/` runs both CI
jobs.

## 6. Model advice

Opus 5.5. The shell has no logic to get wrong; the risk is the order of
hooks and children, and both are written down above. The one choice, whether
`RideMarkers` exists, is the owner's, not the model's.
