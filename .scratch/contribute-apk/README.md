# Contributor APK fixes

The fixes the owner said yes to on 2026-11-06, one pull request each into `staging`:

1. The map loads by itself once the phone is back online.
2. A Lakad or Sakay tapped on the ride's notification is not undone by the page.
3. The locate button with the phone's location off: Google's "Turn on location?" dialog, else a toast.
4. A map with no signal: the basemap's style copied into the app, and the last one fetched kept.
5. The map pieces the phone has seen kept in Cache Storage.
6. Recording goes on after the app is swiped away (Para's own foreground service).

## Owner to design later

The builder chose these for now, from the owner's decisions. Each waits for the owner's frames:

- **The flat map**: what the contributor app draws when it has no signal and no copy of the
  basemap's style. It has no roads, labels or 3D, and no layer of its own, so the map's own ground
  shows (MapView's `surface-secondary`). The app always ships a copy of each style, so this is a
  last resort. With a copy and no tiles, the map shows only the style's own background colour.
- **Map styles with no signal**: every design switches offline, drawn from the app's copy of its
  style over whatever tiles the phone kept. No style is shown disabled, as the app holds a copy of
  each (waiting on the owner's answer, through the hub, whether a disabled look is still wanted).
