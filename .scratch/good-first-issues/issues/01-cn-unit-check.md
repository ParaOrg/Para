# 01: A unit check for `cn`

Status: ready-for-human
Type: task
Size: small
Blocked by: none

## What is missing

`cn` joins class names and is used all over the UI, but no file in `tests/unit/` imports it. See `src/shared/utils/cn.ts`.

## What to do

Add `tests/unit/cn-test.mjs`. Copy the shape of `tests/unit/fares-test.mjs` (Node's `node:test` and `node:assert/strict`, importing from `../../src/shared/utils/cn.ts`). Cover:

- strings are joined with one space
- `false`, `null` and `undefined` are dropped
- a conditional such as `isOn && 'bg-brand'` works both ways
- no arguments gives `''`

## Done looks like

- the new file passes: `node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs --test tests/unit/cn-test.mjs`
- `npm run check` passes (the unit suite picks up the file by its name)
- no change to `cn.ts`

## Where to look

`src/shared/utils/cn.ts`, `tests/unit/fares-test.mjs`.
