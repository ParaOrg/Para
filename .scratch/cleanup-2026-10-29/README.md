# Cleanup 2026-10-29: the codebase-slop check's leftovers

The owner asked on 2026-10-29 whether Para has the usual "codebase slop" (implicit coupling, layer-first folders, duplication, representable illegal states, god files, shotgun surgery, layering violations, pass-through wrappers, validation not at the boundary), then: "plan and execute the cleanup; the contributor polish will be tomorrow".

The hub's check on `staging` (f27527b) found no layering violations, no layer-first folders, validation at every boundary it read (2 casts and no `!` in 548 source files) and no pass-through wrappers. What is left is below. The 2026-10-28 wave already split most of `.scratch/codebase-review/`'s oversized files.

**Cleanup means no change anyone sees**: no word, colour, size or step on a screen; nothing in the live database; nothing about sign-in; no published-map change. A refactor that needs a test's expectation changed is a behaviour change: the builder stops on it and says why.

## Builders, tonight

| Builder | Folders | Work, in order |
| --- | --- | --- |
| Contributor | `src/features/contribute/`, `src/app/contribute/`, its suites and unit checks | **C1.** Group the 75 files at the feature's root into concern folders (`git mv`, kebab-case; imports only; `index.ts` unchanged). **First, and merged before the owner's polish (target 01:00 UTC).** **C2.** Split what is left of `use-recording.ts` (337 lines) by job, per contribute-12. **C3.** List, no code: every other file over about 150 lines with more than one job. |
| Studio | `src/features/studio/`, `src/app/studio/`, the studio and drawing suites | **S1.** The workshop's overlapping flags (`isSaving`, `isSigningIn`, `isChangingPassword`, the derived `isResetting`, `workshop.tsx:194-197`): make the combinations that can't happen impossible to write. Some overlap is real (sign-in opens during a save), so this is a modelled state, not "one at a time". **S2.** `drawing/use-drawing.ts` (519): one `begin(...)` for the five start modes that repeat the same resets (studio-20). The drawing suites don't run on pull requests, so the builder runs them locally. **S3.** `workshop.tsx` (369): lift out what still has a job of its own. |
| Tests | `tests/e2e/`, `.github/workflows/ci.yml` (the studio-suite job only) | **T1.** One `waitFor` in `tests/e2e/lib/harness.mjs` that counts real time; the four suites' own copies use it. A wait that today passes because it overruns its number (save-test's ikot Delete took six minutes against "30 s") would fail after this: measure each from CI logs and set honest numbers; never shorten one. **T2.** Split `save-test.mjs` (2,355 lines) into parts run as matrix jobs, as `commuter-test` is, with "The editor" still requiring every part. |

## Not tonight

- **The drawing engine's refs** (`use-drawing.ts` keeps 12 values that must change in order): the most fragile part of the code. S2 removes repetition only; untangling the refs needs its own plan with the owner.
- **Retiring the drafts-off save path** (`data/routes-write.ts`, 365 lines, dead while `STUDIO_DRAFTS` is on): an owner decision (studio-20).
- **The tiles Worker's allowed addresses** are written by hand in `workers/tiles/src/cors.ts` and the README. Small; not worth a change tonight.
- **A copy-paste scanner** (jscpd) would need a new tool; ask the owner first.
