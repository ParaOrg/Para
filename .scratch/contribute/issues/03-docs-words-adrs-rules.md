# 03: Docs: the words, ADRs 0003 and 0004, the rule changes

Status: ready-for-agent
Type: task
Wave: 1, once 02 is resolved
Who: Sonnet
Blocked by: 02

## What to build

Apply `../rule-changes.md` as the owner approved it in 02, word for word or as amended there:

- `.claude/CLAUDE.md`: items 1.1 to 1.8.
- `CONTEXT.md`: the new words (the "Contributors" section, and the studio's words in "People and surfaces"), the three changed entries, the Avoid lines for the retired words.
- `docs/adr/0003-commuters-see-approved-work.md` and `docs/adr/0004-location-leaves-the-phone-only-by-choice.md`, status `accepted` with the approval's date.
- ADR 0001's amendment line.

Nothing else in those files changes. No em-dash asides; the glossary's own style.

## Files it owns

`.claude/CLAUDE.md`, `CONTEXT.md`, `docs/adr/`. No other session edits them in this wave.

## Acceptance checks

- Each approved item is in place; the PR body lists them against `rule-changes.md`'s numbers.
- Links between the ADRs and the glossary resolve.
- Docs only: CI runs nothing for it (`.github/workflows/ci.yml`).
- An Opus review against `rule-changes.md` before the owner sees it.

## Comments
