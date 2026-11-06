# Attach: attached starts and ends

Status: needs-info

Decided by the owner on 2026-11-05. Record: [ADR 0009](../../docs/adr/0009-attached-starts-and-ends.md). Words: **attached start** / **attached end** in `CONTEXT.md`.

## What it is

Some jeepney routes leave from more than one terminal yet are the same route, with one main line and one name. An **attached start** is a short extra line from another terminal that joins the route's main line partway along. An **attached end** is the same idea at the far end.

## Rules (all the owner's)

- A route can have attached starts and attached ends, several of each.
- The route keeps its main line and its name (the main start's). An attached stretch never renames it.
- **Return trip:** an attached terminal can also be where the jeepney ends on the way back. An attached start on one direction can be the attached end on the return.
- **Fares:** a ride from an attached terminal does not necessarily cost the same as from the main start. Each attached stretch needs its own fare information.
- **Commuter map:** attached stretches are drawn fainter than the main line. Tapping a terminal on an attached stretch shows the route as e.g. "A – Z (also from A2)". When a commuter is near an attached terminal, directions suggest boarding there.
- **Studio:** Attach is a mode on the drawing toolbar (the owner's Figma toolbar 4614:15351 shows an Attach pill after Move · Snap · Draw). It reuses Snap and Draw, and the stretch snaps onto the main line where it joins. It goes through drafts and review like everything else. Attach and Extend stay separate tools.

## Storage idea (confirm in Phase 1)

Each attached stretch belongs to a direction and holds:

- its side (start or end),
- its own line,
- its terminal hotspot,
- its join point, as a distance along the main line.

## Phases

| # | Phase | Ticket | Status | Blocked by |
| --- | --- | --- | --- | --- |
| 1 | Database | [01](issues/01-database.md) | ready-for-human | none |
| 2 | Published map (format and reader) | [02](issues/02-published-map.md) | needs-info | 01 |
| 3 | Studio Attach mode | [03](issues/03-studio-attach-mode.md) | needs-info | 01 |
| 4 | Commuter map | [04](issues/04-commuter-map.md) | needs-info | 02 |

Every phase needs the owner's Yes before it starts. None is `ready-for-agent`.

## Open questions

1. **Fares.** How are they stored and shown per attached stretch? Options: a fare table on each stretch, a difference from the main start's fare, or the existing fare rules applied to the stretch's own distance. How does a ride card show it ("₱13 from A2")?
2. **Wording.** Does "also from A2" need Filipino wording?
3. **The faint look.** What is the exact token (colour, opacity or width) for an attached stretch? Needs the owner's Figma and a token in `design-system/foundation/tokens.css` first.
4. **Backward compatibility.** How does the published file stay readable by phones holding old copies: optional fields with the schema number unchanged, or a new schema number with the publisher writing both for a while? (The index carries a schema number and an app reads only the shape it knows.)
5. **Size.** The public page is at 412.3 of 413 kB. Which commuter-side code is trimmed, or does the owner raise the budget?
6. **Return trip.** Is an attached end on the return stored as its own stretch on the return direction, or derived from the outbound attached start? Phase 1 picks one and says why.
