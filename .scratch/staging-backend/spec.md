# A database of its own for staging

Written 2026-10-29, from the owner's question "fake backend for staging and only main the real?". Plan only: nothing is built until the owner says go.

## The problem

`staging` and `main` build from the same `.env.production`, so both talk to the one live Supabase project. On the staging site, every test draft, approval, delete, ride and account lands in the live database, beside real contributors' data and in Sunday's backup. Polishing the studio and the contributor page means a lot of clicking on staging. One careless Delete there removes a live route.

The commuters' side isn't affected: the public map reads the published files, never the database (ADR 0001).

## The choice

| | A fake backend on staging | **A second Supabase project for staging (chosen)** | Keep sharing |
| --- | --- | --- | --- |
| Real data safe | Yes | Yes | No |
| Tests the real thing: sign-in, email, Turnstile, Row Level Security, migrations | No; a fake drifts (the 2026-10-28 review found the studio fake more lenient than 0022) | Yes | Yes |
| Cost | Free | Free tier (two free projects per organisation; check on the dashboard) | Free |
| Upkeep | Writing and keeping the fake | Each migration applied twice; some sample data | None |

The fakes stay where they work best: in the test suites (`tests/e2e/lib/fake-*.mjs`).

## How it works

- **A second project,** `para-staging`, in Singapore like the live one, with the same migrations, Auth settings and Turnstile check, and sample data instead of real people.
- **Staging builds point at it.** Workers Builds has a production trigger (the `main` branch) and a preview trigger (every other branch), each with its own build command and build variables (Cloudflare docs, Workers Builds → Configuration, read 2026-10-29). The preview trigger builds with the staging project's public URL and publishable key; `main` keeps `.env.production`. Ticket 02 decides between a committed `.env.staging` (`vite build --mode staging`) and build variables, preferring the one that is visible in git.
- **Migrations go to staging first.** The owner applies each new migration to `para-staging`, tries it on the staging site, then applies it to live. The rule stays: sessions write migrations, the owner applies them.
- **The nightly publish is unchanged.** It reads only the live database and commits to `main`. Staging's published map is whatever `main` last published.

## Risks, and what guards each

| Risk | Guard |
| --- | --- |
| The wrong address in the wrong build; worst case, live pointing at staging | A build check (02) proving that a `main` build names the live project and a staging build names `para-staging` |
| The two databases drift apart | A check (04) comparing their migration lists, raising an `alert` issue on a mismatch |
| A free project pauses after about a week unused (from memory; check Supabase's docs) | The same check (04) touches it daily; otherwise one click in the dashboard |
| Sample data hides bugs real data shows | Seed it from the published map (03), which is public; never copy contributors' personal data |
| More settings for the owner to keep | `docs/operations.md` lists both projects side by side |

## Before it starts

Cloudflare's GitHub access (`ready-for-100k/07`): the staging preview build fails without it, so there is no working staging site to point at the new database yet.

## Tickets

| # | Ticket | Who | Blocked by |
| --- | --- | --- | --- |
| 01 | [Create the staging project](issues/01-create-staging-project.md) | Owner, with a session's checklist | Cloudflare's GitHub access |
| 02 | [Staging builds use the staging project](issues/02-staging-builds-use-it.md) | Opus | 01 |
| 03 | [Sample data for staging](issues/03-sample-data.md) | Opus | 01 |
| 04 | [The drift and keep-awake check](issues/04-drift-and-keep-awake.md) | Opus | 01, 02 |
| 05 | [Migrations: staging first, then live](issues/05-migrations-staging-first.md) | Opus (docs), then the owner | 01 |
