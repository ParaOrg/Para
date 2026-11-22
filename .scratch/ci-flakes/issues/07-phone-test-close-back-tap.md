# phone-test's "a tap reaches … (Close|Back)" fails now and then, on the owner's machine

Status: needs-triage
Type: task
Priority: low

## What happened

During the folder restructure (`.scratch/folder-restructure/README.md`, "Found on the way, for tickets"), phone-test failed one check now and then on unchanged `staging`. It was on the owner's Windows machine, and the check's name ends in the button's locator:

```
FAIL  a tap reaches locator('[data-testid="card"]:not([hidden])').getByRole('button', { name: /^(Close|Back)$/ }).first() …
```

The run's exact `staging` commit, the part, how often it failed, and the reason after the locator were not recorded. CI has never shown it: neither the restructure's runs nor any run in [the failure ledger](../../ci-speed/failure-ledger.md) since 2026-11-22.

## Where the check is

- **The check:** `tests/e2e/phone-test.mjs`, `closeCard`. On a phone touched by finger alone (`isTouchOnly`), it leaves each open card in turn, at most 5 times, until none is open. A place's card is left by its ✕ ("Close") or its ‹ ("Back"); a trip and the route list are left by a tap on the empty map. `closeCard` runs 18 times across the three parts.
- **The tap:** each ✕ or ‹ goes through `buttonTap`. `missed` turns a tap into the FAIL above in two cases, and the text after the locator says which:
  1. **Before the tap:** `fingerOn` finds no place a finger can reach the button. The text then reads `no such element`, `not on the page`, `still moving after 3 s (…)`, or `<what> at its middle (x, y), …` when something else is on top.
  2. **After the tap:** `done()` didn't come true within 1.5 s. Here `done()` means the text at the top of the open cards changed (`moved`, from `atTop`). The text reads `tapped, and nothing came of it in 1.5 s`, then either `, it came N ms after the tap` or `, nor 3.5 s later`.
- **Chromium's dropped touches:** a touch Chromium dropped is not this failure. `buttonTap` sends it again by hand, and the log names it: `by hand: Chromium made no pointer events from the touch on …` (CHROMIUM_DROPS_ALLOWED, `.scratch/ci-speed/issues/01-chromium-touch-drop.md`).
- **The failure text** also ends with the sheets' heights (`snapsNow`), which says whether a card was still settling.

## Measured here (Linux, 2026-11-22)

It did not reproduce: 0 failures in 12 runs.

- **Setup:** `staging` at 487f224, the dev server on its own port, Playwright 1.65 with the pre-installed Chromium, every outside request stood in.
- **Results:**
  - 9 runs: each of phone-test's three parts 3 times, as `PHONE_PART=k/3`. All checks passed, and no tap was sent again by hand.
  - 3 more runs of the three parts on the batch-5 branch (#1131), which moves only `sheet-room.ts`. All passed.

So it is either Windows-only, or rarer than 1 in 12 parts. Windows-only could mean timing on a slower machine, or the Windows build of Chromium.

## To reproduce

```sh
npx vite --port 5291 --strictPort &
for r in 1 2 3 4 5; do for k in 1 2 3; do
  PHONE_PART=$k/3 PARA_BASE=http://localhost:5291 node tests/e2e/phone-test.mjs > p$k-r$r.log 2>&1
  grep -H 'a tap reaches .*Close|Back' p$k-r$r.log
done; done
```

On Windows (PowerShell), set `$env:PHONE_PART` and `$env:PARA_BASE` the same way.

## What to record when it fails

- The `staging` commit, the part, and the machine.
- The whole FAIL line: the reason after the locator, and the sheets' heights.
- The PASS lines just before it, which name the card that was open.

## Next

- **Not a CI flake yet.** It goes into the failure ledger, and gets a CI fix, only if a CI run shows it.
- **On the owner's machine:** first find which of the two reasons it is.
  - "Before the tap" with "still moving" means the card had not settled. `closeCard` already waits for `cardsSettled` between taps, so the first tap is the one to look at.
  - "Nothing came of it", with the tap reaching the button, points at the tap itself on Windows' Chromium.
