# 06: See earlier recordings on the map

Status: needs-info (owner: the Figma design)
Type: design question
Who: the owner, then a session
Source: the owner's phone test of the app, 2026-10-26, feedback (a)

The owner could not see their earlier recordings on the map. Today the map under every screen draws only the recording in progress (`useRecordingTrail`); saved recordings are a list in History, with no map drawing.

## What the design must answer

- Where does a saved recording show on the map: from the History row (one at a time), as a layer for all of them, or both?
- If a layer: is it on by default or switched on? Where does the switch live?
- How does a saved recording look next to the live trail, so the two never read as one? (Papunta, pabalik and mark colours are already taken, `Map/Trail/*`.)
- What does a recording that was uploaded look like against one still on the phone only?
- How many at once before the map is too busy: a limit, or "the last N"?
- Empty, loading and error states for the layer.
- Does it show on the Ready screen only, or also during a recording?

## Not decided here

No UI is proposed. Build starts when the owner's Figma frames exist. Privacy: a drawn recording is the contributor's own, already on their phone (ADR 0004); the design should keep it that way and send nothing new.
