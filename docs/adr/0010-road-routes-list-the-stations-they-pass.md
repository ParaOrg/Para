---
status: accepted
date: 2026-11-27
---

# Road routes list the stations they pass

Until now a road route (a jeep, a bus) listed only the hintuans that are not stations, and a line (a train, the ferry, the EDSA Carousel) only its own stations (`servedBy`, `src/features/routes/model/routes.ts`). So a bus from Malaria to PITX, which runs down Taft Avenue beside LRT-1, read Remedios → PITX on its timeline, with nothing between. On 2026-11-27 the owner chose to change the rule rather than draw street hintuans by every station by hand.

## Decision

- A road route stops at every hintuan its line passes, a station's too. A station row reads the station's own name, like any hintuan.
- A line still stops only at its own stations. A train never lists the road hintuans under its track.
- The pass rule itself is unchanged: the line enters the box or comes within 5 m of its edge (`src/features/routes/geo/pass.ts`). On the published map, the Malaria → PITX line enters the United Nations, Pedro Gil, Quirino, Vito Cruz and Gil Puyat station boxes, and the ferry's Quinta Market.
- It stays one rule, `servedBy`, so every reader follows it: the timeline (studio Route Stops, the trip card, the signboard), the links the studio writes (`route_stop`), a ride's start and end, the green stretch, and the publish's map-data check.
- A station gets no babaan side for now. Many road lines do cut a station's box, but whether a jeep rider under a station has a babaan side, and how it looks, is the owner's design call, not part of this decision; on some long platform boxes (Gil Puyat) the line runs through twice and the halves do not make the box.

## Consequences

- **No migration.** No constraint in the database stops a road route from being linked to a station.
- **The stored links lag until they are written again.** A direction's links (`route_stop`, whose `sequence` is the timeline's `index`) are written when the direction or the hintuan is saved in the studio. Until each road direction that passes a station, or each station it passes, is saved again, the studio's Route Stops and the commuter's timeline read the old links. The nightly map-data check then warns "passes … but is not linked to it" for each one. The green stretch is worked out from the rule, not from the links, so it follows the new rule at once.
- **A republish** after the relink carries the new links. The line files' stretches changed with the rule, so this change writes them again (their `passKey` moved), as the nightly publish would.
- **Fares and ride lengths do not change on today's map.** A ride is priced by the metres along its own line, and the line is the same; only where a ride may start and end changes. One case could change one: rows merge by place name, and a ride ends at the last box of its place along the line, so a route passing the road hintuan "Cubao" and later the MRT-3 Cubao box would be priced to the farther box. No direction does this today.
- **Installed apps.** Shapes 1 and 2 of the index leave out every station and every link to one (`scripts/publish/without-lines.mjs`), so the oldest apps see no change. An app that reads shape 3 or later and has not updated lists the stations once the links are republished, since its timeline reads the links; until it updates, its own green stretch leaves the stations out, and a station row it lists has no ride to price: picked as a start or an end, it shows no distance and no fare. Older shapes also miss the line files' worked-out stretches for the road directions past a station (their key now counts the station's box), so those phones work the stretches out themselves.
- **The ferry and the Carousel follow the same rule.** A jeep that passes a ferry station's box (PRFS Quinta Market by Quiapo) lists it, and so would a bus whose line came within 5 m of a Carousel station's box.
