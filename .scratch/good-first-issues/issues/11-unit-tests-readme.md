# 11: A short README for `tests/unit/`

Status: resolved (#532)
Type: task
Size: small
Blocked by: none

## What is missing

`tests/e2e/` has a README, `tests/unit/` has none. A newcomer who wants to add a unit check has to read an existing test to learn how to run one.

## What to do

Add `tests/unit/README.md`, about 20 lines, plain words:

- what a unit check is here: Node's own test runner, no browser, files named `*-test.mjs`
- how to run all: `npm run test:unit`
- how to run one file: copy the command from the top of `tests/unit/geo-test.mjs` (`node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/geo-test.mjs`)
- the shape of a test: `test` from `node:test`, `assert` from `node:assert/strict`, and importing source from `../../src/...ts`
- that `fixtures/` holds shared test data
- the naming rule: unit checks end in `-test.mjs`; the `.test.ts` suffix is reserved (see `.claude/CLAUDE.md`, "Naming conventions")

Check each claim by opening `package.json` and one test file before you write it.

## Done looks like

- the README exists and every command in it works when copied
- `npm run format:check` passes

## Where to look

`package.json`, `tests/unit/geo-test.mjs`, and `tests/e2e/README.md` for tone.
