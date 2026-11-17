# claim_draft's base revision: SQL null that the generated types call a number

Status: needs-triage
Type: task
Priority: low

## Where

`src/features/studio/data/drafts.ts`, in `claimDraft`:
`p_base_revision: baseRevision as number`, with a single-line lint disable pointing here.

## Why it is kept

`claim_draft` takes `p_base_revision`, and a new subject has no base: the call must send SQL
null. The Supabase type generator types every function argument as non-null, so
`database.types.ts` says `number`, and that file is never edited by hand. Without the
assertion, the call does not typecheck.

## What would remove it

- Give the function a form the generator types as nullable (for example a separate argument
  list for a new subject, or a default of null that the call leaves out). That is a migration,
  applied by the owner.
- Or a newer generator that types nullable arguments.

## What behaviour would change

Nothing a contributor sees, if the function keeps answering the same. A migration changes the
database's function, so the studio's save path and the database checks would need to run
against it before it ships.
