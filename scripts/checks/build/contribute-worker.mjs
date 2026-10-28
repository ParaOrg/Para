// 4b. The contributor page has a worker of its own (dist/contribute/sw.js, built
//    by scripts/node/contribute-worker.ts), scoped to /contribute/: its precache
//    holds that page's chunks, their CSS and fonts and MapLibre's worker, no
//    chunk only the public page or the studio loads; it waits to be told to
//    update; and only the contributor page registers it.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function proveContributeWorker(build, check) {
  const { dist, manifest, commuterFiles, studioFiles, contributeFiles } = build;
  const { commuter, contribute } = build;

  const contributeSwPath = join(dist, 'contribute', 'sw.js');
  check('contribute/sw.js exists', existsSync(contributeSwPath));
  if (!existsSync(contributeSwPath)) return;
  const csw = readFileSync(contributeSwPath, 'utf8');
  const listed = /^const PRECACHE_URLS = (\[.*\]);$/m.exec(csw)?.[1];
  const stored = listed ? JSON.parse(listed) : [];
  const withStyles = (files) => [
    ...files,
    ...files.flatMap((f) => Object.values(manifest).find((c) => c.file === f)?.css ?? []),
  ];
  const withAssets = (files) => [
    ...withStyles(files),
    ...files.flatMap((f) => Object.values(manifest).find((c) => c.file === f)?.assets ?? []),
  ];
  const contributeNeeds = withAssets(contributeFiles);
  const needed = ['/contribute/', ...contributeNeeds.map((f) => `/${f}`)];
  const absent = needed.filter((u) => !stored.includes(u));
  check(
    `contribute worker's precache holds the page, its ${contributeFiles.length} chunk(s), their CSS and fonts (${stored.length} entries)`,
    stored.length > 0 && absent.length === 0,
    absent.join(', '),
  );
  check(
    "contribute worker's precache holds MapLibre's worker",
    stored.some((u) => /^\/assets\/maplibre-gl-worker-[\w-]+\.js$/.test(u)),
  );
  // What the public page loads and the contributor page does not (the map's own
  // chunks), and what the studio loads and it does not.
  const publicOnly = withStyles(commuterFiles).filter((f) => !contributeNeeds.includes(f));
  const studioOnlyHere = withStyles(studioFiles).filter((f) => !contributeNeeds.includes(f));
  const publicLeak = stored.filter((u) => publicOnly.includes(u.slice(1)));
  check(
    `contribute worker's precache holds no public-only chunk (${publicOnly.length} to keep out)`,
    publicOnly.length > 0 && publicLeak.length === 0,
    publicLeak.join(', '),
  );
  const studioLeak = stored.filter(
    (u) => studioOnlyHere.includes(u.slice(1)) || /^\/(studio\/|\.vite\/|data\/|_headers)/.test(u),
  );
  check(
    `contribute worker's precache holds no studio chunk (${studioOnlyHere.length} to keep out), nothing from studio/, .vite/, data/, and no _headers`,
    studioOnlyHere.length > 0 && studioLeak.length === 0,
    studioLeak.join(', '),
  );
  const unexpected = stored.filter(
    (u) =>
      u !== '/contribute/' &&
      u !== '/icons/favicon.png' &&
      !needed.includes(u) &&
      !/^\/assets\/maplibre-gl-worker-[\w-]+\.js$/.test(u),
  );
  check(
    'contribute worker precaches nothing but the contributor page, its icon, its chunks and MapLibre’s worker',
    unexpected.length === 0,
    unexpected.join(', '),
  );
  const csMsgAt = csw.indexOf('SKIP_WAITING');
  const csSkipAt = csw.indexOf('skipWaiting()');
  check(
    'contribute worker waits to be told to update (one skipWaiting(), inside the SKIP_WAITING handler)',
    csMsgAt >= 0 && csSkipAt > csMsgAt && csw.indexOf('skipWaiting()', csSkipAt + 1) === -1,
  );
  check(
    'contribute worker answers only GET navigations to /contribute/ and the files it stored, with no cache of /data/, the database or the basemap',
    csw.includes('"/contribute/"') &&
      csw.includes('request.method !== "GET"') &&
      !/\/data\/|supabase|openfreemap/.test(csw.replace(/^const PRECACHE_URLS.*$/m, '')),
  );
  check(
    'only the contributor page registers it: its chunks name /contribute/sw.js, the public page and its worker do not',
    contribute.includes('/contribute/sw.js') && !commuter.includes('/contribute/sw.js'),
  );
}
