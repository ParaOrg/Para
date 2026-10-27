# 02: DNS to Cloudflare

Status: needs-info (waits on 01's record list)
Type: task
Who: Owner
Blocked by: 01

## What to do

1. Cloudflare, **Para** account: Account home → Add a domain → `para-commute.org` → Free plan.
2. Compare the records Cloudflare found with 01's list. Keep every MX, TXT and other non-website record. Delete the A records that point at Vercel (`216.198.79.x`, `64.29.17.x`) and any CNAME to Vercel: 05's custom domains make their own.
3. Note the two nameservers Cloudflare gives.
4. Namecheap → Domain List → `para-commute.org` → Manage → Nameservers → Custom DNS: replace `ns1.vercel-dns.com` and `ns2.vercel-dns.com` with Cloudflare's two. At a quiet hour.
5. Wait for Cloudflare's "Active" email (minutes, at most a day). The old site answers throughout.

## Acceptance checks

- The hub reads the zone's records through the Cloudflare connector and the public nameservers through DNS: Cloudflare's, and every record 01 listed for keeping is there.
- `https://www.para-commute.org` still shows the old app until 05 (the website records are not moved yet).

## Comments
