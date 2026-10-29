# 04: Tell the owner when something breaks

Status: resolved
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

**2026-10-28, the builder.** Built as asked, with these choices to check:

- **The failure step is a job.** `publish-map.yml`, `backup.yml` and `tiles.yml` each end with an `alert` job, `needs:` the main job and `if: failure()` (in `tiles.yml` also not on a pull request, whose failure is ordinary CI). As a job it has its own `issues: write`, so the backup and tiles jobs keep their read-only tokens, and a run that fails at its checkout is still reported. Nothing inside the existing jobs changed. `backup.yml`'s header said the run "opens no issue"; it now says none of its output goes in one, since the alert names the run only.
- **The map's age is the publish's age.** The index's `published_at` moves only when the map's content does (`scripts/publish/assemble.mjs`), so a quiet week with healthy nightly runs is normal. The watch checks that the index answers and parses, and separately that the last successful Publish map run (schedule or "Run workflow") is under 36 hours old.
- **A failed publish has two issues on purpose.** "The map needs a look" keeps the run's log and the data report and closes on the next publish with nothing to report; the `alert` is the same failure in the one list the owner watches, and its first thing to try points at the other. Both close on their own.
- **Runbooks.** Every alert links its section of `docs/operations.md` (ticket 05) on `main`.
- **Who closes a failed run's alert.** The watch: once the workflow's newest non-pull-request run has passed, it closes that workflow's alert. It never opens one; the failed run does.
- **Flapping.** A problem that comes back within a day reopens its own issue instead of opening another. A failure that lasts edits the issue's body (no email); a failed run, being an event, also comments.
- **Tiles budget.** The style and then the tile are checked on every other scheduled run (even run numbers): about 48 + 48 = 96 Worker requests a day. While failing, the style is retried, but the tile is fetched at most once per run and never when the style fails, so tile requests stay at 48 a day. A manual run always checks them.
- **What counts as a tiles build:** a successful `schedule` or `push` run (the two that upload). A backup: a successful `schedule` or `workflow_dispatch` run on any branch.

**The 60-day question (answered, not built).** GitHub turns off scheduled workflows in a public repository after 60 days with no repository activity ([GitHub docs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)). GitHub does not define "activity"; in practice it means commits to the repository. Workflow runs do not count, and neither do issues or comments, so **the watch's runs do not keep anything alive, and the watch itself would be turned off too**: after 60 days with no commit, the watch, the publish, the backup and the tiles build stop together, and the only warning is GitHub's email before it happens. Today the publish commits whenever the map changes, so the risk is a quiet stretch with no edits and no code.

The smallest fix: a weekly step in `watch.yml` that calls GitHub's "enable a workflow" endpoint (`PUT /repos/ParaOrg/Para/actions/workflows/<file>/enable`) for `watch.yml`, `publish-map.yml`, `backup.yml` and `tiles.yml`. It needs `actions: write` on the watch's token, so the watch would write to more than issues, which is why it is not built. That call is what the widely used keepalive actions now do instead of empty commits. Not tried here, because calling it is a write to Actions' settings; trying it once on `watch.yml` is the first step if the owner wants it.

**For the owner, so the alerts reach you:** on GitHub, the repository's **Watch** button → **All Activity** (or Custom → Issues), and in **Settings → Notifications** turn on Email and Mobile for "Participating, @mentions and custom" and for "Watching". Install the GitHub app on your phone and sign in. Issues opened by the workflow come from `github-actions[bot]`, so they reach you through watching, not through a mention.
