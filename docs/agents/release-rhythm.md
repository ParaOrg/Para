# Release rhythm and the back-merge

The owner decided both on 2026-11-10 (Q32, answered as Q138 to Q140).

## Why

Two branches, two kinds of commit:

- `staging` takes every finished pull request (`how-we-work.md`).
- `main` takes the releases (a pull request from `staging`, merged by the owner) and one commit no
  person makes: the nightly **Publish map**, which commits `public/data/` straight to `main` when
  the map changed (`main-protection.md`).

So `main` gets ahead of `staging` every night the map changes. The release for 0.4.0 found it so:
its release branch had to take `main` in first. The longer `staging` goes without `main`, the older
the map the editor and the suites see on `staging`, and the bigger the merge at the next release.

## The rhythm

- **A release every other Thursday, skipped when nothing is ready.** The hub writes the release
  summary (`.scratch/releases/`), tests `staging` as a whole (`npm run check` and every browser
  suite, as `how-we-work.md` says), and opens `staging` → `main`. The owner merges it. A contributor
  app release (`app-v*` tag) follows when the batch changed the app.
- **Before tagging: run the Contributor app workflow from `main` with `sign_dry_run` ticked, and
  tag only if its summary says the certificate matched.** In Actions it is "Contributor app",
  "Run workflow" on `main`, the box "Sign a build without publishing it". It builds and signs
  `main` and checks the key's fingerprint; it makes no Release and keeps no APK. A red dry run
  is fixed before the tag.
- **Nothing else goes to `main`.** A hotfix is a pull request into `staging` and an early release.

## The back-merge

- **After every push to `main`** (a publish or a release), `.github/workflows/back-merge.yml` opens
  one pull request taking `main` into `staging`, "Back-merge: main into staging", or brings the open
  one up to date. It is only `public/data/` and release merges, so it merges cleanly.
- **Its checks:** a pull request opened with the workflow's own token (`GITHUB_TOKEN`) starts no
  workflow, by GitHub's rule, so the workflow starts CI and the contributor app's workflow on the
  back-merge branch itself (`gh workflow run`, which GitHub allows). No other secret. When `main`
  holds the same files as `staging` (`git diff --quiet origin/staging origin/main`, the usual case
  right after a release), only CI is started: the contributor app's workflow, with its emulator
  runs (about 25 minutes, started by hand since they no longer run on pull requests), would test
  files already tested on `staging` and on the release pull request.
- **Merged by hand,** once its checks pass. A red back-merge means `main` and `staging` disagree,
  which someone should look at.
- **Same files, merged on the required checks** (the owner, 2026-11-25): when the back-merge holds
  the same files as `staging`, it merges once the three checks `staging`'s ruleset requires have
  passed ("What changed", "Build and the public map", "The editor"), without waiting for the rest
  of CI. Every file in it was already tested. A back-merge that changes any file, such as a
  nightly publish, waits for every check, as any pull request does.
