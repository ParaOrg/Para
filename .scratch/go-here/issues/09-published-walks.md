# 09: Real walks at publish time: design it twice

Status: research (later, 119)
Type: research

## The question

Can Para show real walking paths (sidewalks, crossings, footbridges) without a router at runtime, from files built at publish time?

## The two designs to compare

1. **Walks precomputed at publish time.** Between each hintuan and the places near it, from OpenStreetMap's footways, crossings and footbridges, published per hintuan.
2. **A walking graph in the browser.** Footbridges' ticket 05: tiles of the walkable network, routed in a web worker.

For each: the size, the speed, how honest it is where OpenStreetMap's sidewalks are missing, and what the owner must design (a walk on the map).

## Answer

A recommendation, written here and in `../README.md`, and in footbridges' ticket 05.
