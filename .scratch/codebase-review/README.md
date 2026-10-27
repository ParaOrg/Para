# Codebase review 2026-10-28

Four Opus sessions each read one area of `staging` (63406c8) and wrote a report:

- [public-map.md](public-map.md): the public map and routes, 14 findings.
- [studio.md](studio.md): the studio and the database, 20 findings.
- [contribute.md](contribute.md): the contributor page and app, 13 findings.
- [platform.md](platform.md): the offline worker, build, Workers and CI, 16 findings.

The hub checked the worst findings against the code and the live data before sorting them. For example, 5 of the 6 terminals in the published map have no links, so public-map-01 is real.

The owner's rule for the night of 2026-10-27 was "fix the safe ones". A fix is safe when it changes nothing people see, nothing in the database and nothing about sign-in. Builders fix these, an independent Opus review checks each one, and the hub merges into `staging` only when CI is green. Everything else waits for the owner.

## Fix now (no owner decision)

| Builder | Findings |
| --- | --- |
| Studio | studio-12 and studio-15 (two-editors suite: real waits, checks that can fail); studio-05 (Close the loop after Extend); studio-07 (false "This draft changed"); studio-19 (page directions by id); studio-04, inert and `isSaving` reset only (the dialog semantics come later); studio-06 (a late follow is refused); studio-10 (one QueryClient, session as "checking"); studio-17 (Zod for the stored drawing and the router's reply); studio-14, its first half (the fake refuses unknown RPCs) |
| Public map | public-map-02 (the SWITCH pick lands on the other direction's row); public-map-13 (doubled comments); public-map-14 (the commuter's position kept in a ref); public-map-07 (casts and the style check); public-map-06, its first half (skips are counted and printed) |
| Platform | platform-04 (`/contribute/*` can't be framed); platform-05 (the deploy key only in the commit step); platform-06 (CI scope for Turnstile and the locator); platform-07 (tile addresses carry the build); platform-08 (the offline worker's code to the standard); platform-11 (the tiles spike retired); platform-12, its renames only; a CI job that runs `supabase/verify` and the review suites against a Postgres service (studio-14 second half, contribute-10, platform-14 third part) |
| Contributor | contribute-13 (dead `putFix`); contribute-08 (unit tests for the import after a kill, and one shared per-fix function); contribute-04, the thinning only (a ride over 14,400 fixes is thinned evenly instead of refused; no new words on screen); contribute-09 (the native log read from a time onwards) |

## The owner decides

Most important first.

1. **Terminals' cards are empty** (public-map-01, and studio-03's link rewrite as the likely cause). Commuters see it today. Decide whether the card should count a route whose head or tail is the terminal. The hub also looks into why the links are missing.
2. **Signing a contributor app from any tag** (contribute-02). This is a GitHub setting (a tag ruleset) plus a check in the workflow.
3. **The deploy key and backup secrets are usable from any branch** (platform-03). This is a GitHub setting: move them into Environments limited to `main`.
4. **Sunday's backup will fail** (platform-02) until the public key is on `main`. Merge the next release, or a one-file PR into `main`, before Saturday 18:00 UTC.
5. **Delete approves the editor's other unreviewed changes** (studio-01), and **Edit starts from the approved version and overwrites the editor's own draft** (studio-02).
6. **A dead session uploads as a nameless identity** (contribute-01), and **a shared phone sends one person's rides as the next person's** (contribute-03).
7. **Contributors can read the editors' private notes** (contribute-05), and **editors can rewrite any column of their draft** (studio-08). These need database changes, written as migrations for the owner to apply.
8. **Any editor can discard another's draft** (studio-09): who may?
9. **Auto-save after two minutes also uploads** (contribute-07): change the code or ADR 0004?
10. **Words and looks.**
    - A crash screen for the public map (public-map-03).
    - A plain "map failed to load" with Reload (public-map-04).
    - "No routes stop here yet" (public-map-08).
    - "Removed from Para" instead of "by an editor" (contribute-06).
    - Editor-facing error sentences (studio-18).
11. **Product.**
    - A way into routes without tapping the map (public-map-05).
    - Trips in the address (public-map-10).
    - Retiring the old map shapes (platform-16).
    - Retiring the old `parapo` Worker on the old account (platform-15).
    - Which branch the `para` Worker builds from until the release (platform-01).
12. **The link rewrite on approval** (studio-03). This is a database change.

## Later (big, and would clash with tonight's fixes)

- File splits: studio-20, platform-10, contribute-12.
- Comment history pass: platform-09.
- Drafts-on browser suites: studio-13.
- CI speed: platform-13.
- The router queue: studio-11.
- Card state without an effect: public-map-09.
- Studio-only files moved out of routes: public-map-11.
- ESLint for `.mjs` files: platform-12's second half.
- The rest of public-map-06 and platform-14.

Regenerating the database types (studio-16, contribute-11) waits until the Supabase connector sees the Para org again, so the types come from the live database.
