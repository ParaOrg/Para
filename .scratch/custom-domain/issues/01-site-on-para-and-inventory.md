# 01: The site on Para, and what Vercel holds

Status: ready (owner)
Type: task
Who: Owner; the hub checks
Blocked by: –

## What to do

**The site Worker in the Para account.** Workers & Pages → Create → Import a repository → `ParaOrg/Para`:

| Field | Value |
| --- | --- |
| Project name | `parapo` (must match `wrangler.jsonc`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |
| Path | empty (the repo root) |
| Preview builds | on (this is what gives `staging` its address) |
| Variables | none (`.env.production` holds them) |

Then Settings → Build → Branch control: production branch `main`.

**Sign-in on the new addresses.** Turnstile's widget hostnames get `parapo.para-ph-info.workers.dev` and `staging-parapo.para-ph-info.workers.dev`; Supabase → Authentication → URL Configuration gets `https://parapo.para-ph-info.workers.dev/**` and `https://staging-parapo.para-ph-info.workers.dev/**` as redirect URLs.

**What Vercel holds.** In the Vercel account that owns `para-commute.org`: the project it is attached to, and a screenshot of the domain's DNS records (all of them, especially MX and TXT).

## Acceptance checks

- The hub opens `https://parapo.para-ph-info.workers.dev` and `https://staging-parapo.para-ph-info.workers.dev`: the map draws, the tiles load (the tiles Worker allows both, #420), the studio's sign-in shows Turnstile.
- The list of Vercel's records is written under Comments, with which ones 02 copies.

## Comments
