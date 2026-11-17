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

/** Flags raised in other sites' frames, against those sites' own policies, by the list they skip. */
const foreignFlags = new WeakMap();

/** A frame's origin, or null for one with none of its own (about:blank, srcdoc), which inherits. */
const originOf = (url) => {
  const origin = URL.canParse(url) ? new URL(url).origin : 'null';
  return origin === 'null' ? null : origin;
};

/**
 * Collects every policy violation in the context's pages, as "directive: what
 * was blocked", from now on, into `into` (a new list without one). Only our own
 * documents count: a flag raised in another site's frame (Turnstile's challenge)
 * is against that site's policy, not ours, and is kept apart to be printed as an
 * info line. `allow` passes the addresses a test build alone reaches, such as the
 * tiles stand-in on a loopback port.
 */
export async function watchPolicies(context, { into = [], allow = () => false } = {}) {
  const flagged = into;
  if (!foreignFlags.has(flagged)) foreignFlags.set(flagged, []);
  await context.exposeBinding('__policyFlagged', (source, directive, blocked) => {
    if (allow(blocked)) return;
    const frameOrigin = originOf(source.frame.url());
    const pageOrigin = originOf(source.page.url());
    if (frameOrigin !== null && frameOrigin !== pageOrigin) {
      foreignFlags.get(flagged).push(`${frameOrigin} ${directive}: ${blocked}`);
    } else {
      flagged.push(`${directive}: ${blocked}`);
    }
  });
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__policyFlagged(e.effectiveDirective, e.blockedURI),
    );
  });
  return flagged;
}

/** Each distinct flag, with how often it came. */
const tally = (flags) => {
  const counts = new Map();
  for (const f of flags) counts.set(f, (counts.get(f) ?? 0) + 1);
  return [...counts].map(([f, n]) => (n > 1 ? `${f} (${n}×)` : f));
};

/** One check: nothing flagged; else each distinct flag, with how often it came. */
export function checkPolicies(check, flagged, name = "the pages' content policies flag nothing") {
  for (const line of tally(foreignFlags.get(flagged) ?? [])) {
    console.info(`info  another site's frame flagged its own policy: ${line}`);
  }
  check(name, flagged.length === 0, tally(flagged).join(' | '));
}
