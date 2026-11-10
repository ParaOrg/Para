# Release rhythm and the back-merge (draft, Q32)

A draft for the owner. Nothing in it is in force until the owner says yes; the workflow beside it
(`.github/workflows/back-merge.yml`) runs only by hand until then.

## Why

Two branches, two kinds of commit:

- `staging` takes every finished pull request (`how-we-work.md`).
- `main` takes the releases (a pull request from `staging`, merged by the owner) and one commit no
  person makes: the nightly **Publish map**, which commits `public/data/` straight to `main` when
  the map changed (`main-protection.md`).

So `main` gets ahead of `staging` every night the map changes. The release for 0.4.0 found it so:
its release branch had to take `main` in first (`Merge origin/main (Publish map …) into
release/app-v0.4.0`). The longer `staging` goes without `main`, the older the map the editor and
the suites see on `staging`, and the bigger the merge at the next release.

## The proposal

1. **Back-merge after every push to `main`.** When `main` moves (a publish or a release), a
   workflow opens one pull request taking `main` into `staging`, or updates the open one. It is
   only `public/data/` and release merges, so it merges cleanly; the hub merges it once its CI is
   green, as any other.
2. **A release when a batch is done, at most weekly.** The hub writes the release summary
   (`.scratch/releases/`), tests `staging` as a whole (`npm run check` and every browser suite, as
   `how-we-work.md` says), and opens `staging` → `main`. The owner merges it. A contributor app
   release (`app-v*` tag) follows when the batch changed the app.
3. **Nothing else goes to `main`.** A hotfix is a pull request into `staging` and an early release.

## The owner's choices

- **Cadence:** a fixed day (the hub's pick: Thursday, so a release has Friday to be watched), or
  whenever a batch is done (today's way).
- **How the back-merge gets its CI.** A pull request opened with the workflow's own token
  (`GITHUB_TOKEN`) starts no workflow, by GitHub's rule, so its checks would never run. Two ways:
  - **A (the hub's pick):** the workflow also starts CI and the contributor app's workflow on the
    back-merge branch (`gh workflow run`, which GitHub does allow), and the hub merges once green.
    No new secret.
  - **B:** a fine-grained token, or the publish's deploy key, opens the pull request so its checks
    start by themselves. One more secret with write access to look after.
- **Merge by hand or by itself.** The hub's pick is by hand: a red back-merge means `main` and
  `staging` disagree, which someone should look at.
