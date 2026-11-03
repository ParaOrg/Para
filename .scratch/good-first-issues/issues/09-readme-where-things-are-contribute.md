# 09: README "Where things are" forgets the contributor page

Status: resolved (#530)
Type: task
Size: small
Blocked by: none

## What is wrong

`README.md` has a table called "Where things are". The contributor page (`/contribute/`) is missing from it: `src/app/contribute/` and `src/features/contribute/` exist. The table says `src/app/` holds "the two front doors", `public-map/` and `studio/`, and lists four features under `src/features/` (routes, locator, published-map, studio). It also describes `src/shared/` as `ui/`, `hooks/` and `utils/`, but `src/shared/` also has `lib/` and `types/`.

The heading "Two pages, one published map" is also behind: there is a third page.

## What to do

In `README.md` only:

- `src/app/`: say three front doors and add `contribute/`
- add a row for `src/features/contribute/`: the contributor page, where someone records a ride on their phone, saves it and sends it. Use `CONTEXT.md` ("Contributor page") and `.claude/CLAUDE.md` ("Folder structure") for the wording
- `src/shared/`: add `lib/` (the one query client) and `types/` (generated database types)
- add a short paragraph after "`/studio/` is the editor ..." for the third page, `/contribute/`

Keep the README's plain style. Do not describe things you have not opened.

## Done looks like

- every folder the README names exists, and every folder under `src/app/`, `src/features/` and `src/shared/` is named
- `npm run format:check` passes (Prettier checks Markdown)

## Where to look

`README.md`, `.claude/CLAUDE.md`, `CONTEXT.md`, and `ls src/app src/features src/shared`.
