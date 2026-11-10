# 05: Walking routing in the browser (design 2): research

Status: needs-triage (only if the owner wants turn-by-turn walking: question 5)
Type: research
Blocked by: 04

## The question

Can Para route a walk in the browser, using footbridges, from the published map alone (no server, no public routing service at runtime), at a size and speed a mid-range phone takes?

## What to find out

- **The graph.** Its size for Metro Manila, trimmed to the walkable network within about 1 km of a hintuan.
  - Built from today's extract: about 164,000 ways and 550,000 nodes, 13 MB as PBF.
  - Find its size compact, as tiles about 2 km square, and gzipped.
- **The router.** A shortest path in a web worker on a phone-sized CPU, and how long a 1 km walk takes to route.
- **Coverage.** How well OpenStreetMap maps the sidewalks and crossings near ten busy hintuans (Cubao, Quiapo, Monumento, Fairview, Alabang…). Where it is patchy, what the app should say.
- **The cost.** In code (a build step, a worker, a routing module), in tests, and in the owner's design work (a walk on the map, its words).

## Answer

A recommendation, build or not, with the measurements, written under `## Answer` here and in `../README.md`.
