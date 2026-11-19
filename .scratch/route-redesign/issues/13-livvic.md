# 13: Livvic everywhere

Status: ready-for-agent
Type: task
Blocked by: 01

## What to build

- **The font.** Livvic replaces SN Pro across the whole app (README, decision 2).
- **Self-hosted.** The woff2 files come from Livvic's official source and sit in `src/design-system/foundation/` as SN Pro's do today. There is no Google Fonts link, so the CSP is unchanged.
- **The licence.** Livvic's licence file (OFL) sits beside the fonts.
- **Only the weights the designs use** are shipped.
- **SN Pro's files go** in the same pull request.

## Done when

- Every page draws in Livvic, offline too: the service worker precaches the new files.
- The build's size guard still passes, and the pull request lists the font bytes before and after.
- No request leaves for a font host.
