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
- **Start with location off** (`native/location-off-panel.tsx`): Start does not start a ride while
  the phone's location switch is off. Instead a card shows, in the Start gate's other panels' style:
  the location icon, "Turn on location", "Para needs your location to record your ride.", and
  **Go to Settings** (the phone's Location settings) beside **Close**. The next Start checks again.
- **The History card's "On the map" line** (no Figma frame yet): `history-card.tsx` shows `On the map: <route names>` in `text-xs/4` `text-content-success`, at most two lines, under the ride's day, time and distance. It appears once an editor has used the ride on the published map (#674).
- **The last known place** (`locator/last-known-mark.tsx`): while location is off or no fix has
  come for 30 s, the map keeps the phone's last place as the locator's dot without its face, in
  grey (Content/disabled on a white ring), with a white pill under it, "N min ago" (then "N hr ago",
  "N days ago"), read again every 15 s. Kept on the phone across restarts; display only.
- **Map styles with no signal**: every design switches offline, drawn from the app's copy of its
  style over whatever tiles the phone kept. No style is shown disabled, as the app holds a copy of
  each. The owner chose this, with no disabled look and no toast, on 2026-11-06.
- **Loads that never answer**: History, Account's Commute Statistics and Account settings' profile
  show their skeletons while they load (History's last "Loading…" under a list already drawn is its
  card skeletons now), and after 8 s with no answer give way to their no-signal line with **Try
  again**. Commute Statistics' line had no Try again before; it now has the small secondary one
  History and Account settings use.
- **Keep Para recording** (`native/keep-recording-panel.tsx`): it replaces the battery card.
  - **When it shows:** once, at the first Start, on Xiaomi, Redmi, POCO, Oppo, realme, Vivo, iQOO, Huawei, Honor, OnePlus and Samsung. It shows even when battery restrictions are already off, because Android cannot report the maker's Autostart switch.
  - **What it says (Q78):** "Keep Para recording", then "<group> phones may stop Para when you leave the app. So your rides keep recording:" and that group's numbered steps (`native/keep-recording-steps.ts`). Groups: Xiaomi/Redmi/POCO, OPPO/realme/OnePlus, vivo/iQOO, Infinix/Tecno, Samsung, Huawei/Honor. Open settings goes to that group's own screen where the phone lets an app open it (Samsung: Para's page in Settings), else Para's page. The numbered list has no Figma frame yet.
  - **Its buttons:**
    - **Open settings** opens the maker's Autostart or battery screen, or Para's page in Settings when the phone has none.
    - **Done** starts the ride.
  - **Its look:** card A's layout, without an icon, because no icon was drawn for it. It keeps the old card's Done.
  - **In Account settings:** a "Keep Para recording" row, in the app only, opens the same screen. It uses GeneralBar's Settings icon and sits above Delete account.
- **Android's battery dialog** (`native/use-start-gate.ts`): once, at the first Start, on every phone where Para is not already unrestricted, Android's own "Let Para always run in the background?" dialog shows before the ride starts. Allow or Deny, the ride starts, and Keep Para recording still shows where it applies. A system dialog, so it has no look of Para's.
- **The ride card with no location** (`RideNotification.java`, Q95 and Q96): while a ride records with no fix coming, the card's status and title say **Location is off: not recording** when the phone's location switch is off, and **No location: not recording** when location is on but no fix has come for 2 minutes. Otherwise the card looks the same as Recording. A fix puts **Recording** back.
- **The ride card after a restart** (`RideNotification.java`, Q94): a ride cut off by a phone restart or an app update gets a plain card, **Your ride stopped when the phone restarted.** / **Open Para to carry on or save it.**, laid out like the "Ride finished — tap to save" card. A tap opens the app.
- **Share ride diagnostics** (`account/app-setting-row.tsx`, Q97): in Account settings, in the app only, a row under Keep Para recording, with the same GeneralBar Settings icon. A tap opens Android's share sheet with the ride's diagnostics log as text, headed "Para ride diagnostics (app <version>)". Nothing is sent unless the contributor picks where it goes (ADR 0004). If the sheet cannot open, a line under the row says **Para could not open sharing. Try again.**
