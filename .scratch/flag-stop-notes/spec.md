# Flag a stop: a note on each flag

Status: building. Approved by the owner on 2026-11-13. His Figma flow is section 4720:28883 (file MGPQFPjemLbzjNqAI5Ny4D), and it replaces the first stand-in look.

## What the contributor sees

1. **The pill.** A tap on Flag a stop shows the **Add a stop note** pill over the recording card (4707:9551). Its ring runs down over 5 seconds, then the pill goes. The page's status line says "Stop N flagged" for screen readers. There is no top toast.
2. **The note card.** A tap on the pill opens the card for that stop (4709:10936). It has:
   - the field "Describe what that stop mean for you"
   - the count, e.g. 0/200
   - the stop's place
   - **Cancel**, which keeps nothing
   - **Save**, which keeps the note and shows the compact toast **Note successfully added** (4716:9216). Any note kept, from the card or written on the timeline, says so.

   Recording goes on under the card.
3. **The notes button.** Once the ride has a flag, a **Stops notes** button stands over Flag a stop (4718:3923). Its badge counts the flagged stops, with or without a note; past 99 it reads 99+. It goes with the last flag.
4. **The Stops notes page** (4720:28437) shows the back arrow, the title and the flag count. Each stop sits on the **small** timeline with its place, **Stop N ›** and its note box, which is as tall as its words:
   - A tap on the box writes or changes the note in place. Cancel and Save sit under it, both flat.
   - A stop with no note says **Add note**.
   - There is no Edit and no Delete on the page.
   - **Stop N ›** opens the stop on its map (4725:29011): the ride's trail centred on the stop, about 200 m across, drag only, its credits folded to their ⓘ (top right on a phone). The pop-up shows the flag count, the place, and **Close | Delete**. Delete asks "Delete this stop?" (Delete / Keep) first, then removes the whole flag.
   - With every stop deleted, the page says "All stops are deleted" with **Go back**. The notes button has gone, so the page can't be opened again until a new flag.
5. **Where the page opens**
   - while recording, from the notes button
   - on the save form, inline, under Description (4725:29196): the same title, count and timeline
   - from History's ride screen, **read only**: no note can be written, and the map's pop-up offers Close alone

## Rules

- A stop's **place** is the nearest published hotspot:
  - inside its box, the hotspot's name
  - within 500 m, "Near …"
  - otherwise "No nearby place"
  - while the hotspots load, "Finding the place…"
- A note is at most 200 characters and trimmed. An empty note takes it off.
- A flag is known by its **time**, so deleting one never shifts the others.
- The note travels in the flag's upload event, `{ kind: 'mark', at, note? }`. `events` is free-form JSON in the database, so there is no migration. Older apps and older rides simply have no `note`.
- No note is kept while the recording is being saved.

## Not in scope

- Editing an uploaded ride's notes. It needs a database write path, and comes later as its own piece.
- Landmarks as places. Only hotspots for now: the landmarks file is not on the contributor page or the app.
