# 15: A dry run of the app's signing, with nothing published

Status: needs-triage
Type: task
Who: an agent for the workflow; the owner to press the button and, if needed, change one setting
Blocked by: nothing. Wanted before app-v0.4.1 is tagged

## Why

Since #949 the release APK is built in one job and signed in another (`build-release`, then
`sign`, in `.github/workflows/contributor-app.yml`; ADR 0006). Both run only for an `app-v*` tag,
and `release-files` and `publish` follow them. So the first time the new `sign` job runs at all
is the next real release: if it cannot read its key, sign, or match the recorded fingerprint,
that is found at the release, with the tag already pushed.

There is no way to try it today. `workflow_dispatch` takes no input, and on a branch it runs the
debug build and the emulator jobs only.

## What to build

A manual dry run: `workflow_dispatch` with one input (say `sign_dry_run`, off by default). It
signs code from `main` only: the dry run's jobs carry a job-level guard,
`github.ref == 'refs/heads/main'`, so a dispatch from any other branch never reaches the job that
holds the key. With the input on, from `main`, and only then:

1. `build-release` runs without a tag. Its release guard (`scripts/publish/release-guard.mjs`:
   the tag is on main, CI passed, the version is the next one) is skipped for a dry run and
   nothing else in the job changes: the key's files are still checked and the APK is built
   unsigned.
2. `sign` runs as it does for a release: the same environment, the same steps, the signature
   verified and its certificate matched against `android/release-key.sha256`.
3. `release-files` and `publish` do not run. The signed APK is not uploaded as an artifact
   either: the dry run proves the steps and keeps nothing.
4. The run's summary says it was a dry run and whether the fingerprint matched.

A unit check reads the workflow, as `tests/unit/workflow-concurrency-test.mjs` does, and holds
three things: `build-release` and `sign` can only run for an `app-v*` tag or for a dry run on
`main`; `publish` and `release-files` can only run for an `app-v*` tag; and the dry run's input is
off by default.

## For the owner

- Run it once from the Actions tab on `main` after this merges, and again before each release
  if the signing job or its key changed.
- The `app-release` environment holds the key's passphrase. Its deployment branches and tags
  should allow `main` and `app-v*` tags, and nothing else: that is what lets a dry run from
  `main` sign, and what keeps every other branch away from the key whatever a workflow says. It
  is a repository setting only the owner can see and change (Settings, Environments,
  app-release); the PR that builds the dry run names it and does not change it.

## Not in scope

- Publishing anything, or making a test release.
- Changing how the key is kept or what `sign` does for a real release.

## Comments
