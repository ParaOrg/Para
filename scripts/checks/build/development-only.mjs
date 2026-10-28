// No built file may mention the `e2e` test switch, which exists only in
// development builds, nor hand the map out as window.__map, which only
// development builds and the cheap-phone timer's own build do (VITE_EXPOSE_MAP=1,
// scripts/research/phone-speed.mjs).
import { readFileSync } from 'node:fs';

export function proveDevelopmentOnly(build, check) {
  const { dist, walk } = build;

  const E2E = /["'`]e2e["'`]/;
  const mentions = [...walk(dist)]
    .filter((f) => /\.(js|html)$/.test(f))
    .filter((f) => E2E.test(readFileSync(f, 'utf8')))
    .map((f) => f.slice(dist.length + 1));
  check(
    'no production file mentions the e2e test switch',
    mentions.length === 0,
    mentions.join(', '),
  );

  // The map object is the suites' and the timer's (2026-10-04): a build made
  // with VITE_EXPOSE_MAP=1 hands it to the page as window.__map, from its
  // making as window.__mapEarly, and its GL programs as window.__programs (the
  // cheap-phone plan, Step 0), and such a build must never be what a deploy
  // carries.
  const exposing = [...walk(dist)]
    .filter((f) => /\.(js|html)$/.test(f))
    .filter((f) => /__(map|mapEarly|programs)\b/.test(readFileSync(f, 'utf8')))
    .map((f) => f.slice(dist.length + 1));
  check(
    "no production file hands out the map as window.__map (VITE_EXPOSE_MAP is the timer's only)",
    exposing.length === 0,
    exposing.join(', '),
  );
}
