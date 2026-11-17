# Refresh the lockfile once picomatch ships a fix for GHSA-fc5q-39xc-vjpf

Status: blocked
Type: task
Priority: low
Blocked by: a picomatch release outside the advisory's range

## What it is

[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), published 2026-11-17:
picomatch up to 4.0.7 can be made slow (ReDoS) by a glob with single-branch repeated extglobs.
From that day npm audit counts 30 (1 low, 12 moderate, 17 high) instead of 17 (1 low, 16
moderate), and the Security workflow's report-only "Known holes in the dev tools" job fails its
high-level step. The workflow itself stays green.

- All 17 highs are this one advisory, reached through vite, vite-plugin-pwa (workbox-build,
  tinyglobby), Storybook (react-vite, addon-docs, @rollup/pluginutils), typescript-eslint, fdir,
  and eslint-plugin-check-file (micromatch, which holds picomatch 2.3.2).
- Dev, build, lint and Storybook tooling only: `npm audit --omit=dev` finds 0, and the built
  `dist/` carries none of picomatch, minimatch, micromatch, tinyglobby or serialize-javascript.
  Every glob these tools read is written in our own config.
- There is no fix yet: picomatch's latest release is 4.0.7, inside the range. npm audit's
  suggested fixes for the highs are semver-major downgrades (vite 6.2.7, @storybook/react-vite
  8.5.3, vite-plugin-pwa 1.1.0), not upgrades.
- `npm audit fix` without `--force` today changes only the lockfile, but leaves 26
  (3 moderate, 23 high): the newer typescript-eslint and eslint-plugin-import-x reach the same
  picomatch.

## What to do

When picomatch publishes a release outside the range (and micromatch, or eslint-plugin-check-file,
one that takes it):

1. With the owner's OK, one lockfile-only refresh: `npm audit fix` without `--force`, so
   package.json is unchanged. It also picks up the older moderates (minimatch, glob) and the low
   (serialize-javascript 7.1.4) where their parents allow it.
2. `npm run check`, and compare `npm audit` before and after in the pull request.
3. Close this ticket with the new count.

No major bump for this advisory; the holds in #1050 stand.
