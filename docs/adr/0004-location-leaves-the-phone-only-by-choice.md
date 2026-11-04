---
status: accepted
date: 2026-10-17
---

# A commuter's location leaves the phone only on the contributor page, after consent

[ADR 0001](0001-visitors-read-a-published-file.md) kept the public map from
ever sending a coordinate or an identity. On 2026-10-17 the owner opened Para
to contributors: anyone may make a contribution and send it, so the studio
learns where jeeps really go and stand.

The public map still sends nothing. A person's location leaves the phone only
on the contributor page, a page of its own at `/contribute/`, only after a
consent screen that says what is recorded, for what (including machine
learning), who sees it, for how long and where, and only when they tap Save.
*(Superseded in part on 2026-10-31: the owner removed the consent screen for
now, to redesign it and place it elsewhere. Having an account is the
agreement, recorded as consent version 4 on each upload; recordings made under
the screen go as the version they were made under (2 or 3). The text stays in
`consent-panel.tsx` for the redesign.)*
The phone is known by an anonymous identity, never a name.
*(Superseded in part on 2026-10-24: a contribution now belongs to its
contributor's account, and editors see the account's name. Email and number
stay with the owner.)* A contribution is
never public and never live: nobody watches anyone move, and editors see a
recording only after it is saved.

## Consequences

- The public page carries no contributor code and no database client;
  `scripts/checks/check-build.mjs` proves it on every build.
- The database lets anonymous readers, the nightly publish among them, read
  nothing about contributions, and the publish proves it on every run.
- Raw points are kept 24 months, then only the cleaned line, the times and the
  hintos, cut short at each end and unlinked from the phone. A contributor can
  delete their recordings.
- Deleting an account (the owner, 2026-11-01) removes the person: their name,
  email, number and password, their stats, the recordings on the phone not yet
  sent, and the sign-in log that names them. Their uploaded routes stay,
  unlinked from them as an old one is at 24 months, unless they tick "Also
  delete my uploaded routes". What stays of a kept route: its points, times,
  hintos and what was ridden, with the words they typed (start, end,
  description) cleared at once; at 24 months its raw points go and its ends are
  cut, as for any route. Once kept, a route is no one's: the person can no
  longer remove it themselves, and an editor removes it on request (the right
  to erasure under RA 10173). The weekly backups still hold the account for up
  to 60 days, then it is gone from those too
  (`supabase/migrations/20261101090000_delete_account_keep_uploads.sql`).
- Train tracking (planned) keeps its own rule: its features use the phone's
  location on the phone only.
- Rejected: sharing a location live; sign-in with an email (more friction, more
  personal data); invite-only links (too few contributors).

## Amendment, 2026-11-04

- **An account's uploads always stay.** The owner's call of 2026-11-04: Delete account no longer
  offers "Also delete my uploaded routes". The uploads stay, unlinked from the person, with the
  words they typed cleared (commit 71d6f805).
- **Deleting a ride in the contributor app deletes it on that phone only** (#683). The upload stays
  on Para.
