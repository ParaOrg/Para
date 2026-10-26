# Protecting `main`

`main` takes pull requests only, with CI passing, and only admins merge. One thing has to push to it directly: the nightly **Publish map** workflow (`.github/workflows/publish-map.yml`). GitHub rulesets cannot list the GitHub Actions app as a bypass actor, but they can bypass a **deploy key**. So the publish pushes over SSH with a repository deploy key, and the ruleset lists the deploy key as its one bypass.

Anything that adds a deploy key to this repo gets the bypass (the bypass has no per-key id). Keep "Nightly publish" the only one with write access.

## The order

1. This change merges into `staging`.
2. A release PR takes `staging` into `main` (the schedule runs from `main`, so nothing changes before this).
3. The owner adds the deploy key and the secret (below).
4. The owner runs **Publish map** by hand once, **Force off**. It must go green. Until the secret exists the run fails on purpose and opens "The map needs a look".
5. The hub turns on the full rules (below).
6. The next nightly run is the proof: its commit lands on `main` while the rules are on.

## The owner's steps

An ed25519 key pair is a public half (goes to GitHub as the deploy key) and a private half (goes to GitHub as a secret). Nobody else ever sees the private half.

1. Open PowerShell in a folder you can delete afterwards (for example `cd $env:TEMP`).
2. Make the pair:

   ```powershell
   ssh-keygen -t ed25519 -C "parapo-publish" -f parapo-publish -N ""
   ```

   This writes two files: `parapo-publish` (private) and `parapo-publish.pub` (public).
3. Add the public key: github.com/ParaOrg/Para → **Settings** → **Deploy keys** → **Add deploy key**.
   - Title: `Nightly publish`
   - Key: paste the whole contents of `parapo-publish.pub` (`notepad parapo-publish.pub`).
   - Tick **Allow write access**.
   - **Add key**.
4. Add the private key: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
   - Name: `PUBLISH_DEPLOY_KEY`
   - Secret: paste the whole contents of `parapo-publish` (`notepad parapo-publish`), including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines and the final newline.
   - **Add secret**.
5. Delete both files from the computer: `Remove-Item parapo-publish, parapo-publish.pub`. Empty the Recycle Bin if you used Explorer.

## The hub's step afterwards

Replace the ruleset that blocks only deleting and force-pushing `main` with the full one. `5` is the built-in **admin** repository role. `15368` is the GitHub Actions app, the source of the CI checks. The `DeployKey` actor takes `actor_id: null`, and `pull_request` bypass mode does not apply to it, so it uses `always`.

```json
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "pull_request" },
    { "actor_id": null, "actor_type": "DeployKey", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "update", "parameters": { "update_allows_fetch_and_merge": false } },
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
          { "context": "Build and unit checks", "integration_id": 15368 },
          { "context": "Build and the public map", "integration_id": 15368 },
          { "context": "The editor", "integration_id": 15368 }
        ]
      }
    }
  ]
}
```

Apply it with `gh api -X PUT repos/ParaOrg/Para/rulesets/<id> --input ruleset.json` (the id from `gh api repos/ParaOrg/Para/rulesets`).

The shapes come from GitHub's REST reference, "Create a repository ruleset": <https://docs.github.com/en/rest/repos/rules?apiVersion=2022-11-28#create-a-repository-ruleset>. For `bypass_actors` it says `actor_type` can be `DeployKey` ("If actor_type is DeployKey, this should be null" for `actor_id`) and that `pull_request` bypass mode "is not applicable for the DeployKey actor type".

The `update` rule blocks direct pushes to `main` for everyone not in the bypass list; the admin role's `pull_request` mode lets an admin merge a PR, not push.

## Why CI skips the publish commit

A deploy-key push starts other workflows, unlike `GITHUB_TOKEN`. `ci.yml` ignores a push that only touches `public/data/**` (`paths-ignore`): a full run on `main` includes the drawing suites, which go through the shared OSRM router, for a file the publish already checked with `check-map-data.mjs`; CI's own nightly run at 05:00 covers `main` right after. Pull requests are not filtered. The contributor app's release runs on `app-v*` tags only, and nothing in the publish pushes a tag.
