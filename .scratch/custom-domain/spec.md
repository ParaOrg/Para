# para-commute.org

Written 2026-10-27, after the owner asked to put `main` of `ParaOrg/Para` on the domain the old app uses: "we want the para repo main, to connect on that para-commute org".

## Why

- **One address for commuters.** `www.para-commute.org` is the name people already have; `parapo.<account>.workers.dev` is not something to print on a jeepney.
- **The tiles cache switches on.** Cloudflare's edge cache works only on a domain of our own, never on `workers.dev` (`workers/tiles/README.md`). Today every tile is an R2 read: 292 ms median and 1.8 s at the 99th percentile for a tile nobody asked for recently, 54 ms once cached (ticket `own-tiles` 04's Comments). `tiles.para-commute.org` is the open item ADR 0007 names before `main` switches to our tiles.
- **A rate limit on the tiles.** Cloudflare's rate-limiting rules belong to a zone; `workers.dev` has none.

## Today (checked 2026-10-27)

| Piece | Where |
| --- | --- |
| Registration (the name itself) | Namecheap |
| DNS (the domain's address book) | Vercel: nameservers `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| The website | Vercel (`server: Vercel`), an older app titled "Para PH" from one of the earlier repos. `para-commute.org` answers `308` to `https://www.para-commute.org/` |
| Its offline worker | `/sw.js`, cache `para-ph-v20260912`: network-first for page loads, cache-first for `/assets/`, `skipWaiting` and `clients.claim` |
| The new app | Cloudflare Workers: `parapo` (the site, moving from the old account to Para) and `parapo-tiles` (Para) |

The Vercel account the session's connector reaches ("Chupaeng") answers `403` for this domain, so the old project's name and its DNS records are for the owner to read off Vercel (01).

## What changes

A Worker's custom domain must be a zone in the same Cloudflare account, so the domain's DNS moves from Vercel to the **Para** Cloudflare account. The registration stays at Namecheap; only its nameservers change.

| Address | Serves | From |
| --- | --- | --- |
| `www.para-commute.org` | The app (`main`) | Worker `parapo`, custom domain |
| `para-commute.org` | `301` to `www`, as today | Cloudflare redirect rule |
| `tiles.para-commute.org` | The tiles, styles, sprite and glyphs, edge-cached | Worker `parapo-tiles`, custom domain |
| `staging-parapo.para-ph-info.workers.dev` | Staging, unchanged | Worker `parapo`'s preview of `staging` |

**`www` stays the main address.** An installed app belongs to its exact origin. Phones that installed "Para PH" did so from `https://www.para-commute.org`, so the new app on that origin takes over their icon, while a move to the bare domain would leave those installs pointing at a redirect.

**`main` alone reaches the domain**, and only the owner merges into `main`, as now.

## The old app's phones

The old worker is network-first for page loads, so once the domain points at the new app a phone online gets the new page at once. Two things still need care (03):

1. **Our page sees a worker already in control.** `pwa.ts` treats a controlled page as "not a first visit", so our worker would wait and the commuter would see the "Reload to update" prompt on their very first look at the new app. Our page should recognise the old worker (not ours) and let ours take over quietly, like a first visit.
2. **The old cache stays on the phone.** Our worker never deletes `para-ph-*`; it should, once, on activate.

## Cost

Cloudflare's Free plan covers a zone's DNS and Workers custom domains (from memory; the plan page is checked when the zone is added in 02). The Workers Paid plan ($5/month) is still the item to buy before launch (`own-tiles/spec.md`). Namecheap renewal is unchanged.

## Risks and answers

| Risk | Answer |
| --- | --- |
| Email or a verification breaks | 01 lists every record on Vercel; 02 copies MX, TXT and any other non-website record before the nameservers change |
| Downtime while the nameservers change | The old site keeps answering until resolvers move (minutes, at most a day). Change them at a quiet hour |
| Old app phones stuck on the old app, or shown an update prompt | 03, proven in a headless test with the old worker installed first |
| Sign-in breaks on the new address | Turnstile's hostnames and Supabase's redirect URLs get the domain before the switch (01, 05) |
| Something is wrong after the switch | Point `www`'s record back at Vercel in Cloudflare's DNS (the old project still exists until 05's last step), or remove the custom domain |
| Search engines see staging | Unchanged: staging stays on `workers.dev`; `_headers` already keeps `/studio/` out |

## Tickets

| # | Ticket | Who | Blocked by |
| --- | --- | --- | --- |
| 01 | [The site on Para, and what Vercel holds](issues/01-site-on-para-and-inventory.md) | Owner, hub checks | – |
| 02 | [DNS to Cloudflare](issues/02-dns-to-cloudflare.md) | Owner | 01 |
| 03 | [The old app's phones move to the new app](issues/03-old-app-handover.md) | Sonnet | – |
| 04 | [The code for the domain](issues/04-code-for-the-domain.md) | Sonnet | – (merges after 02) |
| 05 | [Switch, check and retire Vercel](issues/05-switch-and-retire.md) | Owner, hub checks | 02, 03, 04 |

03 and 04 can be built now and wait, reviewed, on their branches. 05 is the only step commuters notice.
