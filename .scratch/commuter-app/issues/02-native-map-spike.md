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
