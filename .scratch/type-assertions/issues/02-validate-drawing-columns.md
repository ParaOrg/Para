# Validate a direction's drawing columns when the studio reads them

Status: needs-triage
Type: task
Priority: low

## Where

`src/features/studio/data/live.ts`, in `withDrawing`:
`controlPoints as DirectionDrawing['controlPoints']` and `segments as
DirectionDrawing['segments']`, each with a single-line lint disable pointing here.

## Why it is kept

The drawing columns (`control_points`, `segments`) are stored as the editor gave them, and no
schema for a segment exists yet. Today the read keeps any array as it is and turns anything
else into an empty list. The assertions say "trust the array".

## What would remove it

Zod schemas for a control point (`[lng, lat]`) and a segment, parsed at the read, with the
types inferred from them.

## What behaviour would change

A row whose arrays hold something else (an old shape, a hand-edited row) loads today and would
then fail to parse: the direction would either not open in the editor or open with no drawing,
depending on how a failure is handled. Before switching, check every live row against the
schema and decide what a bad row does.
