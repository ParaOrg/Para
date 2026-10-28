// 1. Modules. Walks Vite's manifest from each HTML entry through every chunk it
//    imports, statically or dynamically, and reads which source files went
//    into those chunks (.vite/modules.json, written by the chunkModules plugin
//    in vite.config.ts). No file from src/app/studio/ or src/features/studio/
//    may reach the public page, whatever it contains.

// The design system is domain-free and imports only itself, so it is the
// public page's as much as the studio's: the route list brought its first
// primitives there on 2026-09-28.
const PUBLIC_AREAS = [
  'src/app/public-map/',
  'src/features/routes/',
  'src/features/locator/',
  'src/features/published-map/',
  'src/shared/',
  'src/styles/',
  'src/design-system/',
];
const STUDIO_AREAS = ['src/app/studio/', 'src/features/studio/'];
const CONTRIBUTE_AREAS = ['src/app/contribute/', 'src/features/contribute/'];

export function proveModules(build, check) {
  const {
    commuterFiles,
    contributeFiles,
    contributeOnlyFiles,
    commuterModules,
    studioModules,
    contributeModules,
    packageModules,
  } = build;

  const leakedModules = commuterModules.filter((m) => !PUBLIC_AREAS.some((a) => m.startsWith(a)));
  check(
    `public page (${commuterFiles.length} chunk(s), ${commuterModules.length} of our modules) holds only the public shell, routes, locator, published-map, shared, styles and design-system code`,
    commuterModules.length > 0 && leakedModules.length === 0,
    leakedModules.join(', '),
  );
  check(
    'studio chunks hold src/app/studio/ and src/features/studio/ modules — the module search works',
    STUDIO_AREAS.every((a) => studioModules.some((m) => m.startsWith(a))),
  );

  // The contributors' page (contribute/index.html) is a third front door. The
  // public page loads none of its code (leakedModules above already fails any
  // module outside PUBLIC_AREAS; this names it), and it loads none of the
  // studio's and no Supabase client: a recording stays on the phone.
  check(
    'contribute chunks hold src/app/contribute/ and src/features/contribute/ modules — the module search works',
    CONTRIBUTE_AREAS.every((a) => contributeModules.some((m) => m.startsWith(a))),
  );
  const contributeLeaked = commuterModules.filter((m) =>
    CONTRIBUTE_AREAS.some((a) => m.startsWith(a)),
  );
  check(
    'public page loads no contribute code',
    contributeLeaked.length === 0,
    contributeLeaked.join(', '),
  );
  // The contributors' page draws the ride on the public map's own view, so it
  // loads MapLibre and the shared chunk; but only the chunks the public page
  // already loads, never a copy of its own, and its own code carries no package
  // of MapLibre's.
  const contributeMapChunks = contributeFiles.filter((f) => /\/(maplibre|shared)/.test('/' + f));
  check(
    'contribute page loads MapLibre and the shared code only as the public page loads them, with no copy of its own',
    contributeMapChunks.length > 0 &&
      contributeMapChunks.every((f) => commuterFiles.includes(f)) &&
      !packageModules(contributeOnlyFiles).some((p) => p.startsWith('maplibre-gl')),
    contributeOnlyFiles.join(', '),
  );
  const studioInContribute = contributeModules.filter((m) =>
    STUDIO_AREAS.some((a) => m.startsWith(a)),
  );
  check(
    'contribute page loads no studio code',
    studioInContribute.length === 0,
    studioInContribute.join(', '),
  );
}
