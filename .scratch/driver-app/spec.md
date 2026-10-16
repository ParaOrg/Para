# Driver app

## What it is

A page at **`/driver/`** for jeepney drivers the owner knows. Each driver records every **ikot** (the papunta, then the pabalik) on their own phone, with or without signal. It uploads by itself when the phone has signal, and the studio's Tracking map shows it (see `studio-maps`).

**What it's for:** ground truth. The real line, the times and the distances, plus where jeeps stand still (**hintos**). That finds hintuans the map lacks and verifies the lines it has.

**Recorded, not live.** Nobody watches a jeep move, and nothing about drivers reaches the public map. That keeps the owner's earlier worry from coming true (`PLAN.md`, the parked jeep animation): "the user might think that we're tracking jeepneys, or the jeepney is upcoming".

## Words (for `CONTEXT.md`)

- **Driver:** a person the owner has given a driver link. Records ikots. Not an editor. _Avoid_: user.
- **Driver link:** the address that gives a phone its driver code, made by the owner, one per driver.
- **Ikot:** one recording from Start to Save: its papunta, then its pabalik. The drivers' own word ("ilang ikot"). _Avoid_: trip, ride, run, session, round trip.
- **Biyahe:** one leg of an ikot, its papunta or its pabalik. _Avoid_: trip and ride (both taken, see Trip and Ride).
- **Hinto:** the jeep standing still in one spot during a biyahe. Many hintos at one spot, across many ikots, suggest a hintuan. _Avoid_: stop (the glossary avoids it), dwell, idle.

## Who

- Drivers the owner knows personally. **One phone per driver, never shared.**
- All Android, cheap to mid-range, **with mobile data**.
- No account and no password: a driver link each.

## Driver links (instead of sign-in)

- The owner makes one link per driver, `/driver/?code=…`, sent by Messenger or shown as a QR code. The driver opens it once, and the phone keeps the code.
- The code names the driver and the driver's route. A route the map doesn't have yet is first created in Drafts: a route is just its two ends, so no line is needed.
- Uploads go through **one database function**. It takes an ikot only with a valid code, caps its size and the number per day, and tags it with the driver. The publishable key ships in the page, so an open table would let anyone fill it.
- The owner can switch a code off (a lost phone, a leaked link).
- **For now the owner makes codes by hand** in Supabase, as with the editor list. A "make a driver link" button in the studio comes later.

## The recorder

The labels and the look come from the owner's design. The logic:

```
 Ready ──Start──▶ Papunta ──Pabalik──▶ Pabalik ──(parks within ~350 m of where the papunta began)──▶ Done
                    │  ▲                  │  ▲                                                          │
                 Pause Resume          Pause Resume                                            Save / Cancel
                    ▼  │                  ▼  │
                   Paused               Paused ──▶ Save / Cancel (to end early)
```

| Screen | Main button | Others | Shows |
| --- | --- | --- | --- |
| Ready | Start | | The route; GPS ready or waiting; charging or not |
| Papunta | Pabalik (press and hold) | Pause | Distance and time so far, in big text |
| Paused | Resume | Save · Cancel | Paused time is not counted as driving time |
| Pabalik | | Pause | Distance and time so far |
| Done | Save | Cancel | Both legs: distance, time, hintos |

**Rules:**

- **Start always begins the papunta.** The head is where a route's jeeps are based, so a driver's first leg from the base is the outbound. The driver picks nothing; the route comes from the link.
- **Pabalik** is tapped at the far end, parked.
- **Auto-end.** Once the pabalik has run about 1 km, the ikot ends when the jeep **parks** within about 350 m of where this ikot's papunta began. "Parks" means standing still for about a minute inside that zone. It's measured against this recording's own start, not the drawn line, which may not exist yet. The whole pabalik is kept.
- **Done saves itself** after 60 seconds with no tap.
- **Cancel asks first:** "Delete this whole ikot? This can't be undone."
- **Ending after the papunta only** (end of shift): Pause → Save. The pabalik is left empty.
- **Pabalik and Cancel are press and hold** (about 1 second), so a bump or a pocket can't trigger them. Buttons are about 64 px.
- **A forgotten Pabalik:** after 3–5 minutes standing still (likely the far terminal), a big "Pabalik na?" prompt. If it's missed anyway, the raw points show where the jeep turned, and the ikot can be split in the studio.
- **Hintos** are found on both legs, automatically.
- **The app closed mid-ikot:** it reopens still recording. The gap is marked "lost signal", kept apart from the driver's own Pause.
- **GPS warm-up:** cheap phones can take a while to find their position. Ready shows "waiting for GPS" until it has one.

**Driving safety.** The Anti-Distracted Driving Act (RA 10913) bans handling a phone while driving, even at a red light; a mounted phone is allowed. So every tap happens while parked: Start and Pabalik at the terminals, while the end and the save happen by themselves. A phone mount is on the setup checklist.

## History on the phone

- Each ikot: date, start and end time, how long, distance, hintos, uploaded or not. Grouped by day: "Today", "Yesterday", then dates.
- Kept on the phone, so no account is needed. The studio sees every ikot.
- Something useful to the driver too (kilometres per day, say): the owner's design decides.

## Offline and uploads

- **The app opens with no signal.** It has its own offline setup (a service worker and a manifest, scoped to `/driver/`), separate from the public map's. The public map's worker keeps out of `/driver/`, as it keeps out of `/studio/` today.
- **Every GPS point is saved on the phone the moment it arrives** (IndexedDB). A dead battery or a closed app loses nothing recorded up to then.
- **Chrome is asked to keep the app's data** (persistent storage), so a phone low on space doesn't wipe unsent ikots. The unsent count is always shown.
- **Uploads by itself** whenever the phone has signal and the app is open. Each ikot gets an id made on the phone, so a retried upload never makes a duplicate.
- **The saved format carries a version number**, so an ikot recorded on an old version still uploads after an update.
- **An update never reloads the page mid-ikot.**
- **Phone clocks can be wrong:** the server's time is recorded at upload, so a skewed clock can be corrected.
- **Data use:** under 1 MB a day (the driver app has no map), plus a few hundred KB when the app updates.

## What is recorded

**Raw: never edited, never deleted.**

- Every point the phone gives, about one a second: position, time, accuracy, speed. **Not thinned:** passenger stops last 5–15 seconds, and thinning would hide them.
- Start, Pabalik, Pause, Resume and Save, each with its time, and the gaps when the app was closed.

**Cleaned copy:** made from the raw data, and redone whenever the rules improve.

- GPS jumps dropped: points the phone marked inaccurate, or that would need impossible speeds.
- The wait at the terminal before leaving trimmed.
- Snapped to the roads, the way the studio snaps a drawn line.
- Small gaps bridged along the road. The distance stays right; the minutes in the gap are known, but not where the jeep stood still.
- **Hintos:** standing still for about 8–10 seconds or more within about 25 m. These are starting numbers, tuned with the field test's data. The raw data is kept, so every old ikot can be recounted.

## Storage

Supabase's free plan: 500 MB of database and 1 GB of file storage (checked 2026-10-15; check again before building).

- **Raw data:** in a compact format (each point stored as small whole numbers, the change from the point before), as files in Supabase's file storage. About 30 KB per hour of driving. Five drivers at 8 hours a day come to about 1.2 MB a day, so 1 GB lasts about two years.
- **Database:** the summary and the cleaned line of each biyahe.
- It builds on the unused `gps_session` table (0001) or replaces it; that's decided in the database step.
- Free projects pause after 7 days with no activity. Drivers uploading daily keep it awake.

## Privacy

- **A driver's locations are personal data** (Data Privacy Act of 2012). A consent screen at first open says what it's for, who sees it (the owner and the editors only), how long it's kept, and that the driver can ask for deletion.
- **Who reads ikots:** editors only, in the studio. The upload function only writes.
- **Never public.** The repo is public, and the nightly publish commits to it. A check proves that no tracking data lands in the published map.
- **Backups.** As far as known, the free plan has no backups you can restore from, and an ikot can't be driven again. Raw files get a private backup; where is decided in the database step. If that needs a new service, ask first.

## The real risk: a web page records only while it's on screen

With the screen off, during a call, or with another app in front, Chrome on Android stops giving the page its location. Cheap phones' battery managers (Xiaomi, Oppo, Vivo, realme especially) may also close it.

**Phone setup, once per phone, when the owner hands over the link:**

1. A charger in the jeep. A cheap phone with GPS on and the screen awake lasts about 3–5 hours.
2. Settings → Apps → Chrome → Battery → **Unrestricted**.
3. Android's App pinning, so a stray tap can't switch away. Test that calls still come through.
4. A phone mount (see Driving safety).

**In the app:**

- The screen stays awake while recording, asked for again whenever the app comes back.
- Every point is saved at once; the app resumes when reopened, and the gap is marked.
- Small gaps are bridged in the cleaned copy.
- A warning at about 20% battery when the phone isn't charging: "Battery low, plug in to keep recording."
- A mostly dark screen with big text.

**If the field test still shows too many gaps:** an Android app built around the same web code. It records with the screen off and shows a permanent "Recording" notification, like Grab's driver app. It's installed from an APK sent to the drivers, so there's no Play Store review. It needs a new tool, so the owner's OK comes first. Only the recorder changes; the studio doesn't care how the points were recorded.

## Testing

- The unit checks cover the recorder's logic: auto-end, hintos, gaps, the cleaned copy.
- Drives recorded in the field test become test data, played back through the recorder in the headless suites (where-test already fakes a GPS).

## Build order

0. **Field test.** A bare page: Start, Stop, the screen kept awake, points saved on the phone, a button to download them, and a log of every gap. No design and no database. One or two drivers, a day of real ikots, with the phone setup checklist. It decides whether a web page is enough or the Android app is needed, and sets the first hinto and auto-end numbers.
1. **Docs.** The `CONTEXT.md` words, an ADR ("Drivers send their location; commuters never do"), and the `.claude/CLAUDE.md` rule changes (see `.scratch/README.md`).
2. **Database.** Driver codes, the upload function, compact raw storage, summaries, backups.
3. **App shell.** `/driver/` as the build's third page, with its own offline setup, and `scripts/checks/check-build.mjs` proving the public page loads no driver code.
4. **Recorder.** The logic first; the screens from the owner's design.
5. **Upload and history.**

**Later:** a "make a driver link" button in the studio; the Android app, if the field test calls for it.

## Waiting on

- **The owner's design of the driver screens.** It also settles the app's language (Tagalog, Taglish or English). No driver screen is built before it arrives.
- **The field test's results.**
