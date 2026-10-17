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

- [ADR 0001](0001-visitors-read-a-published-file.md)'s consequence "a change the editor saves is seen by visitors when it
  is published" becomes: a change is seen once it is approved, then published.
  ADR 0001's decision stands: commuters read static files, never the database.
- Hintuan links are worked out from approved lines and boxes only, when
  something is approved, so a draft never reaches a public timeline.
- Taking work down on purpose is listed, and the publish's 30% guard counts
  those rows as deliberate. A slip that hides everything still trips it.
- Any editor approves, their own work included (the owner, 2026-10-15). Pending
  marks work as finished, not as checked by someone else.
- On the day it ships everything already saved is approved, so commuters see
  no change.
