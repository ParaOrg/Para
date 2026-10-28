# 07: The owner's launch settings

Status: ready-for-human
Type: task
Who: the owner

Clicks only the owner can make. About an hour in total, in this order. Tick each when done.

- [ ] **Workers Paid ($5/month).** Cloudflare (Para account) → Workers & Pages → Plans. Removes the tiles Worker's 100,000-a-day cap. Tell the hub when it's on, so 03's full load test can run.
- [ ] **GitHub notifications.** github.com/ParaOrg/Para → Watch → All activity, or at least Issues. Then GitHub → Settings → Notifications: email on, and the GitHub mobile app installed. Without this, 04's alarms reach no one.
- [ ] **Two-factor sign-in** on GitHub, Cloudflare (both accounts), Supabase, Namecheap, Resend and Google. Store each recovery code offline.
- [ ] **Domain auto-renew** on at Namecheap (para-commute.org renews 2026-12-23).
- [ ] **Supabase plan limits:** fill in ticket 01.
- [ ] **The tiles rate limit,** after 03's load test gives its numbers: Cloudflare → para-commute.org → Security → WAF → Rate limiting rules, on hostname `tiles.para-commute.org`. The hub suggests the threshold from the test.
- [ ] **Cloudflare's GitHub access:** GitHub → ParaOrg → Settings → GitHub Apps → Cloudflare Workers and Pages → give it access to Para. This clears the red "Workers Builds: para" check.
- [ ] **DNSSEC** (optional, recommended): Cloudflare → para-commute.org → DNS → Settings → Enable DNSSEC, then add the DS record it shows at Namecheap.
- [ ] **The restore rehearsal,** once 05 is written: restore one backup on your computer, following `docs/operations.md`.
- [ ] **Approve the privacy policy's words** (06), ideally with a lawyer's read.

## Comments
