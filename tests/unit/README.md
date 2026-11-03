# Unit checks

Small checks of the app's own functions, run by Node's own test runner. No
browser, no dev server and no database. Every file here that ends in
`-test.mjs` is one.

    npm run test:unit                                                                               # every file
    node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/geo-test.mjs  # one file

Run them from the repo's root. `--experimental-strip-types` lets Node read the
app's TypeScript, and `scripts/node/ts-resolve.mjs` finds the imports the app
writes without a file extension. `npm run check` runs them last.

A file takes `test` from `node:test` and `assert` from `node:assert/strict`,
and imports the code it checks from `src/` with the `.ts` extension, as
`geo-test.mjs` does.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversine } from '../../src/shared/utils/geo.ts';
```

`fixtures/` holds data that several files share, such as a recorded
contribution and a stand-in for the studio's Supabase client.

Name a new file `<what it checks>-test.mjs`, or `npm run test:unit` will not
find it. The `.test.ts` suffix is reserved for tests kept beside their code,
if those are ever adopted (`.claude/CLAUDE.md`, "Naming conventions").
