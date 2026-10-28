// 2. Strings, as a second net: the public chunks may not contain words only
//    the editor has —
//      router.project-osrm.org   the route snapper
//      para.draft              the drawing-draft key
//      Sign in to save, Forgot password?, New route, terminal or hintuan,
//      Draw the return trip
//      .supabase.co              the database's address: commuters read the
//                                published map and never call it

const EDITOR_ONLY = [
  'router.project-osrm.org',
  'para.draft',
  'Sign in to save',
  'Forgot password?',
  'New route, terminal or hintuan',
  'Draw the return trip',
  '.supabase.co',
];

export function proveStrings(build, check) {
  const { commuterFiles, contributeFiles, text, commuter, studio, contribute } = build;

  const leaked = EDITOR_ONLY.filter((s) => commuter.includes(s));
  check('public page contains no editor-only string', leaked.length === 0, leaked.join(', '));

  // Its own chunks, not the ones it shares with the public page, whose map reader
  // names route_variant in the published file's fields.
  const contributeOwn = text(contributeFiles.filter((f) => !commuterFiles.includes(f)));
  // The database's address and "Forgot password?" (its own Sign in button) are the editor strings the
  // contributor page needs. What it may not name are the studio's tables and operations.
  const STUDIO_DATA = ['route_variant', 'route_stop', 'claim_draft', 'approve_draft', 'take_down'];
  const leakedToContribute = [
    ...EDITOR_ONLY.filter((s) => s !== '.supabase.co' && s !== 'Forgot password?'),
    ...STUDIO_DATA,
  ].filter((s) => contributeOwn.includes(s));
  check(
    'contribute page contains no editor-only string and names no studio table',
    leakedToContribute.length === 0,
    leakedToContribute.join(', '),
  );
  check(
    'contribute page saves through save_contribution under its own session key — the string search works',
    contribute.includes('save_contribution') && contribute.includes('para.contributor-auth'),
  );
  const studioData = STUDIO_DATA.filter((s) => !studio.includes(s));
  check(
    'studio names every studio table and operation — the string search works',
    studioData.length === 0,
    studioData.length ? 'missing: ' + studioData.join(', ') : '',
  );

  // Turnstile, Cloudflare's bot check, is the studio's sign-in's (and the
  // contributor page's first upload's): commuters never load its script.
  const TURNSTILE = 'challenges.cloudflare.com';
  check(
    'public page loads no Turnstile; the studio and the contributor page carry it — the string search works',
    !commuter.includes(TURNSTILE) && studio.includes(TURNSTILE) && contribute.includes(TURNSTILE),
  );

  const missing = EDITOR_ONLY.filter((s) => !studio.includes(s));
  check(
    'studio contains every marker — the string search works',
    missing.length === 0,
    missing.length ? 'missing: ' + missing.join(', ') : '',
  );
}
