# Small fixes on the trip card

Two changes, one pull request each. Both show on the public map and in the studio, which share the trip card.

## 1. "Kilometer" → "Distance"

**The ask (2026-10-15):** the tile under the ride's length reads **Distance**, not Kilometer. The figure keeps its form (`16.6km`). It matches the tile beside it, which reads "Fare", not "Pesos".

**Where:**

- The label: `src/features/routes/cards/route-trip-detail.tsx`, the name under `trip-km`.
- Comments and descriptions that call it "the Kilometer tile": `src/shared/utils/geo.ts`, `src/features/routes/model/direction-schema.ts`, `src/features/routes/cards/trip-card.tsx`, `route-trip-detail.tsx`, `route-trip-detail.stories.tsx`, `tests/unit/fares-test.mjs`, `tests/e2e/phone-test.mjs`, `tests/e2e/visitor-test.mjs`, `tests/e2e/README.md`.
- The `trip-km` test id and `kmLabel` stay: they name the figure, which is still in kilometres.

**The owner:** renames the tile in Figma (3778:3183), so the design and the app agree.

**Done when:** typecheck, lint and unit tests pass; the trip card's stories show "Distance"; phone-test and visitor-test pass (they find the tile by its test id, not its word).

## 2. SWITCH keeps the picked hintuan

**The ask (2026-10-15):** on Antipolo → Recto, with Betty Go – Belmonte picked, the card shows Antipolo → Betty Go: 9.5 km, ₱12–13. Tapping Pabalik should show **Recto → Betty Go**, with its own distance and fare, not the whole of Recto → Antipolo.

**Today:** the pick belongs to one direction, on purpose. `useRideTo` (`src/features/routes/map/ride-to.ts`) lets it go whenever another direction opens: "A different direction is a different ride… start it whole." SWITCH becomes the one exception. Another route, a new trip, ‹ and ✕ still start the ride whole.

**The rule.** It is the one HintuanCard's SWITCH already follows (`hintuan-card.tsx`, `switchTo`):

1. The other direction passes the same hintuan: it stays picked.
2. It passes another box of the same place (across the road): the nearest such box is picked.
3. It passes no box of that place: the pick goes, and the ride is whole, as today.

The rule moves into one pure function in `src/features/routes/model/`, used by both cards, so they cannot drift apart.

**Also:**

- **A picked end follows its place.** Recto picked as the end of Antipolo → Recto is the start of Recto → Antipolo after SWITCH.
- **Camera:** SWITCH frames the whole ride, as it does today (`useSwitchOverview` in `use-card-camera.ts`). It does not glide in to the kept hintuan.
- **The studio** gets the same behaviour: its trip card uses the same hook.

**Done when:** unit tests cover the three cases and an end; the trip card's story shows it; visitor-test gains a step: pick a hintuan, SWITCH, and the Distance and fare tiles read the shorter ride.
