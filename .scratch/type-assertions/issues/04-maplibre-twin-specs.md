# A twin layer's specification: built from a filtered paint, which MapLibre's types cannot check

Status: needs-triage
Type: task
Priority: low

## Where

`src/features/routes/map/`, each with a single-line lint disable pointing here:

- `layer-switch.ts`, in `twinsOf`: `{ type: spec.type, paint } as Twin`.
- `warm-programs.ts`, in `warmPrograms`: `map.addLayer({ ...twin, id, source, filter } as never, bottom)`.

## Why they are kept

A twin is a layer's type and paint, minus the switch (`*-layer-opacity` and its
`-transition`), drawn over a speck so MapLibre compiles its GL program while the map is idle.
The paint is rebuilt with `Object.fromEntries` after filtering, which loses MapLibre's
per-property paint types; and MapLibre's types do not list the `-transition` keys being
dropped. Adding a twin spreads it over the `Twin` union, which TypeScript cannot narrow to
MapLibre's `AddLayerObject`.

## What would remove them

A per-type rebuild (line, fill and circle each with its own branch, taking out the switch's
keys by name), in a file of its own: `layer-switch.ts` and `warm-programs.ts` are at their
long-file baselines. It restructures the code that owns MapLibre's programs, so it is its own
change, not a lint clean-up.

## What behaviour would change

None intended: the same twins, drawn the same way. The risk is in the restructure itself; the
suites' GL-program checks (no program compiled on a tap) and `gl-programs-test` would prove it.
