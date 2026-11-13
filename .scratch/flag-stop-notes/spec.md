# Flag a stop: a note on each flag

Status: building (approved by the owner 2026-11-13). Figma comes later; the look reuses existing parts until then.

## What the contributor sees

1. A tap on Flag a stop shows "Stop flagged" with an **Add a note** button. The toast stays 5 seconds (other info toasts stay 4).
2. Add a note opens a sheet over the recording screen: the title "Add a note", one field, **How do you describe this stop**, then **Save**. ✕, Escape or a tap outside closes it without saving. Recording keeps running under it.
3. After Stop, the save form lists the ride's flagged stops, each with its time and its note. A tap on one opens the same sheet to add or change its note.
4. History: a ride's detail screen lists its flagged stops and their notes, for rides this phone keeps (an upload from another phone carries no events to History).
5. Studio: each flag's note sits beside its time in the contribution's details.

## Rules

- A note is at most 200 characters, trimmed; an empty note removes it.
- A note belongs to its flag by position: flags are only ever added at the end, so a flag's position never changes.
- The note travels in the flag's upload event: `{ kind: 'mark', at, note? }`. `events` is free-form JSON in the database, so no migration. Older apps and older rides have no `note`.
- The toast's button breaks the toast's own rule (no action on a toast that hides itself, for WCAG's timing). The owner accepted the exception on 2026-11-13 because the save form's list gives a second way to add every note.

## Not in scope

- The look: the owner's Figma replaces the stand-in sheet and toast.
- Notes on uploads seen from another phone.
