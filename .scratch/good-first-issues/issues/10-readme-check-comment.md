# 10: README's `npm run check` comment forgets a step

Status: resolved (#531)
Type: task
Size: tiny
Blocked by: none

## What is wrong

In `README.md`, under "Running it", the line for `npm run check` says it runs "Prettier's check, ESLint, the build with its guards, then the unit checks". But `package.json` defines it as:

```
npm run format:check && npm run lint && npm run docs:architecture:check && npm run build && npm run test:unit
```

The `docs:architecture:check` step (it fails if `docs/architecture.md` is out of date) is missing from the README's list. Contributors hit it when they move files.

## What to do

- Fix the comment on that line so it lists all five steps, in order.
- Add one sentence under the block, or in a comment: if the architecture check fails, run `npm run docs:architecture` and commit the updated `docs/architecture.md`.

Check the claim yourself first: open `package.json` and `scripts/docs/architecture.mjs`.

## Done looks like

- the README matches `package.json`
- `npm run format:check` passes

## Where to look

`README.md` ("Running it"), `package.json` (`scripts`).
