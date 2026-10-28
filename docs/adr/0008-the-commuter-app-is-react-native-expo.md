---
status: accepted
date: 2026-10-28
---

# The commuter app in the stores is React Native (Expo)

On 2026-10-28 the owner asked for the commuter side in the App Store and on Google Play, aiming for December 2026, and chose React Native over Flutter ("I think it's okay for React Native"). The plan is `.scratch/commuter-app/spec.md`.

The commuter app is a React Native app built with Expo, with MapLibre React Native for the map. It shares the route rules, fares, timeline and the published map's reader with the website (`src/features/routes/model/`, `geo/`, `published/`), and rebuilds only the screens.

## Consequences

- `routes/model/`, `geo/` and `published/` stay free of React, MapLibre and browser globals; a check enforces it (`.scratch/commuter-app/issues/03`). New logic goes there, not into components.
- The app reads the same published map and tiles as the website, from addresses that do not change: the custom domain lands before the first store release, and the published map keeps its older shapes for as long as a store version reads them.
- Commuters still never reach the database (ADR 0001), and the app's location stays on the phone (ADR 0004).
- The contributor app stays a Capacitor Android app (ADR 0006); the studio and the website stay on the web.
- Expo, React Native and MapLibre React Native are new dependencies, approved by the owner with this choice; they live in the app's own folder and never reach the web bundle.
- A Capacitor wrapper of the web app stays the fallback if the native app cannot meet a store date (`.scratch/commuter-app/issues/09`).
