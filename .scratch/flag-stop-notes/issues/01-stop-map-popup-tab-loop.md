# The stop-map popup's Tab loop counts only its buttons

Status: ready-for-agent
Type: task

## What happens

The stop-map popup (`src/features/contribute/stop-notes/stop-map-popup.tsx`) is a modal dialog:
the stop's map, its place, and Close (and Delete, unless read-only). Its Tab loop goes round
`button` only. The map's own focusable parts are also inside the card: the canvas (a region named
"Map"), the attribution's toggle (`summary`), and the credit links. They are reachable with Tab, and
the loop doesn't know them:

- From the dialog itself (focus as it opens), Tab goes to the canvas, the toggle, then the credit
  links in turn. Only then does it reach Close. From Close, Tab wraps to Delete or Close, never back
  to the map. So the map's stops are reached once and never again.
- Shift+Tab from the dialog goes straight to the last button and never reaches the map's stops.

Found while moving the Tab loops onto the shared `useTabLoop` (shared/hooks/use-tab-loop.ts).
That move kept the behaviour as it was. A keyboard harness over the stories
(`Features/Contribute/StopMapPopup`, Default and ReadOnly) recorded the order above.

CLAUDE.md's accessibility rules say dialogs trap focus. The focus never leaves the card here,
because the map's stops are inside it, but the loop is lopsided: the map is in the cycle one way
and out of it the other.

## What it should do

Pick one, the simplest that keeps the card's buttons easy to reach:

1. **The map in the loop.** The loop's stops include the map's focusable parts, in document
   order (for example `button, summary, a[href], [tabindex="0"]`), so Tab and Shift+Tab both go
   round all of them.
2. **The map out of the loop.** The map in this card is a picture of where the stop is, not a
   control. Its canvas and attribution leave the tab order (the canvas `tabindex="-1"`, the
   attribution's links kept for a pointer). Tab goes round the buttons only, as the loop already
   says. The credit must stay reachable somewhere for a screen reader: as text in the card, or
   through the attribution toggle kept in the loop.

The look is unchanged either way. Which one is the owner's call, through the hub, if it changes
what a screen-reader user hears.

## Done when

- Tab and Shift+Tab visit the same stops, in opposite orders, round and round, in Default and
  ReadOnly.
- A play test on `Features/Contribute/StopMapPopup` proves it, with no outside request: the
  Storybook play check stands the basemap in (`scripts/checks/storybook-play.mjs`).
- Escape and focus return as before.

## Comments
