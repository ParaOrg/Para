# 02: Native map spike

Status: needs-info (owner: go, once the web polish is under way)
Type: prototype
Who: Opus
Blocked by: – (waits on the owner's go)

## Question

Can an Expo app show Para's map as well as the web: our tiles and style from `para-tiles`, every route from the published map, smooth on a cheap Android phone?

## What to build

- A throwaway Expo app in its own folder (`native/`), never touching the web app: a development build with MapLibre React Native and its Expo config plugin (Expo Go cannot load it).
- The style from `https://para-tiles.para-ph-info.workers.dev/styles/liberty` (the custom domain once it exists), and every direction from `index.v5.json` and its line files as a line layer, read with the existing `routes/published/` reader if it imports cleanly, or a copy for the spike.
- Measure on a real cheap Android phone and an iPhone: first map drawn, pan and zoom smoothness, memory.

## Acceptance checks

- Screenshots and the numbers under Comments; what in `published/` failed to import in React Native, if anything (feeds 03).
- An answer: is MapLibre React Native good enough, or what would be needed.

## Comments

- 2026-11-10 (smmariquit, AI-assisted): Rovic said go in the PARA GC. The spike is in `native/` (Expo SDK 58, `@maplibre/maplibre-react-native` 11.5, `expo-dev-client`), branch `feat/native-map-spike`. Found so far, without a phone:
  - **The reader imports, with one leak.** `routes/published/index-schema.ts` and its `model/` imports bundle for iOS (789 modules, 2.3 MB Hermes bytecode). But 15 files in `model/`, `geo/` and `published/` import `@/shared/utils/geo`, outside the three folders the lint guards. `geo.ts` has no imports itself, so it works through a `@/*` path in `native/tsconfig.json` and a second Metro watch folder; ticket 03 should move it into `geo/` or add it to the guard.
  - **zod comes from the app.** Metro does not see the web's `node_modules`, so the app has its own `zod` (4.6.7, the web's version) and `extraNodeModules` points the shared files at it.
  - **The live map:** the reader parses `index.v5.json` (published 2026-11-06) in 9 ms on this PC: 53 directions, 39 with an overview line, 2,699 points. The style URL answers 200.
  - **Not measured yet:** first draw, pan and zoom, memory on a real phone. That needs a development build: an Apple Developer account for the iPhone (EAS builds it with no Mac), or an Android phone. `native/README.md` has the commands.
