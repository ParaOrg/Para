---
name: explain
description: Explain one thing to the owner from the ground up, in simple words - a tool, a service, a term, a piece of Para or a step a session is taking (Turnstile, R2, a Worker, PMTiles, a migration, a merge commit). Use when the owner types /explain <topic>, asks "what is this?", or asks why a step is needed.
---

# /explain <topic>

The owner is learning while the sessions build. Teach the topic so they could explain it to someone else afterwards. Read-only: never change anything while explaining.

## 1. Find what it means here

Before explaining, look up how Para uses the topic: `CONTEXT.md` (the glossary), `docs/adr/`, `.claude/CLAUDE.md`, the spec or ticket under `.scratch/` it came from, and the code or config that uses it (`git grep`). A general explanation that ignores Para's own use is half an answer. If the topic is a service with prices or limits that change, say where the numbers came from and when; don't quote from memory as fact.

## 2. Explain in this shape

Plain words, short sentences, no jargon without its meaning beside it. Use the glossary's words (commuter, hotspot, hintuan, contributor), never "visitor". About 20–35 lines.

1. **In one sentence:** what it is, as if to a friend.
2. **An everyday picture:** one comparison from ordinary life (a jeepney, a sari-sari store, a barangay hall, a gate guard). Say where the comparison stops working.
3. **How it works:** three to six numbered steps, each one line, in the order things happen.
4. **Why Para uses it:** the problem it solves for commuters, contributors or the owner, and the file or ticket where it lives.
5. **What it costs or risks:** money, limits, what breaks if it fails, and what we do then. "Nothing" is a fine answer when true.
6. **What you'd see or touch:** where it shows up for the owner (a dashboard page, a check on a PR, a screen in the app), and what, if anything, the owner ever has to do with it.
7. **Words to know:** two to five terms that come with it, one line each.

End with one line: the next thing worth learning after this, and why.

## 3. Rules

- **Correct before simple.** Simplify by leaving detail out, never by saying something untrue.
- **Mark what's checked.** Facts read from the repo or a primary source now are stated plainly; anything from memory or estimated says so.
- **One topic per answer.** If the topic leans on another the owner may not know, explain that one in a sentence and offer `/explain <it>` next.
- **No secrets.** Never print a key, token or password, even when explaining where one lives.
