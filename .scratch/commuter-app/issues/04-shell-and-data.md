# 04: App shell and the published map

Status: needs-info (waits on 03)
Type: task
Who: Opus
Blocked by: 03

## What to build

- The Expo app: name, icon and splash (the owner's), bundle id `ph.para.commuter`, EAS builds for both stores.
- TanStack Query and the shared reader for the index and line files, with loading, error and empty states; the map from 02.
- Location ("Where am I") through Expo's location module, foreground only (ADR 0004: location never leaves the phone here).
- Updates: the published map refreshes like the web's (published-map feature), and the app checks the store version.

## Acceptance checks

- On both platforms: the map, every route, and the commuter's own dot; airplane mode shows the last map, not an error page.

## Comments
