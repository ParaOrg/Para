# Protecting `staging`

`staging` takes every finished pull request, from about four sessions and from contributors outside the team. Until this ruleset is on, GitHub lets a pull request merge there with its checks red, and lets the branch be deleted or force-pushed. `main` has had its rules since `main-protection.md`; this is the same idea for `staging`, one ruleset, lighter.

**Not on yet.** Turning it on is the owner's step (below); the rest of this page is what to paste and how to prove it.

## What it does

- `staging` can't be deleted or force-pushed.
- A change reaches `staging` only through a pull request. No approval is asked for: sessions still merge their own finished work (`how-we-work.md`).
- A pull request can merge only once CI's three summary checks have passed: "What changed", "Build and the public map" and "The editor". They are the same three `main` asks for.
- One thing still pushes to `staging` directly: the nightly **Publish map**, which copies `public/data/` from `main` onto `staging` with the deploy key (`.github/workflows/publish-map.yml`). So the deploy key is the ruleset's one bypass, as it is on `main`. That push touches only `public/data/`, which CI skips (`paths-ignore`).

Unlike `main`, there is no second ruleset for "only admins merge": anyone who may write to the repository merges into `staging`, once the checks pass.

## The ruleset

`15368` is the GitHub Actions app, the source of the CI checks. A `DeployKey` actor takes `actor_id: null`, and its bypass mode is `always` (`main-protection.md` quotes GitHub's reference for both).

```json
{
  "name": "staging: pull requests and CI",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/staging"], "exclude": [] } },
  "bypass_actors": [{ "actor_id": null, "actor_type": "DeployKey", "bypass_mode": "always" }],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "What changed", "integration_id": 15368 },
          { "context": "Build and the public map", "integration_id": 15368 },
          { "context": "The editor", "integration_id": 15368 }
        ]
      }
    }
  ]
}
```

## The owner's steps

Pick one of the two ways.

**With the command line.** Save the JSON above as `staging-ruleset.json`, then:

```powershell
gh api -X POST repos/ParaOrg/Para/rulesets --input staging-ruleset.json
```

The answer is the ruleset as GitHub stored it, with its `id`. Keep the id: the later step needs it.

**By clicking.** github.com/ParaOrg/Para → **Settings** → **Rules** → **Rulesets** → **New ruleset** → **Import a ruleset**, and choose `staging-ruleset.json`. Check that **Enforcement status** says Active and that the target is the branch `staging`, then **Create**.

## How to prove it

Do these once, the same day the ruleset goes on.

1. **A red pull request can't merge.** Open a test pull request into `staging` that breaks one unit check (change an expected value in any file under `tests/unit/`). Wait for CI. "Build and the public map" goes red and the merge button is blocked. Close the pull request and delete its branch.
2. **The nightly publish still lands.** Run **Publish map** by hand (Actions → Publish map → Run workflow) with **Force off**. It must go green. On a day the map changed, a commit "Publish map … (data only, from main)" appears on `staging`; on an unchanged day the run says "Staging already has this map."
3. **The back-merge still merges.** The next "Back-merge" pull request (`release-rhythm.md`) shows the three checks and merges once they pass.

If step 2 fails with "Staging could not be updated", the deploy key is missing from the bypass list: turn the ruleset off (**Enforcement status** → Disabled), fix the list, turn it on again.

## A later step: the secrets scan

After the ruleset has been on for a few days with no trouble, add a fourth required check, "No secrets in the history" (`.github/workflows/security.yml`). It is left out of the first step so that a new rule and a new check don't arrive together.

Add this line to `required_status_checks` and send the whole ruleset again with `gh api -X PUT repos/ParaOrg/Para/rulesets/<id> --input staging-ruleset.json`:

```json
{ "context": "No secrets in the history", "integration_id": 15368 }
```

**Never require "No known holes in production dependencies"** (the `npm audit` check). It can turn red with no change on Para's side, the day a new advisory is published for a package Para uses, and as a required check that would block every merge until the package is updated. It stays a warning the nightly run shows.
