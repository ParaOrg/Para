# Rule changes for the owner to approve

**Status: approved 2026-10-17.** Nothing here is applied. `.claude/CLAUDE.md`, `CONTEXT.md` and `docs/adr/` are unchanged on this branch. Once you approve, ticket `issues/03-docs-words-adrs-rules.md` applies what you approved, as written or as you amend it.

Each change says what the file says today, what it would say, and why.

---

## 1. `.claude/CLAUDE.md`

### 1.1 Folder structure: the contributor page

Today the tree lists two app shells (`public-map/`, `studio/`) and three leaf features (`locator`, `published-map`, `studio`).

Proposed additions:

```
├── app/
│   ├── public-map/
│   ├── studio/
│   └── contribute/             # The contributor page at /contribute/: main.tsx, contribute-app.tsx
├── features/
│   ├── contribute/             # The contributor page: consent, the recorder, saving and sending. index.ts. The public page never loads it.
```

**Why:** `/contribute/` is its own page (decided 2026-10-17), so the public page carries no recording or database code. The field-test page (ticket 01) creates both folders.

### 1.2 Import rules: a fourth leaf feature

Today:

> Features depend one way: `routes` first; `locator`, `published-map` and `studio` may import `routes` and never each other. `app/public-map` never imports `features/studio`. ESLint enforces all of this (…), and `scripts/checks/check-build.mjs` proves from the built output that no studio module reaches the public page.

> Code outside a feature imports `locator`, `published-map` and `studio` **only through their `index.ts`**.

Proposed:

> Features depend one way: `routes` first; `locator`, `published-map`, `studio` and `contribute` may import `routes` and never each other. `app/public-map` never imports `features/studio` or `features/contribute`, and `app/contribute` never imports `features/studio`. ESLint enforces all of this (…), and `scripts/checks/check-build.mjs` proves from the built output that no studio or contribute module reaches the public page, and no studio module reaches the contributor page.

> Code outside a feature imports `locator`, `published-map`, `studio` and `contribute` **only through their `index.ts`**.

And under Imports and exports: "Barrel files (`index.ts`) exist only at the root of `locator`, `published-map`, `studio` and `contribute`".

**Why:** the hinto rules and the point packing are needed by both the contributor page and the studio. They live in `features/routes/model/`, which both may import.

### 1.3 Data fetching: Supabase from two features

Today:

> Supabase is read and written only by `features/studio/data/`, and the one Supabase client lives there, never in `shared/`: the public page must never carry it, and `scripts/checks/check-build.mjs` proves that by path.

Proposed:

> Supabase is reached by two features only. `features/studio/data/` reads and writes the route tables and reads contributions. `features/contribute/api/` writes the phone's own contributions, reads them back and deletes them, nothing else. Each page's entry point creates its own client, the contributor page's under its own auth storage key; no client lives in `shared/`. The public page carries neither: `scripts/checks/check-build.mjs` proves it by path, and proves the contributor page carries no studio code.

**Why:** the contributor page must send its recordings. Its own storage key matters because both pages share the site's origin: with Supabase's default key, an anonymous sign-in on `/contribute/` would replace an editor's studio session in the same browser. The database's own rules, not this line, are what stop a phone doing more (`database.md`, §4).

### 1.4 Supabase types: one file both features read

Today:

> Supabase types, once generated, live in `src/features/studio/data/database.types.ts`. Never edit that file by hand; regenerate it.

Proposed:

> Supabase types, once generated, live in `src/shared/types/database.types.ts`. Never edit that file by hand; regenerate it after every migration. It holds types only, so it adds no code to any page.

**Why:** the contributor page needs its tables' types too, and features never import each other ("If two features need the same code, move it to `shared/`").

### 1.5 Environment variables

Today:

> Environment variables, parsed once in `shared/config/env.ts`. Nothing else reads `import.meta.env`.

> Never put secrets in the frontend. Only the Supabase URL and the publishable key belong in `VITE_` variables.

Proposed:

> Environment variables, parsed once per page with Zod: `shared/config/env.ts` for the flags any page may read, and the Supabase and Turnstile values in the feature that uses them (`features/studio/data/env.ts`, `features/contribute/api/env.ts`), so the database's address never enters a module the public page loads. Nothing else reads `import.meta.env`.

> Never put secrets in the frontend. Only the Supabase URL, the publishable key and the Turnstile site key belong in `VITE_` variables; all three are public by design. Turnstile's secret key lives in Supabase's Auth settings, never in the repo.

**Why:** the Turnstile widget needs its public site key in the page. The first half repeats the blind-spot audit's finding 8 (2026-10-17): today's rule, followed to the letter, would put `.supabase.co` in the public page and fail `check-build.mjs`.

### 1.6 Stack: two Cloudflare services

Proposed rows for the Stack table:

| Tool | Used for |
| --- | --- |
| Cloudflare Turnstile | The bot check on a contributor's first save and on the studio's sign-in. Cloudflare's own script, loaded on those two pages only; no npm package |
| Cloudflare R2 | The weekly encrypted backup of contributions, written by a GitHub workflow. Nothing in the app reads it |

**Why:** both were approved on 2026-10-17 (answers 1a and 7b). The rule "Don't add a dependency without asking first" is satisfied; the table should say they exist.

### 1.7 Validation boundaries

Today: "Form input, URL and search params, and anything read from `localStorage`."

Proposed: "Form input, URL and search params, and anything read from `localStorage` or IndexedDB."

**Why:** the contributor page keeps every point in IndexedDB, and a recording saved by an older version is read back by a newer one.

### 1.8 The published map's reader (pick one)

Today:

> `published-map/  # Reads the index and line files, tracks freshness, runs the installed app's updates. index.ts.`

The studio's Public map must read the published map exactly as commuters do. The old plan (`.scratch/README.md`) said the reader "moves to `shared/`". **That can't work:** `published-map/api/fetch-index.ts` and its schemas import `features/routes/model/`, and `shared/` never imports a feature.

- **A (recommended):** move the reader (`fetch-index.ts`, `fetch-line.ts`, the two schemas, and the file addresses they need from `map-file.ts`) into a new routes concern folder, `features/routes/published/`. Both apps may import routes. `vite.config.ts` and `check-build.mjs` read `map-file.ts` by its path and follow it. The tree would read:
  - `routes/published/`: "The published map's reader: the index and the line files, for the public map and the studio's Public map."
  - `published-map/`: "Tracks the published map's freshness and runs the installed app's updates. index.ts."
- **B:** let the studio import `published-map`'s `index.ts`, an exception to "leaf features never import each other". Smaller, but it opens a hole in a rule ESLint enforces, and the barrel carries the installed app's update code.
- **C:** show the public page itself in a frame inside the studio. No shared code and exactly what commuters see, but keeping the camera across the switch needs the public page to take a camera in its address, and it puts a second map on the editor's screen.

---

## 2. `CONTEXT.md`

### 2.1 New words

Proposed as a new section, **"### Contributors"**, after "People and surfaces":

**Contributor**:
Anyone who records a ride on the contributor page. The studio knows a contributor only as a phone, an anonymous identity made on the first Save, never by name. A commuter who taps the Contributor button and records becomes one, on that page only.
_Avoid_: driver, user, reporter

**Contribution**:
One recording on the contributor page, from Start to Save, as it reaches the studio: its points (about one a second), its hintos and gaps, and what the contributor typed: a start point name, an end point name, a description, what was ridden. Never public.
_Avoid_: trip and ride (both taken), ikot, session, track, trace

**Hinto**:
A time the phone stood still in one spot during a contribution: 8 seconds or more within 25 metres, for now. Many hintos at one spot, across many contributions, suggest a hintuan. The database uses the same word.
_Avoid_: stop (the database's name for a hotspot), dwell, idle

**Gap**:
A stretch of a contribution with no location: the screen went off, a call came, another app was in front, no fix came for 5 seconds, or the page was reloaded. Not a Stop, which the contributor chose.
_Avoid_: pause; lost signal (only one of its causes)

**Contributor page**:
The page at `/contribute/` where a contribution is recorded: Ready, Recording, Stopped, Saved. A page of its own, so the public map carries none of it.
_Avoid_: driver app, tracker

**Contributor button**:
The button at the public map's top left: a plain link to the contributor page. Shown once the test period ends.

And in "People and surfaces", for the studio:

**Contributors map**:
The studio's map of every contribution as it came: faint lines and hintos, for editors only.
_Avoid_: Tracking map, heatmap

**Playground**:
The studio's map where editors draw. Every route and hotspot goes Draft → Pending → Approved there.
_Avoid_: Drafts map, sandbox, staging

**Draft** / **Pending** / **Approved**:
A route or hotspot being drawn or changed, seen by editors only, one at a time per route or hotspot; a draft submitted for review; what commuters get at the next publish. Any editor approves, their own work included.
_Avoid_: push, publish (the nightly publish is something else), staging

**Send back**:
Return a pending draft to its editor, with a note.

**Take down** / **Put back**:
Remove an approved route or hotspot from the public map at the next publish; undo it.
_Avoid_: delete (a taken-down row is kept)

### 2.2 Changed words

- **Commuter:** today "Anyone who opens the public map. Asks nothing of anyone: no account, no permission, no tracking." Add: "On the contributor page the same person may become a contributor, by choice (ADR 0004)."
- **Studio:** today "The editor at `/studio/`: the map plus every drawing and saving tool." Proposed: "The editor at `/studio/`: three maps behind one switch, Contributors, Playground and Public, and every drawing and saving tool."
- **Published map:** today "rebuilt nightly from the studio's data". Proposed: "rebuilt nightly from the studio's approved data".

### 2.3 Words to retire

Never in `CONTEXT.md`, but in the old driver plan and the earlier briefs: **driver**, **driver link**, **ikot**, **biyahe** (for this feature), **Tracking map**, **Drafts map**. The glossary's Avoid lines above name them so they don't creep back.

---

## 3. ADR 0003 (new): commuters see what was approved, then published

```
---
status: proposed
date: 2026-10-17
---

# Commuters see what was approved, then published

Since migration 0015 (2026-10-14) three editors change every route and
hotspot, and every save reached commuters at the next nightly publish. An
experiment went public as soon as it was saved.

Every route and hotspot now goes Draft → Pending → Approved, and the nightly
publish reads approved work only. Drafts live apart from the tables commuters'
data is published from, in one draft table, one draft at a time per route or
hotspot. The database lets anonymous readers, the publish among them, read
approved rows only, so the publish needs no rule of its own to leave drafts out.

## Consequences

- ADR 0001's consequence "a change the editor saves is seen by visitors when it
  is published" becomes: a change is seen once it is approved, then published.
  ADR 0001's decision stands: commuters read static files, never the database.
- Hintuan links are worked out from approved lines and boxes only, when
  something is approved, so a draft never reaches a public timeline.
- Taking work down on purpose is listed, and the publish's 30% guard counts
  those rows as deliberate. A slip that hides everything still trips it.
- Any editor approves, their own work included (the owner, 2026-10-15). Pending
  marks work as finished, not as checked by someone else.
- On the day it ships everything already saved is approved, so commuters see
  no change.
```

## 4. ADR 0004 (new): a commuter's location leaves the phone only on the contributor page

```
---
status: proposed
date: 2026-10-17
---

# A commuter's location leaves the phone only on the contributor page, after consent

ADR 0001 kept the public map from ever sending a coordinate or an identity.
On 2026-10-17 the owner opened ParaPo to contributors: anyone may record a
ride and send it, so the studio learns where jeeps really go and stand.

The public map still sends nothing. A person's location leaves the phone only
on the contributor page, a page of its own at /contribute/, only after a
consent screen that says what is recorded, for what (including machine
learning), who sees it, for how long and where, and only when they tap Save.
The phone is known by an anonymous identity, never a name. A contribution is
never public and never live: nobody watches anyone move, and editors see a
recording only after it is saved.

## Consequences

- The public page carries no contributor code and no database client;
  scripts/checks/check-build.mjs proves it on every build.
- The database lets anonymous readers, the nightly publish among them, read
  nothing about contributions, and the publish proves it on every run.
- Raw points are kept 24 months, then only the cleaned line, the times and the
  hintos, cut short at each end and unlinked from the phone. A contributor can
  delete their recordings.
- Train tracking (planned) keeps its own rule: its features use the phone's
  location on the phone only.
- Rejected: sharing a location live; sign-in with an email (more friction, more
  personal data); invite-only links (too few contributors).
```

## 5. ADR 0001: an amendment line

Add under its other amendments: "Amended 2026-10-17: what commuters see is what was approved, then published (ADR 0003); the contributor page sends recordings by choice (ADR 0004). The public map still sends nothing."

---

## 6. `.scratch/README.md`

Updated on this branch (it is the plan's own index): project 4 points to `contribute/`, project 5 names the three new maps, and its "What these change" section points here.
