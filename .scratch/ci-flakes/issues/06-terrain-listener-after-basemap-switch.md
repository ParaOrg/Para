# Leaving Terrain can throw "Cannot read properties of null (reading 'tileManager')"

Status: resolved
Type: task
Priority: medium

## What happened

On #1063's pull request run (CI run 44160851592), contribute-offline-test failed one check:

```
FAIL  no page errors  TypeError: Cannot read properties of null (reading 'tileManager')
```

The page was the studio's, in the visit that picks Terrain, then Satellite. #1063 did not touch
that suite's setup; the error comes from the app and MapLibre.

## Why

From MapLibre 6.7.0's own code (`node_modules/maplibre-gl/dist/maplibre-gl-dev.mjs`), confirmed by
the error's stack:

1. Terrain's style sets the terrain: `map.setTerrain(…)` listens to that style's `data` events
   (`_terrainDataCallback`).
2. A pick of another basemap calls `map.setStyle` (`applyBasemap`). MapLibre makes the new style the
   map's (`this.style = new Style(…)`) before it has loaded.
3. When the new style loads, it calls `map.setTerrain(null)`. That removes the listener from
   `this.style`, which is now the new style, so the old style keeps it. The terrain becomes `null`.
4. The old style's sprite can still arrive after that. Its `data` event runs the listener, which
   reads `this.terrain.tileManager` on `null` and throws:

```
TypeError: Cannot read properties of null (reading 'tileManager')
    at _handleTerrainDataEvent
    at _terrainDataCallback
    at fire
    at _loadSprite
```

It is an uncaught error in the studio for a person too, whenever Terrain's sprite is slower than
the next style. Only the studio has Terrain (`studio-basemaps.ts`); the public map's basemaps have
no elevation, so it never reaches commuters.

## The fix

`applyBasemap` (`src/features/routes/map/basemap.ts`) drops the terrain itself before `setStyle` (`leaveTerrain`, `terrain.ts`),
when the map has terrain and the basemap picked has none. The old style is still the map's then,
so `setTerrain(null)` takes the listener off it. Terrain to Terrain (the labels shown or hidden)
is left alone: dropping the terrain there would lose the hills, as the style's diff would not set
them again.

## Measured

contribute-offline-test on a build made as CI makes it (`VITE_BASEMAP_HOST=https://tiles.openfreemap.org`),
stood in:

| Code   | Runs | Failed "no page errors" with this TypeError |
| ------ | ---- | ------------------------------------------- |
| Before | 21   | 5                                           |
| After  | 30   | 0                                           |

A loop on the dev server flipping Terrain and Satellite 100 times, with elevation tiles answered
at once or up to 1.5 s late, never threw: the sprite's timing on a build is what loses the race.

The camera after Terrain→Satellite, Satellite→Terrain and Terrain→Coloured, with no tilt, tilted
50° and turned 20°, and with the live elevation tiles over Manila and over the hills east of it:
centre, zoom, pitch, bearing and the camera's elevation are the same before and after the fix to
within 1e-9, in all 16 comparisons. The camera's elevation was 0 in every case, and the ground's
height read 0 even with the live tiles, so that part of the comparison shows no difference rather
than proving one could not happen. MapLibre's own `setTerrain(null)` on the new style's load sets
the same elevation a moment later, so the end state is the same by construction.

## Upstream

The leak is MapLibre's: `setTerrain` should remove the listener from the style it added it to.
A note for MapLibre's tracker is drafted, not filed; filing is the owner's call.
