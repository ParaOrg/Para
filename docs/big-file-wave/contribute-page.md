# `src/features/contribute/contribute-page.tsx` — the plan

535 lines on `staging` at 540f6a88 (2026-11-11), held to that length by `scripts/checks/long-files-baseline.json`. It is the contributor page's one component: every hook the page needs is called here, and every screen is drawn from here. It is also the most changed source file in the repository: 99 commits touched it in the last 30 days (the list at the end), so two sessions rarely work on the contributor page without meeting in this file. The split is to give each reason to change a file of its own.

Plan only: nothing under `src/` changes with this document. The moves are built by the session that owns `features/contribute`. Line numbers are `staging`'s today; the implementer re-anchors on the quoted comments, since the file moves every day.

## 1. What the file does today

| Lines | What |
| --- | --- |
| 1–61 | Imports: TanStack's client, React (with `Activity`), the error boundary, and 31 of the feature's own modules. |
| 63–64 | `HistoryViewProps` and `AccountViewProps`, read off the lazy screens. |
| 66–83 | `ToolbarPlace`, a private component: "Where the page's toolbar stands (TOOLBAR_PLACE): out of sight and out of reach while a question is asked on the screen under it". |
| 85–98 | `HistoryView` and `AccountView`, private: "at once if its chunk is here, else lazily: decided once as it opens". |
| 100–105 | `keepTrailPicture`: "Keeps the picture of a recording's trail for History's card". |
| 113–117 | The recording, the account query and the account gate. |
| 118–140 | An effect that watches for another account: "Only a later check (online again, back to the front) can find another account". It fetches its code, and asks again when the signal returns. |
| 141–156 | `canSend`, `canSendNow`, the earlier-recordings question, the uploads, the recording's track. |
| 157–162 | Six screens kept in the address's hash: History, a ride, Profile, Account settings, Change password, Delete account. |
| 163–178 | The permissions screen's flag; `openedTab`, "Where Ready puts focus as it opens"; the page's notices. |
| 179–203 | `pageScreens` and `pageLayout` (`page-layout.ts`, already pure and tested), the tutorial, the credits, the stop question. |
| 204–211 | The ride whose screen shows, and its trail. |
| 212–223 | The two latches that keep History and Account drawn; the folded recording card; the Start morph and the warm-up. |
| 225–252 | Three effects that close a stale address: "A stale #history (a reload mid-recording, or before signing in) must not open History later", "A ride's address, as #history's", and "Signing out, or leaving Ready, must not leave #profile". |
| 254–280 | What each toolbar tab opens from each screen: two handlers, two refs and the `toolbarOpeners` table. |
| 282–288 | `screenTries`: "A screen whose code could not be fetched shows ScreenUnavailable; its Try again draws the screen afresh". |
| 290–339 | `<main>` and the map, with the flag button as its `mark` (315–337): the recording's, or the tutorial demo's inert twin. |
| 340–409 | The account gate, the toasts, the upload check, the live status line, the permissions screen, the tutorial's offer, Start, the tutorial, the credits. |
| 410–458 | Account and History, each kept in an `<Activity>`, inside an error boundary with `ScreenUnavailable`, inside a `Suspense`. The two blocks differ in five values. |
| 459–473 | The toolbar in its place. |
| 474–530 | The Unfinished screen, the Recording screen, the stop question, the Save form. |

Three things in it are logic, not wiring: when a stale address is closed (225–252), what a toolbar tab opens (254–280), and the watch that retries when the signal returns (118–140). None of the three has a test of its own today; the browser suites reach them only through whole journeys.

## 2. The split

Seven moves. `ContributePage` keeps its name, its one prop and its place in `index.ts`. Each move is a pull request of its own, a pure move unless it says otherwise.

### `navigation/stale-screens.ts` and `navigation/use-close-stale-screens.ts`

Takes 225–252. The decision becomes a pure function:

```ts
export interface OpenScreens {
  history: boolean;
  ride: boolean;
  profile: boolean;
  accountSettings: boolean;
  changePassword: boolean;
  deleteAccount: boolean;
}

/** The screens whose address must be dropped now; none while the account is still loading. */
export function staleScreens(
  accountGate: AccountGateState,
  phase: Phase,
  open: OpenScreens,
): readonly (keyof OpenScreens)[];
```

`useCloseStaleScreens` calls it in one effect and runs each screen's own move: `history.close()`, `ride.replaceWith(SCREENS.record.hash)`, and `close()` for the four of Account. Today the three effects repeat one condition in three spellings (`!canSend || (phase !== 'loading' && phase !== 'ready')` twice, `isUsable` once); the function writes it once.

New test: `tests/unit/stale-screens-test.mjs`. The account loading closes nothing; signed out closes everything open; a recording under way closes History and a ride and the Account screens; Ready and signed in closes nothing.

### `toolbar/toolbar-openers.ts`

Takes 254–280: `toolbarOpeners({ hasAccount, history, profile, onOpened })`, returning the same `Record<ToolbarTab, Partial<Record<ToolbarTab, () => void>>>`. Pure but for the moves it is handed. `historyTabRef` and `accountTabRef` stay in the page: Ready and the toolbar share them.

New test: `tests/unit/toolbar-openers-test.mjs`, with fakes for the two screens. With no accounts in the build, no tab opens Account; from History, Record replaces History's address and Account takes its place; from Account, Record closes Profile.

### `account/use-other-account-watch.ts`

Takes 118–140 as `useOtherAccountWatch()`. The hook reads the query client itself. The retry is a pure helper beside it, `watchWhenFetched(load, start, target)`, which returns the stop function: the code is asked for, started when it comes, and asked for again on `target`'s next `online` when it does not.

New test: `tests/unit/other-account-watch-test.mjs`, with a fake `EventTarget`: fetched at once; not fetched, then fetched after `online`; left before the fetch answers starts nothing; stop removes the listener.

### `screens/kept-screen.tsx`

Takes 410–458, 282–288 and 85–98. One component for the block written twice:

```tsx
interface KeptScreenProps {
  name: 'History' | 'Account';
  screenHash: ScreenHash;
  chunk: { hasFailed: () => boolean };
  isShown: boolean;
  tries: number;
  onTryAgain: () => void;
  children: ReactNode;
}
```

It draws `Activity`, the error boundary keyed on `tries`, `ScreenUnavailable` and the `Suspense`, in today's order. `HistoryView` and `AccountView` move beside the lazy screens they choose between (`lazy-screens.ts`), since they exist only to pick one. `screenTries` and `tryScreenAgain` become `useScreenTries()` in the same file. A story with the three states: shown, hidden, and the fetch failed.

### `map/flag-stop-mark.tsx`

Takes 315–337 as `FlagStopMark({ isRecordingShown, phase, marks, demo, onFlag })`: the recording's flag button, or the tutorial demo's inert twin, or nothing. The nested ternary goes with it, replaced by early returns (`.claude/CLAUDE.md`, Components). This one is not a pure move, so its pull request says so.

### `toolbar/toolbar-slot.tsx`

Takes 66–83, `ToolbarPlace`, unchanged. It reads `useIsToolbarHeld`, so it belongs with `toolbar-hold.tsx` and `toolbar-place.ts`.

### `map/use-shown-ride.ts`

Takes 204–211 with `keepTrailPicture` (100–105): `useShownRide(layout.isRideDetailShown, ride.rideId, recording.saved)` returns what `ContributeMap`'s `ride` prop takes, or null.

### What stays

`contribute-page.tsx` keeps the hook calls in today's order and the JSX that hands each screen its props: about 330 lines, a third of them comments. It is still over 150. The rest is one screen per block, and splitting that further means a context for the recording and the layout, which is a design change and not this plan.

| New file | Lines out | New test |
| --- | --- | --- |
| `navigation/stale-screens.ts`, `navigation/use-close-stale-screens.ts` | 28 | `stale-screens-test` |
| `toolbar/toolbar-openers.ts` | 27 | `toolbar-openers-test` |
| `account/use-other-account-watch.ts` | 23 | `other-account-watch-test` |
| `screens/kept-screen.tsx` (+ story) | 70 | none: `profile-test` and `contribute-test` cover it |
| `map/flag-stop-mark.tsx` | 23 | none: `contribute-test` covers it |
| `toolbar/toolbar-slot.tsx` | 18 | none |
| `map/use-shown-ride.ts` | 14 | none |

## 3. What must not change

- **`<main>`'s attributes** (292–299): `OPENABLE_SCREENS_ATTR` with `layout.openableScreens` (`tab-motion.ts` reads it), `data-dock-host`, and the class `contribute-page` (`contribute.css` stops the page scrolling by it).
- **The order of the children.** The map first, inert while covered; then the account gate; then everything else inside `ToolbarHoldProvider`, in today's order. The toolbar is drawn after History and Account and before the recording's screens: "Drawn once and kept while Record, History or Account shows, so it stands still as they slide under it".
- **History and Account stay mounted.** The two latches (`useLatch(…, !canSend)`) and the `Activity` mode are what make going back "a show, with no fetch, read or layout again". A ride's screen keeps History shown: `layout.isHistoryShown || layout.isRideDetailShown`, in the latch and in the mode alike.
- **The error boundary's key** is `screenTries`, for both screens: one Try again redraws both.
- **`HistoryView` and `AccountView` choose once**, in `useState`'s initialiser: "the chunk arriving later never swaps it for another and resets its scroll, menus and focus".
- **The hook order**, where it carries meaning: `useRecording` first; `pageScreens` before `useTutorialEntry` (it takes `screens.isReadyClear`); `pageLayout` after the tutorial, the credits and the stop question (it takes all three); `useRideTrail` after the layout.
- **Focus.** `openedTab` is set by the two tab handlers, by the History tab's Account opener, by "Route recorded" (`onRouteRecorded`) and cleared by Start. Ready reads it as `backFrom`.
- **Nothing is sent early.** `canSendNow` (146), not `canSend`, goes to `useUploads` as `hasConsent`.
- **The page's opening size.** The contributor page opens with under 31 kB gzipped of its own code, and the build fails over that (`scripts/checks/build/weight.mjs`, `CONTRIBUTE_OWN_MAX_GZ_KB`); it stands at 30.0 kB today. Every new file here is imported by `contribute-page.tsx` directly, so it lands in the same chunk: no move may add a lazy boundary or take one away, and each pull request gives the size before and after.
- **Import rules.** The feature never imports the locator: the shell hands it in as `locator` (107–110).

## 4. The suites that must keep their counts

Run each before and after every move, against `npm run dev`, one at a time, and put both counts in the pull request:

| Suite | What it would catch |
| --- | --- |
| `contribute-test` | The recording's screens, the flag button, the Save form, focus after a save, a screen whose code cannot be fetched. |
| `upload-test` (30) | Nothing sent before the account is confirmed; the upload check on Ready. |
| `contribute-offline-test` (13) | The built page with no signal: it opens, starts and records. |
| `handover-test` (11) | The build as a whole: the installed app's worker takes this build over. It reads nothing of this file; it is run because a moved lazy boundary changes what a build's workers hold. |
| `profile-test` | Account and History kept, the tabs, the other-account watch, a screen whose code cannot be fetched. |
| `claim-test` (25) | The account gate, and the other-account watch. |
| `account-test` (28) | Signing in and out, the other-account watch, Account's inner screens and their addresses. |

`contribute-test` and `profile-test` print their counts as they end; `tests/e2e/README.md` gives no number for them today, so the first pull request records them.

## 5. The step order

1. `stale-screens.ts` with its test, then the hook. The biggest gain in what is tested, and no JSX moves.
2. `toolbar-openers.ts` with its test.
3. `use-other-account-watch.ts` with its test.
4. `kept-screen.tsx` with its story.
5. `toolbar-slot.tsx`, `use-shown-ride.ts`, `flag-stop-mark.tsx`, one pull request each or together if the day is quiet.

Each lowers the file's line in `long-files-baseline.json` with `node scripts/checks/long-files.mjs --update`. No step starts while another open pull request edits `contribute-page.tsx`: with 99 commits in 30 days that is the real constraint, so the hub picks the day.

## 6. The ten most changed source files

Commits in the last 30 days times lines today, on `staging` at 540f6a88, source files only (`.ts` and `.tsx` under `src/`, stories left out). A file high on both counts is where sessions meet and where a change is hardest to review.

| Score | Commits | Lines | File |
| --- | --- | --- | --- |
| 52,965 | 99 | 535 | `src/features/contribute/contribute-page.tsx` |
| 26,304 | 12 | 2,192 | `src/shared/types/database.types.ts` (generated; never split) |
| 25,440 | 53 | 480 | `src/app/public-map/public-map-app.tsx` |
| 22,272 | 58 | 384 | `src/app/studio/workshop.tsx` |
| 17,775 | 25 | 711 | `src/features/studio/drawing/use-drawing.ts` |
| 16,290 | 30 | 543 | `src/features/routes/map/map-view.tsx` |
| 12,672 | 32 | 396 | `src/shared/ui/bottom-sheet.tsx` |
| 11,308 | 22 | 514 | `src/features/routes/map/direction-arrows.ts` |
| 8,874 | 34 | 261 | `src/features/routes/cards/trip-card.tsx` |
| 8,262 | 34 | 243 | `src/features/studio/panels/save-panel.tsx` |

The command, from the repository's root. The clone must hold 30 days of history first (`git fetch --shallow-since=<a date 30 days back> origin staging`); a shallow clone undercounts.

```bash
git log --since="30 days ago" --name-only --format="" -- src \
  | grep -E '\.tsx?$' | grep -v '\.stories\.tsx$' | sort | uniq -c \
  | while read -r commits file; do
      [ -f "$file" ] && echo "$((commits * $(wc -l < "$file"))) $commits $(wc -l < "$file") $file"
    done | sort -rn | head -10
```
