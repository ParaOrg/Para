# 01: The site on Para, and what Vercel holds

Status: resolved (the site serves from Para and sign-in works on it; the records are listed below from the public DNS and Namecheap)
Type: task
Who: Owner; the hub checks
Blocked by: –

## What to do

**The site Worker in the Para account.** Workers & Pages → Create → Import a repository → `ParaOrg/Para`:

| Field | Value |
| --- | --- |
| Project name | `para` (must match `wrangler.jsonc`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |
| Path | empty (the repo root) |
| Preview builds | on (this is what gives `staging` its address) |
| Variables | none (`.env.production` holds them) |

Then Settings → Build → Branch control: production branch `main`. Until `staging` is first released to `main`, the production branch is `staging`, so the Worker has something to serve; it switches to `main` after that release.

**Sign-in on the new addresses.** Turnstile's widget hostnames get `para.para-ph-info.workers.dev` and `staging-para.para-ph-info.workers.dev`; Supabase → Authentication → URL Configuration gets `https://para.para-ph-info.workers.dev/**` and `https://staging-para.para-ph-info.workers.dev/**` as redirect URLs.

**What Vercel holds.** In the Vercel account that owns `para-commute.org`: the project it is attached to, and a screenshot of the domain's DNS records (all of them, especially MX and TXT).

## Acceptance checks

- The hub opens `https://para.para-ph-info.workers.dev` and `https://staging-para.para-ph-info.workers.dev`: the map draws, the tiles load (the tiles Worker allows both, #420), the studio's sign-in shows Turnstile.
- The list of Vercel's records is written under Comments, with which ones 02 copies.

## Comments

**2026-10-28, the hub.**

- **The site on Para:** `para` serves `https://para.para-ph-info.workers.dev` from GitHub (production branch `staging` until the next release). The map draws from `para-tiles`. Turnstile has the new hostname. Supabase has `https://para.para-ph-info.workers.dev/**` as a redirect URL. The owner signed in to the studio there.
- **Namecheap** (the owner's screenshot): registered until 2026-12-23, auto-renew on, nameservers `ns1.vercel-dns.com` and `ns2.vercel-dns.com`.
- **The records** were read from public DNS, because the Vercel account that holds the domain is not reachable from here. The Cloudflare import in 02 lists the rest.

| Name | Type | Value | 02 |
| --- | --- | --- | --- |
| `@` | A | `216.198.79.65`, `64.29.17.1` (Vercel) | Keep, **DNS only**, until 05 |
| `www` | A | `216.198.79.65`, `216.198.79.1` (Vercel) | Keep, **DNS only**, until 05 |
| `*` (every other name) | A | Vercel | Drop |
| `@` | TXT | `firebase=para-471414` | Keep (the old app's Firebase) |
| `@` | TXT | `v=spf1 include:_spf.firebasemail.com ~all` | Keep |
| `firebase1._domainkey` | CNAME | `mail-para--commute-org.dkim1._domainkey.firebasemail.com` | Keep, DNS only |
| `firebase2._domainkey` | CNAME | `mail-para--commute-org.dkim2._domainkey.firebasemail.com` | Keep, DNS only |
| `resend._domainkey` | TXT | Resend's DKIM key | **Keep**: password-reset email (contributor-accounts 07) |
| `send` | MX | `10 feedback-smtp.ap-northeast-1.amazonses.com` | **Keep**: Resend |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` | **Keep**: Resend |
| `@` | CAA | `letsencrypt.org`, `pki.goog`, `sectigo.com` | Keep; Cloudflare adds its own certificate authorities |

There is no MX at `@`, so the domain receives no email.

