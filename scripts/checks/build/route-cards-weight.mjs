// 5b. The route cards' chunk: what the public map and the studio's Playground both draw of the
//     route cards (vite.config.ts's ROUTE_CARDS), kept out of `shared` so the public page's
//     counted budget (weight.mjs) does not grow by them. It holds only those files, no package,
//     both pages load it, and it stays under a small cap of its own.
import { gzipBytes } from '../build-weight.mjs';

/**
 * 4: 2.9 kB gzipped on 2026-11-27, when the studio took the public map's route cards, and a
 * little room for a switch more. A file that drags others in with it is too heavy for it.
 */
const ROUTE_CARDS_MAX_GZ_KB = 4;

/** The files the chunk holds, and nothing else of ours. */
const ROUTE_CARDS_FILES = [
  'src/features/routes/map/use-route-cards.ts',
  'src/features/routes/map/route-card-layer.tsx',
  'src/features/routes/map/route-card-slots.ts',
  'src/features/routes/map/ride-marks.tsx',
  'src/features/routes/map/map-sheet-controls.tsx',
  'src/features/routes/map/map-controls-dock.tsx',
  'src/features/routes/map/use-map-floats.ts',
  'src/features/routes/cards/use-back-closes-cards.ts',
  'src/features/routes/cards/use-back-closes.ts',
  'src/features/routes/cards/list-top-bar.tsx',
];

export function proveRouteCardsWeight(build, check) {
  const { dist, chunksNamed, sourceModules, packageModules, commuterFiles, studioFiles } = build;
  const files = chunksNamed('route-cards').map((c) => c.file);
  const gz = gzipBytes(dist, files);
  check(
    `the route-cards chunk is named, loaded by the public page and the studio, and under ${ROUTE_CARDS_MAX_GZ_KB} kB gzipped`,
    files.length === 1 &&
      commuterFiles.includes(files[0]) &&
      studioFiles.includes(files[0]) &&
      gz < ROUTE_CARDS_MAX_GZ_KB * 1024,
    `${files.join(', ') || 'no chunk named route-cards'}: ${(gz / 1024).toFixed(1)} kB`,
  );
  const ours = sourceModules(files);
  const strays = [
    ...ours.filter((f) => !ROUTE_CARDS_FILES.includes(f)),
    ...ROUTE_CARDS_FILES.filter((f) => !ours.includes(f)).map((f) => `missing ${f}`),
    ...packageModules(files),
  ];
  check(
    'the route-cards chunk holds the route cards both maps draw, and nothing else',
    files.length === 1 && strays.length === 0,
    strays.join(', '),
  );
}
