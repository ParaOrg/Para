# Protecting `main`

`main` takes pull requests only, with CI passing, and only admins merge. One thing has to push to it directly: the nightly **Publish map** workflow (`.github/workflows/publish-map.yml`). GitHub rulesets cannot list the GitHub Actions app as a bypass actor, but they can bypass a **deploy key**. So the publish pushes over SSH with a repository deploy key, and the rulesets list the deploy key as a bypass.

Anything that adds a deploy key to this repo gets the bypass (the bypass has no per-key id). Keep "Nightly publish" the only one with write access.

## The order

1. This change merges into `staging`.
2. The owner adds the deploy key and the secret (below). They do nothing until the workflow uses them, so this is safe to do first.
3. A release PR takes `staging` into `main` (the schedule runs from `main`, so nothing changes before this). Doing step 2 first means no nightly run fails in between.
4. The owner runs **Publish map** by hand once, **Force off**. It must go green. (Without the secret the run fails on purpose and opens "The map needs a look".)
5. The hub turns on rulesets A and B (below), then deletes the old ruleset 25882502.
6. The next nightly run is the proof: its commit lands on `main` while the rules are on.

## The owner's steps

An ed25519 key pair is a public half (goes to GitHub as the deploy key) and a private half (goes to GitHub as a secret). Nobody else ever sees the private half.

1. Open PowerShell in a folder you can delete afterwards (for example `cd $env:TEMP`).
2. Make the pair:

   ```powershell
   ssh-keygen -t ed25519 -C "parapo-publish" -f parapo-publish -N '""'
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

Two rulesets, not one: an admin bypass covers every rule in its ruleset, so putting the admin role in the ruleset with the CI rule would let admins merge with CI red. `5` is the built-in **admin** repository role. `15368` is the GitHub Actions app, the source of the CI checks. A `DeployKey` actor takes `actor_id: null`, and `pull_request` bypass mode does not apply to it, so it uses `always`. "Build and unit checks" is not listed: the two summary checks depend on it.

A ruleset "main: no deleting, no force-push" (id 25882502) already exists. Ruleset A replaces it: create A, check it is active, then delete 25882502.

**A, "main: pull requests and CI"**: only the deploy key bypasses.

```json
{
  "name": "main: pull requests and CI",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
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

**B, "main: only admins merge"**: the `update` rule blocks everyone who is not in its bypass list; admins may update `main` only through a pull request.

```json
{
  "name": "main: only admins merge",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "pull_request" },
    { "actor_id": null, "actor_type": "DeployKey", "bypass_mode": "always" }
  ],
  "rules": [{ "type": "update", "parameters": { "update_allows_fetch_and_merge": false } }]
}
```

Create each with `gh api -X POST repos/ParaOrg/Para/rulesets --input <file>.json`; the old ruleset's id comes from `gh api repos/ParaOrg/Para/rulesets`, and `gh api -X DELETE repos/ParaOrg/Para/rulesets/25882502` removes it.

The shapes come from GitHub's REST reference, "Create a repository ruleset": <https://docs.github.com/en/rest/repos/rules?apiVersion=2022-11-28#create-a-repository-ruleset>. For `bypass_actors` it says `actor_type` can be `DeployKey` ("If actor_type is DeployKey, this should be null" for `actor_id`) and that `pull_request` bypass mode "is not applicable for the DeployKey actor type".

## Why CI skips the publish commit

A deploy-key push starts other workflows, unlike `GITHUB_TOKEN`. `ci.yml` ignores a push that only touches `public/data/**` (`paths-ignore`): a full run on `main` includes the drawing suites, which go through the shared OSRM router, for a file the publish already checked with `check-map-data.mjs`; CI's own nightly run at 05:00 covers `main` right after. Pull requests are not filtered. The contributor app's release runs on `app-v*` tags only, and nothing in the publish pushes a tag.
