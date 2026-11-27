# 07: The Vercel project

Status: ready-for-human
Type: task
Who: the owner
Blocked by: 02, 03, 04, 05 merged into `staging`

## What to do

On the owner's Vercel Pro team, **Room TBA OSS Program** (slug `room-tba-oss-program`). A session can't do these: they link the owner's accounts and set secrets.

1. **Import the repo:** Add New → Project → GitHub `ParaOrg/Para` (install Vercel's GitHub App on ParaOrg for this repo only). Project name `para`. Framework: Other. Root directory: `./`. Build, output and install come from `vercel.json`; leave the fields empty.
2. **Settings → Git:** production branch `main`.
3. **Settings → General → Node.js version:** 22.x.
4. **Settings → Domains:** add `staging.para-commute.org`, assigned to the branch `staging`. At Cloudflare DNS add the `CNAME staging` record Vercel shows, **DNS only** (grey cloud).
5. **Settings → Environment Variables**, type Sensitive, **Production only**: `REPORT_DATABASE_URL` and `TURNSTILE_SECRET_KEY`, the same values the `para` Worker holds (`workers/site/README.md`, The owner's steps). Never in a file or a chat.
6. **Firewall → Rules → New rule:** "Route reports", if path equals `/api/report`, rate limit 5 requests per 60 seconds, keyed by IP, action deny (429). First read whether Pro bills it (`vercel pricing firewall`, or the Firewall page); if it costs more than you accept, say so and 05 switches to the in-memory fallback.
7. **Settings → Deployment Protection:** decide: keep Vercel Authentication on previews (only the team sees them) or set it to none for previews (anyone with the link). Custom domains are never protected.
8. Tell the hub the project's production `*.vercel.app` address.

## Acceptance checks

- [ ] A new PR gets a Vercel comment with a preview link, and the deploy succeeds (its log shows every `check-build.mjs` line passing).
- [ ] `https://staging.para-commute.org/` shows the map, not Coming soon.

## Comments
