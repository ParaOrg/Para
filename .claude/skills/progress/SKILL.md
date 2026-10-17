---
name: progress
description: Tell the owner where ParaPo's work stands right now - what's done, what's in progress, what's next, what the owner needs to do, and how much time is left. Use when the owner types /progress or asks "where are we?".
---

# /progress

A short, verified status report in chat. It reads; it never changes anything.

## 1. Gather, in parallel (read-only)

- **Time.** `date -u` and `TZ=Asia/Manila date`. Look for an end time the owner set, in two places:
  - the run log (below);
  - this account's scheduled tasks, through `list_triggers`. A summary or wrap-up task marks the end of a run.
- **The run log.** If this session's scratchpad has a run log (for example `night-queue.md`):
  - read its last 40 lines and its latest "STATE NOW" snapshot;
  - find the line that records the last `/progress`, which is where "since last time" starts.
- **GitHub (Roviicc/ParaPo):**
  - open PRs: number, title, draft or ready, head SHA, the latest CI run on that head, and whether a review passed;
  - what merged into `staging` and into `main` since the last `/progress`, or in the last 24 hours if there's none;
  - the latest push CI on `staging` and on `main`.
- **Sessions.** `ListAgents`, and `list_sessions` with mine set to true. Note each building session's current task and state. Also include any background agents of this session that are still running, such as reviews.
- **Tickets.** The `Status:` lines in `.scratch/*/issues/*.md` on `origin/staging`:
  - `claimed` means in progress;
  - unblocked `ready-for-agent` means next;
  - `ready-for-human` and `needs-info` mean the owner's turn.
- **Waiting on the owner:**
  - the run log's owner to-dos;
  - those tickets;
  - migrations written but not yet applied. Compare `supabase/migrations/` with `list_migrations` if the Supabase tools are available; this is read-only;
  - previews waiting for the owner to try.

If a source can't be reached, say so in one line and carry on.

## 2. Report in chat

Keep it to about 35 lines. Use plain words and the glossary's (commuter, hotspot, contributor, hinto). Leave out internal IDs and session IDs. Link every PR as a full URL.

**Where we are:** one or two sentences.

**Done since last time:** bullets, each with its PR link and one line on what it means for the owner or for commuters.

**In progress:** who is building or reviewing what, and its state (building, in review, fixing review notes, waiting for CI, waiting on X).

**Next:** the next 3 to 5 steps, in order.

**Needs you:** numbered, most important first. Each item is the exact action, with a link or path.

**Time:**
- now, in UTC and in Manila;
- the run's end and the hours left, or "no end set";
- a rough estimate in hours for what's left of the current wave, labelled as an estimate.

**Links:** production, any preview the owner should try, and the latest summary or plan page, when known.

## 3. Rules

- **Read-only.** `/progress` never merges, pushes, comments, applies migrations, or messages other sessions.
- **Mark what's verified and what's inferred.** Every state comes from a source you just read, not from memory. When something is inferred (an estimate, or a session that hasn't reported for a while), say so.
- **Afterwards,** add one line to the run log, if there is one: `- HH:MM /progress sent`. That gives the next report its "since last time".
