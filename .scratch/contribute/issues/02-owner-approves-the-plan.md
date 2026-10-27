# 02: The owner approves the plan

Status: resolved
Type: grilling
Wave: 1
Who: the owner
Blocked by: none

## What to do

Read the plan and answer its open decisions. Approving a file approves its recommendations unless you say otherwise.

- `../spec.md`: the contributor page. Its "Open for the owner": when a web page is not enough (agree it before the field test), the page's language, field rides as test data.
- `../database.md`: the tables, the policy audit, the review step's design. Its §12 lists eleven decisions.
- `../rule-changes.md`: the `.claude/CLAUDE.md` lines, the new words, ADRs 0003 and 0004. Item 1.8 asks you to pick A, B or C for the published map's reader.
- `../../studio-maps/spec.md`: its "Open for the owner": the default map, a stale draft.

## Acceptance checks

- Each open decision has an answer under `## Answer` below.
- The plan's PR ("Plan: contributors and the studio's three maps") is merged into `staging`, as written or amended.
- `Status: resolved`.

## Answer

The owner approved the plan on 17 Oct 2026 at about 03:50 UTC ("ok approve the plan, start building the studio maps"). That covers every recommendation in `../database.md` §12 and `../rule-changes.md` as written, option A for rule-changes 1.8 (the reader moves to `features/routes/published/`), and Playground as the studio's default map. Under this ticket's own rule that approving a file approves its recommendations, the open items in `../spec.md` and `../../studio-maps/spec.md` are approved as recommended: a gap threshold of more than 10% of riding minutes lost; field rides as test data only if they are the owner's own, with 300 m trimmed from each end; and the 7-day stale-draft rule. The page's language is left to the owner's design.

## Comments
