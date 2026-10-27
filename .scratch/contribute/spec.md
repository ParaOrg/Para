# Contributors

Replaces the driver app (the owner's direction, 2026-10-17). The old plan is this file's history: `git log --follow .scratch/contribute/spec.md`.

## What it is

Anyone can record a ride. A page at **`/contribute/`** records it on the phone, and **Save** sends it to the studio. Editors study the recordings on the studio's **Contributors map** (see `studio-maps`) and turn them into drafts in the Playground.

**What it's for:** ground truth. The real line, the minutes and the metres, and where the vehicle stood still (**hintos**). That finds hintuans the map lacks and checks the lines it has. Later, the recordings and what editors made from them train a model (see Machine learning).

**Recorded, not live.** Nobody watches anyone move. Nothing about a contributor or a recording ever reaches the public map. That keeps the owner's earlier worry from coming true (`PLAN.md`, the parked jeep animation): "the user might think that we're tracking jeepneys, or the jeepney is upcoming".

**What the owner decided (2026-10-17), all the recommended options:**

| # | Question | Answer |
| --- | --- | --- |
| 1 | Who can contribute | Anyone, no account. Supabase's anonymous sign-in gives each phone an identity, with a Cloudflare Turnstile bot check on the first save |
| 2 | When the button appears | `/contribute/` is link-only during a test period. The top-left Contributor button goes public after it |
| 3 | What comes first | The contributor page and the studio's maps are built side by side |
| 4 | How long raw recordings are kept | 24 months, named on the consent screen as also for machine learning. Then only the cleaned line, the times and the hintos |
| 5 | What was ridden | The Stopped screen adds one optional pick: Jeep, Bus, Train, Ferry, Tricycle, Other |
| 6 | The word for standing still | **Hinto.** "Stop" is the database's name for a hotspot |
| 7 | Backups | A weekly private backup to Cloudflare R2, in the owner's existing Cloudflare account |
| 8 | Two editors, one route | One draft at a time per route or hintuan; others see "being changed by X" (`studio-maps`) |

**Decided with the plan (2026-10-17):**

- `/contribute/` is its own page: `src/app/contribute/` and `src/features/contribute/`. The Contributor button is a plain link to it. So the public page carries no recording code and no database code, and `scripts/checks/check-build.mjs` proves it on every build. A commuter who never taps the button downloads nothing extra.
- One upload, on Save, retried until it is sent. A ride is 15 to 90 minutes, so nothing is uploaded during it.
- The hinto rules live where the contributor page and the studio may both import them: `features/routes/model/` (no React, no browser APIs). Leaf features never import each other.
- `contribution_use` records which direction or hintuan an editor made from which recording. Those links are the labels machine learning needs.

## Words (for `CONTEXT.md`)

The proposed entries, for the owner's approval, are in `rule-changes.md`. In short:

- **Contributor:** anyone who records a ride on the contributor page. The studio knows them only as a phone, never by name. _Avoid_: driver, user, reporter.
- **Contribution:** one recording, from Start to Save, as it reaches the studio: its points, its hintos and gaps, and what the contributor typed. _Avoid_: trip and ride (both taken), ikot, session, track, trace.
- **Hinto:** a time the phone stood still in one spot during a contribution. Many hintos at one spot, across many contributions, suggest a hintuan. _Avoid_: stop (the database's word for a hotspot), dwell, idle.
- **Gap:** a stretch of a contribution with no location: the screen went off, a call came, another app was in front, no fix came for 5 seconds, or the page was reloaded. Kept apart from Stop, which the contributor chose.
- **Contributor page**, **Contributor button**, **Contributors map**, **Playground**.
- Retired with the driver app: driver, driver link, ikot, biyahe, Tracking map.

## Who

- Anyone with the link during the test period (the owner's 2b), then anyone who taps the Contributor button.
- Mostly passengers, on any phone. The page is built for cheap Android phones on mobile data first, as the public map is.
- **No account.** On the first Save the phone signs in anonymously, after a Turnstile check. The identity stays on that phone. Clearing the browser's data makes a new one.

## The contributor page

The labels and the look come from the owner's Figma. This section is the behaviour only.

```
 Ready ──Start──▶ Recording ──Stop──▶ Stopped ──Save──▶ Saved ──Done──▶ Ready
                     ▲                   │  │
                     └──────Resume───────┘  └──Cancel (asks once)──▶ Ready
```

| Screen | Buttons | Shows |
| --- | --- | --- |
| **Ready** | Start | On the first visit, the consent screen comes first (below). GPS ready or waiting. How many recordings are waiting to be sent |
| **Recording** | Stop | Distance, minutes moving, minutes standing, the number of hintos so far, any gap. Big text |
| **Stopped** | Save · Resume · Cancel | The totals; each hinto with its time and minutes; how much was lost to gaps. Four optional fields: start point name, end point name, description, and what was ridden (Jeep, Bus, Train, Ferry, Tricycle, Other) |
| **Saved** | Done | "Sent" once it reached the studio, or "Waiting for signal" when it will send by itself |

**Rules:**

- **Start** begins a recording. Nothing is asked first: no route, no direction.
- **Stop** pauses the recording and opens Stopped. **Resume** goes back to Recording. The time between Stop and Resume counts as neither moving nor standing.
- **Save** keeps the recording and sends it. The four fields are all optional; Save never waits on them.
- **Cancel asks once,** on the page, not with the browser's `confirm()`: "Delete this recording? This can't be undone." Then the recording is gone from the phone.
- **The page closed mid-recording:** it reopens on the recording and offers Resume or Stop. The time it was closed is a gap.
- **GPS warm-up:** cheap phones can take a while to find their position. Ready says "waiting for GPS" until it has one.
- **Every input has a visible label,** and the page works with a keyboard and a screen reader (`.claude/CLAUDE.md`). The live numbers are announced politely, not on every change.
- **Never while driving.** A contributor who is driving doesn't touch the phone (the Anti-Distracted Driving Act, RA 10913). The consent screen says so.

## Consent (first visit)

One screen, before the first Start. It says:

- **What is recorded:** the phone's location about once a second while recording, the times, the gaps, and what the contributor types.
- **What for:** drawing and checking routes and hintuans, studying how people ride, and machine learning on that data.
- **Who sees it:** the ParaPo editors, in the studio. Never the public.
- **How long:** the raw points for 24 months. After that only the cleaned line, the times and the hintos, cut short at each end and no longer tied to the phone. Backups are kept 60 days.
- **Where:** Supabase's servers in Singapore, and a private, encrypted backup at Cloudflare.
- **Deletion:** "Delete my recordings" on the page, or ask the owner.
- **Who is responsible:** the owner, with a way to reach them.

Recording starts only after the contributor agrees. Each contribution carries the version of the text agreed to.

## What is recorded

**Raw, never edited:**

- Every point the phone gives, about one a second: position, time, accuracy, speed. **Not thinned:** passenger stops last 5 to 15 seconds, and thinning would hide them.
- Start, Stop, Resume and Save, each with its time, and every gap with its cause.

**Worked out from the raw points, by the same rules on the phone and in the studio** (`src/features/routes/model/ride-recording.ts`, from the field test):

- **Jumps dropped:** a fix with accuracy worse than 50 m, or one that would need more than 120 km/h from the last kept point.
- **Distance:** the sum of the kept points' great-circle steps.
- **Minutes moving and minutes standing.**
- **Hintos:** standing still for 8 seconds or more within 25 m. These are starting numbers, tuned with the field test's data. The raw points are kept, so every contribution can be counted again while they last.
- **Gaps:** the page hidden, no fix for over 5 seconds, or a reload mid-recording.
- **The line:** the kept points, thinned at 5 m. It is what the Contributors map draws. Snapping to the roads happens only when an editor uses a line (`studio-maps`), because the router is a shared public server.

## Offline, saving and sending

- **Every point is saved on the phone the moment it arrives** (IndexedDB, one record per point). A dead battery or a closed tab loses nothing recorded up to then.
- **Ids are made on the phone** (`crypto.randomUUID`), so a resent recording is never stored twice.
- **The saved format carries a version number,** so a recording made on an old version still sends after an update.
- **The screen is kept awake** while recording (the Screen Wake Lock API), asked for again whenever the page comes back. A refusal is tolerated.
- **One upload, on Save.** With no signal the recording waits on the phone and sends itself when the page is next open with signal. The number waiting is always shown on Ready.
- **Phone clocks can be wrong:** the server records its own time when a recording arrives, beside the phone's clock at sending, so a skewed clock can be corrected.
- **The page opens with no signal.** It gets its own offline setup, a small service worker scoped to `/contribute/`, apart from the public map's. The public map's worker keeps out of `/contribute/`, as it does of `/studio/`.
- **Chrome is asked to keep the page's data** (persistent storage), so a phone low on space doesn't wipe unsent recordings.
- **An update never reloads the page mid-recording.**
- **Data use:** a few hundred KB per hour of riding, sent once. The page has no map.

## Identity and the database

The design is in `database.md`, for the owner to approve before any migration is written. In short:

- On the first Save the phone passes Turnstile and signs in anonymously. The session is kept under its own storage key, so it never mixes with an editor's studio session on the same browser.
- **The database's own rules** let a phone add its own contributions, read them back and delete them, and nothing else. They cap the points per contribution, the contributions per phone per day, and the speed between points. Editors read everything, hide a contribution and block a phone. Commuters and the nightly publish read nothing.
- The raw points are stored as small whole numbers (each the change from the point before), one row per few minutes, in monthly pieces. Dropping a month after 24 months is instant.
- **"Delete my recordings"** deletes the phone's contributions and everything under them. A phone whose identity was lost (cleared data, a new phone) asks the owner instead.

## Privacy (Data Privacy Act of 2012, RA 10173)

- **A contribution tied to a phone is personal information,** even without a name: where a ride starts and ends can point to a person. It is not "sensitive" personal information under the Act.
- **What the Act asks, and where this plan answers it:** consent and a stated purpose (the consent screen), a time limit (24 months), deletion on request ("Delete my recordings", or the owner), reasonable security (the database's rules, the bot check, encrypted backups), and one accountable person (the owner).
- **Never public.** The repo is public, and the nightly publish commits to it. The publish reads the database with the publishable key alone, and that can read nothing about contributions. A check proves it on every run (`studio-maps`, the publish ticket).
- **The kept line is cut short.** After 24 months only the cleaned line, the times and the hintos stay, with 200 m cut from each end of the line, unlinked from the phone.
- **Field rides in the repo.** A recording becomes test data only if it is the owner's own, with its ends trimmed, and the owner says yes. Otherwise the tests use made-up rides.
- **Registration with the National Privacy Commission:** probably not required at this size, but confirm it before the Contributor button goes public, since anyone can then contribute.
- **A new ADR** (0004, drafted in `rule-changes.md`): a commuter's location leaves the phone only on the contributor page, after consent, and is never shown publicly.

## Machine learning (later)

Nothing is trained now. What is kept from day one, at no extra cost:

- the contributions, with their points (24 months), hintos, gaps, and the contributor's own labels (what was ridden, the start and end names);
- **`contribution_use`:** each time an editor uses a contribution to draw a direction or a hintuan, the link. Those are the labelled examples a model needs ("this trace became this direction").

## The real risk: a web page records only while it's on screen

With the screen off, during a call, or with another app in front, Chrome on Android stops giving the page its location. Cheap phones' battery managers (Xiaomi, Oppo, Vivo and realme especially) may also close it. A driver could mount and charge a phone; a passenger locks theirs.

**In the page:**

- The screen stays awake while recording.
- Every point is saved at once; the page resumes when reopened, and the gap is marked.
- Stopped says how much of the ride was lost.
- A mostly dark screen with big text, to save battery.

**If the field test shows too many gaps:** an Android app built around the same web code, recording with the screen off behind a permanent "Recording" notification. It needs a new tool and a way to install it, so it needs the owner's OK. Only the recorder changes; the studio doesn't care how the points were recorded.

## Testing

- The unit checks cover the rules: distance, jumps, hintos, gaps, minutes, the packing of points, the thinned line.
- Recorded rides (the owner's own, trimmed, or made up) are played back through the recorder in the headless suites, which already fake a GPS (`where-test`).

## Build order

The tickets are in `issues/`; the studio's are in `../studio-maps/issues/`.

1. **Field test** (01, being built). A bare page: Start, Stop, Resume, Save, Cancel, points saved on the phone, a download, a gap log. No design, no database.
2. **The owner approves** this plan (02), then the docs and rule changes land (03).
3. **The field test on the road** (04): real rides, the gap log, the first numbers.
4. **Database:** the prerequisites (05), the grants fix from the policy audit (06), Turnstile on the studio's sign-in (07), the contributor tables (08), and the owner switching anonymous sign-in on (09).
5. **The page:** the recorder's rules from the field data (10), the offline shell (11), the four screens from the owner's Figma (12), sending and deleting (13).
6. **The button** on the public map, after the test period (14).
7. **The weekly backup** to R2 (15).

## Open for the owner

- **When is a web page not enough?** Agree it before the field test, or the result will be argued about afterwards. Recommended: when more than 10% of riding minutes are lost to gaps across the test rides.
- **The page's language:** Tagalog, Taglish or English. The design settles it.
- **Field rides as test data:** only your own rides, trimmed 300 m at each end, with your yes. Recommended.
- **The database's open choices** (caps, retention details, backups) are listed in `database.md`.

## Waiting on

- **The owner's design** of the four screens. No designed screen is built before it.
- **The field test's results.**
- **The owner's approval** of `database.md` and `rule-changes.md`.
