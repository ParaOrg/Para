---
status: accepted
date: 2026-10-17
---

# Commuters see what was approved, then published

Since migration 0015 (2026-10-14) three editors change every route and
hotspot, and every save reached commuters at the next nightly publish. An
experiment went public as soon as it was saved.

Every route and hotspot now goes Draft → Pending → Approved, and the nightly
publish reads approved work only. Drafts live apart from the tables commuters'
data is published from, in one draft table, one draft at a time per route or
hotspot. The database lets anonymous readers, the publish among them, read
approved rows only, so the publish needs no rule of its own to leave drafts out.

## Consequences

- [ADR 0001](0001-commuters-read-a-published-file.md)'s consequence "a change
  the editor saves is seen by commuters when it is published" becomes: a change
  is seen once it is approved, then published. ADR 0001's decision stands:
  commuters read static files, never the database.
- Hintuan links are worked out from approved lines and boxes only, when
  something is approved, so a draft never reaches a public timeline.
- Taking work down on purpose is listed, and the publish's 30% guard counts
  those rows as deliberate. A slip that hides everything still trips it.
- Any editor approves, their own work included (the owner, 2026-10-15). Pending
  marks work as finished, not as checked by someone else.
- On the day it ships everything already saved is approved, so commuters see
  no change.

## Amendment 2026-11-05: Draft and Published

The owner simplified the steps to two: a route or hotspot is a **Draft**
while it is being changed, and **Published** once an editor presses Publish.
Publish approves the draft at once; there is no Pending step and no Send back
(Pending already did nothing: the studio submitted and approved in one press).
**Unpublish** takes published work off the public map at the next publish and
leaves it a draft. The decision above stands: commuters see published
(approved) work only, at the next publish, and drafts never reach a public
timeline. The studio shows who last saved a route or hotspot and when it was
published, so the database records both at publish
(`.scratch/codebase-review/database.md`, "What Draft ↔ Published needs").
