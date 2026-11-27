# Owner to design later

Things built as placeholders until the owner draws them in Figma. Each has a working stand-in, so
nothing is blocked. When a design lands, the entry says where its code is.

Status: needs-info

## The studio's route line detail (Figma 4906:30152, built 2026-11-26)

- **Export menu.** It opens under the Export button with CSV, GeoJSON and JSON. It uses the New
  menu's look, borrowed. Code: `src/features/studio/panels/menu-button.tsx`.
- **The ⋮ menu.** It holds Delete only, in the same borrowed look. Same file.
- **While a file is being made.** "Exporting both ways…" shows under the actions. Code:
  `route-line-actions.tsx`.
- **"Export failed" message.** The words come from the old export panel: what happened and what to
  do, under the actions. Code: `route-line-actions.tsx`.
- **"+ Add route" on an undrawn direction's tab**, and **"Not drawn yet"** when read-only. Both
  use the rest tab's look. Code: `route-line-tabs.tsx`.
- **Empty sections.** These say "No signboard yet — add one in Edit Route" and "No stops yet —
  hintuans along the line show here", in Content/tertiary. Code: `route-signboards-section.tsx`
  and `route-stops-section.tsx`.
- **Missing facts.** "Not priced yet" shows for a mode with no fare rule, and "Not set yet" for a
  route with no mode. A route with no via has no Via row. Code: `route-line-facts.ts`.
- **Status on a published route.** The summary card (4915:2713) draws Status as "Draft" in
  text/text-error. A route with no draft waiting says "Published" in Content/quaternary, the word
  Edit Route's Status already uses. While the route's draft is still being read, or cannot be,
  Status reads "--", as an unknown fact does in Edit Route. Code: `route-line-facts.ts`
  (`routeStatus`, `routeSummaryFacts`).
- **Transport mode's words.** The frame writes "Jeep", so a road vehicle reads as a trip's
  Transport mode tile does (Jeep, E-Jeep, Bus, UV Express, Ferry, EDSA Carousel). LRT, MRT, P2P bus
  and Tricycle keep the studio's own words. Code: `route-line-facts.ts` (`modeLabel`).
- **EAT.** The frame has an EAT row ("30mins - 1hr"). No travel time is stored or worked out yet,
  so the row is left out until there is one to show.
- **Draft notice above the tabs.** Another editor's locked draft shows the existing lock notice
  above the tabs. Code: `studio-route-line-detail.tsx`.
- **Where Overview sits.** On the map, 16 from its top left. The "Overview ↗" pill shows while the
  detail is open. Code: `src/app/studio/playground-trip.tsx`.
- **Hover, pressed and focus states** for the tabs, Other destinations rows, Route Stops rows and
  menu items. None are drawn yet, so the browser's focus ring and the menu's hover stand in.
- **Add signboard in Edit Route.** The signboard editor moved from the route line detail into Edit Route,
  beside the map, and sits under Route Information in its old look. It shows only for a direction
  that is already saved: a new one has no boards to add until its first save. Phones keep it on
  their trip card. Code: `src/features/studio/panels/save-panel.tsx` (`DraftSignboards`).
- **A phone layout** for the detail. Desktop comes first, so phones keep today's trip card.

## The studio's route list on a computer (Figma 4905:21658, built 2026-11-27)

- **Loading and empty.** The frame draws a full list only. The list opens only once a tap has
  found routes, so it never waits or opens empty. A filter that leaves nothing shows the public
  map's "No … routes here" with Show all routes, as the phone's list does. Code:
  `src/app/studio/playground-list.tsx` (the public map's `RouteCardList`, docked).
- **Closing it.** The frame has no ✕. Escape closes the list, as on the public map. Opening
  another place or a route from the map replaces it. Phones keep their ✕ and PAPUNTA.
- **No DonationCard.** The frame ends the list with the public map's DonationCard ("Help make
  Para better"). The studio leaves it out: editors are not the ones asked to donate. Say if it
  should show here too.
- **A short list.** It ends at its last card with the map below it, as the public map's does,
  and grows to the map's height before it scrolls (the owner, 2026-11-27: "remove this white").
  The frame draws a list taller than the screen only.
- **Hover and focus** on the cards and on Vice Versa, the filter and Overview: the public map's
  own states stand in (the browser's focus ring, the buttons' hover).
