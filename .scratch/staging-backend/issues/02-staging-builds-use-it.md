# 02: Staging builds use the staging project

Status: needs-info (waits on 01)
Type: task
Who: Opus

## What to build

- **Staging builds talk to `para-staging`;** `main` keeps `.env.production` exactly as it is.
  - Prefer a committed `.env.staging` holding the staging project's public URL and publishable key, and the same flags as `.env.production`, built with `vite build --mode staging` through Workers Builds' preview build command.
  - Fall back to the preview trigger's build variables only if a committed file can't work, and say why.
- **A build check in `scripts/checks/build/`:**
  - a production build must name the live project's URL and never the staging one;
  - a staging build, the reverse.
- **Docs:** `docs/operations.md` and the README name both projects and say which build uses which.
- **The owner's part:** the exact Workers Builds settings to change (preview build command), as steps in the PR.

## Rules

No secret in any file. Don't change what `main` builds.

## Done when

The staging site signs in to `para-staging`, a test draft there doesn't appear in the live database, and the build check fails on purpose when the two URLs are swapped.

## Comments
