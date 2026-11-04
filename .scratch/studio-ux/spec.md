# Studio UX

Status: ready-for-agent

Planned with the owner on 2026-11-04. The studio's three maps and its review step are built (`../studio-maps/spec.md`). This project makes the studio safe and pleasant to work in: first the bugs that lose an editor's work, then accessibility, then polish from the owner's designs.

One small pull request per task, into `staging`. Each task gets its own `issues/NN-<slug>.md` when it starts.

## Decisions so far

- **Only a draft's maker can discard it** (the owner's 1a, 2026-11-04). Another editor never discards it, not even after 7 days. This settles the 7-day rule left open in `../studio-maps/issues/05-playground-drafts.md` and finding studio-09 in `../codebase-review/studio.md`.
- **A delete made while the editor has a draft of that route goes into the draft** (the owner's yes, 2026-11-04). It isn't approved in the same press. The notice says it was added to the draft, to review in Drafts. A delete with no draft open is approved at once, as today (studio-01).

## Where the 2026-10-28 review stands

Checked against `staging` at 2c01bcc on 2026-11-04. The findings are in `../codebase-review/studio.md`.

| Finding | State |
| --- | --- |
| studio-01: delete approves the editor's other unreviewed changes | Open: wave 1 |
| studio-02: Edit and the signboard editor open the approved version, then overwrite the editor's own draft | Open: wave 1 |
| studio-03: every approval rewrites links, causing false conflicts | Open, database: needs the owner's OK |
| studio-04: sheets aren't modal | Partly fixed: the map is `inert` while a sheet is open. Dialog semantics are wave 2 |
| studio-05: Close the loop offered after Extend | Fixed |
| studio-06: a Follow reply joins onto a drawing that has moved on | To check: wave 1 |
| studio-07: false "This draft changed" after Edit draft details | Fixed |
| studio-08: editors can rewrite any column of their draft | Open, database: needs the owner's OK |
| studio-09: any editor can discard any draft | Open: wave 1, decided above |
| studio-10: four query caches | Fixed: one client in `studio-session-provider.tsx` |
| studio-11: aborted router requests keep their turn | Fixed: `router-queue.ts` |
| studio-12 to studio-19: tests, validation, messages, paging | To check: wave 1, one PR each where still open |
| studio-20: five files far over the size limit | Wave 4 |

## Waves

### Wave 1: bugs that lose an editor's work

1. **Delete with a draft open** (studio-01), as decided above.
2. **Only the maker discards** (studio-09). Hide "Discard…" on another editor's draft. The check in `discard_draft` and the `draft_delete` policy is a database change. It waits for the account-deletion migration another session is writing, and the owner's OK on the migration.
3. **Edit opens the editor's own draft** (studio-02): the line, the facts, the hotspot panel and the signboards.
4. **Check studio-06 and studio-12 to studio-19**, and fix whatever is still open, one PR each.

### Wave 2: accessibility

5. **Real dialogs** for the save sheet, the hotspot panel and the sign-in, change-password and reset-password panels: `role="dialog"`, an accessible name, focus trapped inside and returned on close (`.claude/CLAUDE.md`, Accessibility). One shared dialog in `shared/ui/` if two or more can use it. The look doesn't change.

### Wave 3: polish, from the owner's designs

6. **The map's draft markers** say "Draft: NAME" for every draft. Whether they show Pending or who is changing it is the owner's design.
7. **The hotspot card**: the rest of the card (the TODO in `panels/hotspot-card.tsx`).
8. **Ideas from Felt**: see `felt-research.md`, once the owner picks which ones to design.
9. **The owner's list** of what bothers them in the studio.

### Wave 4: housekeeping, beside the rest

10. **Split the long files**, biggest first, one file per PR, after the wave 1 fixes in the same files have landed: `drawing/use-drawing.ts` (519 lines), `data/routes-write.ts` (365), `app/studio/workshop.tsx` (308), `panels/use-save-facts.ts` (261), and so on.

### Needs the owner's OK: database

- **studio-03:** write only the links that changed on approval, and rebuild a kept hotspot draft's links from the approved directions.
- **studio-08:** grant editors update on `payload`, `status`, `submitted_at` and `note` only, and drop `editor_id is null` from the policy's check.

Both wait for the account-deletion migration in `supabase/` to land first.

## Waiting on the owner (not this project's work)

The live checks in `../studio-maps/issues/05`, `06` and `09`: two editors at once, approving one real draft through a publish, and using one contribution's line and hintuan.
