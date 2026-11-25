# A route draft's mode: a plain string in the payload schema, a TransportMode everywhere else

Status: needs-triage
Type: task
Priority: low

## Where

`src/features/studio/data/route-draft-state.ts`, in `servedRouteOf`:
`mode: mode as ServedRoute['mode']`, with a single-line lint disable pointing here.

## Why it is kept

The route draft's payload schema (`route-draft-schema.ts`) reads `mode` as `z.string()`, so
`RouteDraftRoute.mode` is a `string`; the hintuan rule (`ServedRoute`) takes a `TransportMode`.

## What would remove it

Read `mode` with `transportModeSchema` in the payload schema and type `RouteDraftRoute.mode` as
`TransportMode`.

## What behaviour would change

A stored draft whose mode is not one of the known modes loads today and would then fail to
parse, so it could no longer be opened, reviewed or approved. Before switching, check every
stored draft's mode, and decide what a draft with an unknown mode does.
