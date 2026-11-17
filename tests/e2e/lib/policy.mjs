// What a page's content policies flag (public/_headers; `vite preview` sends
// them, scripts/node/vite-plugins/preview-policies.ts). A suite that runs on a
// build watches its browser context from the start and checks, at its end,
// that nothing was flagged: the policies are report-only, so a flag stops
// nothing and no other check would notice it.
//
//   const flagged = await watchPolicies(context);
//   await watchPolicies(anotherContext, { into: flagged });
//   …
//   checkPolicies(check, flagged);

/**
 * Collects every policy violation in the context's pages, as "directive: what
 * was blocked", from now on, into `into` (a new list without one). `allow`
 * passes the addresses a test build alone reaches, such as the tiles stand-in
 * on a loopback port.
 */
export async function watchPolicies(context, { into = [], allow = () => false } = {}) {
  const flagged = into;
  await context.exposeBinding('__policyFlagged', (_source, directive, blocked) => {
    if (!allow(blocked)) flagged.push(`${directive}: ${blocked}`);
  });
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__policyFlagged(e.effectiveDirective, e.blockedURI),
    );
  });
  return flagged;
}

/** One check: nothing flagged; else each distinct flag, with how often it came. */
export function checkPolicies(check, flagged, name = "the pages' content policies flag nothing") {
  const counts = new Map();
  for (const f of flagged) counts.set(f, (counts.get(f) ?? 0) + 1);
  check(
    name,
    flagged.length === 0,
    [...counts].map(([f, n]) => (n > 1 ? `${f} (${n}×)` : f)).join(' | '),
  );
}
