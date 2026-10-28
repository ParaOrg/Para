// 8. The map file asked for as the root page is read (mapFileEarly in
//    scripts/node/vite-plugins/map-file-early.ts): index.html carries the
//    plain script that asks for MAP_FILE_URL and leaves the request under
//    EARLY_MAP_FILE (both read from map-file.ts), ahead of its module script,
//    preloads and stylesheets; the studio's page has none. Without it the app
//    asks for the file itself, once, and the map opens all the same, only
//    later: no suite would say so.

export function proveEarlyMapFile(build, check) {
  const { html } = build;
  const { MAP_FILE_URL, EARLY_MAP_FILE, constantsError } = build.mapFile;

  check(
    'map-file.ts names the map file and where the root page leaves its request for it — the search below works',
    !!MAP_FILE_URL && !!EARLY_MAP_FILE,
    constantsError || `MAP_FILE_URL ${MAP_FILE_URL}, EARLY_MAP_FILE ${EARLY_MAP_FILE}`,
  );
  if (!MAP_FILE_URL || !EARLY_MAP_FILE) return;
  const head = html('index.html').slice(0, html('index.html').indexOf('</head>'));
  const early = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].find((m) =>
    m[1].includes(`window.${EARLY_MAP_FILE}=`),
  );
  const after = [
    ...head.matchAll(/<script type="module"|<link rel="modulepreload"|<link rel="stylesheet"/g),
  ].map((m) => m.index);
  check(
    `index.html asks for ${MAP_FILE_URL} as it is read: a plain script in its head, ahead of its module script, preloads and stylesheets, leaving the request as window.${EARLY_MAP_FILE}`,
    !!early &&
      early[1].includes(`fetch(${JSON.stringify(MAP_FILE_URL)},`) &&
      after.length > 0 &&
      early.index < Math.min(...after),
    early
      ? `at ${early.index}, the first script or stylesheet at ${Math.min(...after)}`
      : 'no such script',
  );
  const studioPage = html('studio/index.html');
  check(
    'studio/index.html asks for no map file',
    !studioPage.includes(EARLY_MAP_FILE) && !studioPage.includes(MAP_FILE_URL),
  );
  const contributePage = html('contribute/index.html');
  check(
    'contribute/index.html asks for no map file',
    !contributePage.includes(EARLY_MAP_FILE) && !contributePage.includes(MAP_FILE_URL),
  );
}
