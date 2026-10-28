# 06: A draft privacy policy

Status: resolved (the draft is written; the owner approves the words, ideally after a lawyer's read)
Type: task
Who: Opus, then the owner approves the words

## The problem

Contributors share their location (their rides), and editors and contributors have accounts, but Para has no public privacy policy. Expected under the Philippines' Data Privacy Act of 2012 (RA 10173) for an app that collects location, and required by both app stores.

## What to write

`.scratch/ready-for-100k/privacy-policy-draft.md`, **text only, no page**. The owner designs where it appears.

- **Who's responsible,** and how to reach them. Leave the contact as "(owner to fill)".
- **Commuters:** what the public map stores. Nothing is sent: the location stays on the phone (ADR 0004). Say what the offline copy on the phone is.
- **Contributors:**
  - what a ride records and when it's sent;
  - where it's kept: Supabase in Singapore, and the weekly encrypted backup at Cloudflare R2 (`src/features/contribute/consent-panel.tsx` holds the wording the consent screen already uses; stay consistent with it);
  - how long it's kept;
  - how to delete rides and the account.
- **Editors:** the studio account and what it records.
- **Third parties:** Cloudflare (hosting, Turnstile), Supabase, Resend (password-reset email), and OpenStreetMap for the map data.
- **Rights under RA 10173:** access, correction, erasure, objection, and how to ask.
- **Changes to the policy,** and the date.

Write from the code and the ADRs: every claim must be true of the code today. Where the code and the consent panel disagree, list it as a question, not a choice.

## Rules

- Plain, short sentences, in the house voice.
- Say clearly in the PR that this is a draft for the owner and not legal advice, and that a lawyer's read is recommended before launch.

## Files it owns

The draft file only.

## Acceptance checks

- Each claim cites the file or ADR it comes from, in a comment at the end of the draft.
- The questions for the owner are listed in the PR.

## Comments

**2026-10-28, the builder.** `.scratch/ready-for-100k/privacy-policy-draft.md`, text only. Every claim cites its file or ADR in the comment at its end. It keeps the consent panel's words where they overlap. Where the code and the panel, or the panel and the owner's setup, may disagree, the PR lists a question rather than choosing. It is a draft, not legal advice.
