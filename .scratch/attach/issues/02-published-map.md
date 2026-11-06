# 02: Published map (format and reader)

Status: needs-info
Type: task
Blocked by: 01

Needs the owner's answer to open questions 4 and 5 (backward compatibility, size) and the owner's Yes.

## What to build

The publisher writes the attached stretches into the published map, and `features/routes/published/` reads them.

- Index: each direction lists its stretches (side, terminal hotspot, join distance). Line files carry each stretch's line.
- Old copies keep working: an old reader ignores the new fields, and a new reader accepts a file without them (open question 4).
- The publisher and reader follow the existing schema-number rule.

## Files it owns

- `scripts/publish/` (assemble, line file, write files, guards)
- `src/features/routes/published/` (schemas, fetchers)
- `src/features/routes/model/` (the stretch type, no React)
- `tests/unit/` for the format

## Acceptance checks

- `npm run check` passes, including the size guard: the PR quotes the public page's gzipped size before and after (412.3 of 413 kB today).
- A unit check reads a file with stretches, and a file without; an old-shape file still parses.
- The shrink guard and the privacy probe still pass.
- Nothing is published for a draft stretch.
