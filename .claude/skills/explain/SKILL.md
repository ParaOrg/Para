---
name: explain
description: Explain one thing to the owner as a textbook would, with its history, one layer at a time - a tool, a service, a term, a piece of Para or a step a session is taking (Turnstile, R2, a Worker, PMTiles, a migration, a merge commit). Use when the owner types /explain <topic>, asks "what is this?", asks why a step is needed, or picks a door from an earlier explanation.
---

# /explain <topic>

The owner is learning while the sessions build, and wants to go down the rabbit hole of a topic the way a textbook lets you: what it is, why it was invented, what problem came before it, and how it works, deeper only where they choose. Teach so they could explain it to someone else afterwards. Read-only: never change anything while explaining.

## 1. Find what it means here, and where it came from

- **Para's use.** Look up how Para uses the topic: `CONTEXT.md` (the glossary), `docs/adr/`, `.claude/CLAUDE.md`, the spec or ticket under `.scratch/` it came from, and the code or config that uses it (`git grep`). A general explanation that ignores Para's own use is half an answer.
- **Its history.** What existed before it, what problem that left unsolved, who made it and roughly when. Prefer a primary source (the spec, the maker's own page). Dates and names from memory are marked as such.
- **What the owner already knows.** Read `known-words.md` beside this file. Those words need no explaining; every other term the topic leans on is a prerequisite.
- **Changing facts.** If the topic is a service with prices or limits that change, say where the numbers came from and when; don't quote from memory as fact.

## 2. The first layer

Every explanation opens with this, about 12–15 lines, and stops there:

```
## <Topic>

**In brief.** One or two sentences: what it is, precisely, in plain words.

**The problem it solved.** What people did before it, what that cost or broke,
and what changed when it arrived (who, roughly when).

**The key idea.** The one insight that makes it work, in two or three sentences.

**In Para.** Where it lives (file, ADR or ticket) and what it does for
commuters, contributors or the owner.

**Before you start:** the prerequisite words not in known-words.md, each with a
one-line meaning. Say "basics" to open them first.

**Go deeper:**
1. ... (five to seven numbered doors, below)

*Reply with a number, or several ("1 then 4").*
```

Leave out "Before you start" when every prerequisite is already known.

## 3. The doors

Choose the five to seven that fit the topic, in this order where they apply:

1. **Inside it:** its parts and how they fit, step by step.
2. **The full history:** each earlier approach, what it fixed and what it left broken, up to today.
3. **How Para uses it:** the files, services and steps, with what was measured where we have numbers.
4. **Trade-offs and failure modes:** what was given up, what can break, and what we do then.
5. **Costs and limits:** money and quotas, with where the numbers came from and when.
6. **Words to know:** the terms that come with it, one or two lines each.
7. **Test yourself:** four or five questions; answers only when asked.
8. **Neighbouring rabbit holes:** related topics, each a `/explain` of its own.

**When a door is opened,** write it as a textbook section of about 20–35 lines:
- a definition before its first use of any new word;
- the reasoning, not only the facts: why it is built this way and not another;
- one worked example, from Para where possible;
- its own two to four doors at the end, so the owner can keep going.

**"basics"** opens the prerequisites first, three to six lines each, in the same textbook-and-history shape: what it is, where it came from, and where it shows up in Para. Then offer to continue to the topic.

## 4. Rules

- **Correct before simple.** Simplify by leaving detail out, never by saying something untrue.
- **Mark what's checked.** Facts read from the repo or a primary source now are stated plainly; anything from memory or estimated says so.
- **Disclose progressively.** Never write every door at once. The first layer, then only what the owner opens.
- **Glossary words.** Use commuter, hotspot, hintuan, contributor; never "visitor".
- **A comparison is a tool, not the lesson.** Use one from ordinary life (a jeepney, a sari-sari store, a book's index) only where it helps, and say where it stops working.
- **No secrets.** Never print a key, token or password, even when explaining where one lives.

## 5. Keeping known-words.md

When the owner says a word is clear, or uses it correctly in their own words, it belongs in `known-words.md`. Don't edit the file mid-explanation: note the word, and the hub adds it in its next small docs PR.
