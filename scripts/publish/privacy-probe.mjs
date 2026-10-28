// Proves on every publish that the key it reads with sees no contributor or
// editor-only row (publish-map.mjs; tests/unit/privacy-probe-test.mjs). The
// publish reads as anon and the files are public, so anything anon can read
// could reach them. A refusal or a table not made yet passes; a row back, or
// an answer that proves nothing (a server error), fails the run.

export const PRIVATE_TABLES = [
  'contributor',
  'contribution',
  'point_batch',
  'hinto',
  'contribution_use',
  'draft',
  'editor_name',
];

/**
 * Why the publish must stop, one line per table, or none.
 * `get(table)` resolves to { status, body } for `<table>?select=*&limit=1`.
 */
export async function privacyLeaks(get, tables = PRIVATE_TABLES) {
  const leaks = [];
  await Promise.all(
    tables.map(async (table) => {
      let answer;
      try {
        answer = await get(table);
      } catch (e) {
        leaks.push(`${table}: could not ask (${e instanceof Error ? e.message : e})`);
        return;
      }
      const { status, body } = answer;
      if (status === 401 || status === 403 || status === 404) return;
      if (status === 200 || status === 206) {
        if (Array.isArray(body) && body.length === 0) return;
        leaks.push(`${table}: the publishable key reads its rows. Not publishing.`);
        return;
      }
      leaks.push(`${table}: answered HTTP ${status}, which proves nothing. Not publishing.`);
    }),
  );
  return leaks.sort();
}
