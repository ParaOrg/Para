# 04: Tell the owner when something breaks

Status: ready-for-agent
Type: task
Who: Opus

## The problem

Nothing tells anyone when Para breaks. A blank map, a publish that stopped, or a backup that failed is found by a commuter, or not at all. This adds alarms without adding a service: GitHub Actions does the checking, and a GitHub issue does the telling. GitHub emails the owner about new issues, and the GitHub app shows them.

## What to build

1. **A watch,** `.github/workflows/watch.yml`, on a schedule every 15 minutes. GitHub may run it late; that's acceptable. It checks, with plain `curl` or a small Node script in `scripts/watch/`:
   - `https://www.para-commute.org/` answers 200 with the app's page, and the bare domain still redirects to it;
   - `https://www.para-commute.org/data/index.v5.json` answers 200, parses, and its `published_at` is less than 36 hours old;
   - one tile at `https://tiles.para-commute.org` (a fixed z/x/y over Metro Manila) answers 200, and so does one style;
   - the last successful run of `backup.yml` is less than 8 days old, and of `tiles.yml` less than 35 days (read with the workflow's own `GITHUB_TOKEN`, `actions: read`).
2. **When a check fails, open one issue per problem** with the label `alert`: what failed, when, the answer received, and the first thing to try (link the runbook in `docs/operations.md` once 05 lands).
   - Update the open issue on later failures; never open a duplicate.
   - Close it with a comment when the check passes again.
3. **Failed jobs:** `publish-map.yml`, `backup.yml` and `tiles.yml` each get a last step, `if: failure()`, that opens or updates an `alert` issue naming the run.
   - Share one script with the watch.
   - Don't change anything else in those workflows, and don't run them.
4. **Keep schedules alive.** GitHub turns off scheduled workflows after 60 days without activity in a public repository (`publish-map.yml:43`). Find out whether the watch's runs count as activity. If they don't, say so and propose the smallest fix. Don't build it.

## Rules

- No new service or dependency. Per check: 3 tries, 20 seconds apart, before calling it failed.
- At most about 100 tile requests a day, out of the 100,000 the tiles Worker gets free.
- The watch never writes to anything except issues.
- Test the issue logic with unit checks (`tests/unit/`), feeding it fake answers: down, back up, still down, flapping.

## Files it owns

`.github/workflows/watch.yml`, `scripts/watch/`, the failure steps in the three workflows, and their unit checks.

## Acceptance checks

- A manual run (`workflow_dispatch`) on the PR's branch passes every check against the live site.
- A run with one check pointed at a wrong address opens exactly one issue, and fixing it closes the issue.
- The PR says what the owner must switch on so the issues reach their email and phone: GitHub → Settings → Notifications, and watching the repository.

## Comments
