# 01: Stop Cloudflare's build minutes

Status: resolved (superseded: GitHub Actions deploys both Workers, #1272 and #1273; Workers Builds is off on `para` and `para-tiles`)
Type: task
Who: the owner
Blocked by: none

## What to do

Clicks in the Cloudflare dashboard (Para account). Can be done today; it changes nothing a visitor sees.

1. **`para`:** Workers & Pages → `para` → Settings → Build → **Disconnect** the Git repository. The last deployment keeps serving `www.para-commute.org` until ticket 10, and stays for the rollback. Do not delete the Worker, its route or its secrets.
2. **`para-tiles`:** Workers & Pages → `para-tiles` → Settings → Build. If a Git repository is connected, set **Build watch paths** → Include: `workers/tiles/*`. (If none is connected, nothing to do: the tiles Worker is deployed by hand.)
3. Tell the hub which of the two had a build connected.

## Acceptance checks

- [ ] A PR that touches no file under `workers/tiles/` shows no "Workers Builds" check.
- [ ] `https://www.para-commute.org/` still answers Coming soon; `https://tiles.para-commute.org/styles/positron` still answers JSON.

## Comments

- 2026-11-28: Resolved, superseded by the owner's choice of 2026-11-27 (GitHub Actions → Cloudflare, `spec.md`). `deploy.yml` and `deploy-tiles.yml` build and deploy both Workers (#1272, #1273), and Workers Builds' builds are off on both `para` and `para-tiles` (the owner, through the hub, 2026-11-28). The acceptance checks above were never run as written. The first one does not hold yet: the repository is still connected, so each pull request still shows a "Workers Builds: para" check, skipped and red (#1299, #1300). It goes away once the repository is disconnected in each Worker's Settings → Build.
