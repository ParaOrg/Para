// 5. Weight: the fonts and what both pages share — MapLibre, React and the
//    shared code — each stay under a budget (build-weight.mjs), so neither
//    creeps back unnoticed. The fonts are precached. What both pages share is
//    five chunks, named in vite.config.ts, each with a ceiling of its own:
//    `maplibre`, `maplibre-gl-shared`, `react` and `zod` hold only their
//    packages and import none of our code, and `shared` holds our code; one
//    in the wrong group is too heavy for its ceiling. So a deploy of ours
//    leaves React's name alone, and MapLibre's two unless it starts or stops
//    importing one of MapLibre's exports: Rolldown keeps of MapLibre only what
//    our code imports (vite.config.ts says more), and no check here can tell.
import { FONTS_MAX_KB, GROUPS, SHARED_MAX_GZ_KB, fontBytes, gzipBytes } from '../build-weight.mjs';

// The contribute page's own weight: what it loads beyond the public page's
// chunks: its script only (its stylesheet is not counted), so it stays a page
// for a phone in the field. The map it draws on is the public page's, already
// counted above. What it opens with is held to one budget; the database client,
// loaded only when a recording is uploaded or removed (with signal), to another. The screens the
// page opens by a tap (sign-in, Profile, History) are chunks of their own and count toward neither.
// 31: the onboarding's field primitives, shared with the account pages, and the app check that
// hides Back to the map took it to the edge of 30; the onboarding screens themselves stay lazy.
const CONTRIBUTE_OWN_MAX_GZ_KB = 31;
const CONTRIBUTE_UPLOAD_MAX_GZ_KB = 60;

export function proveWeight(build, check) {
  const { dist, manifest, modules, chunksOf, chunksNamed, sourceModules, packageModules } = build;
  const { commuterFiles, contributeOnlyFiles } = build;

  // The budgets and how they are measured are in build-weight.mjs.
  const fontsBytes = fontBytes(dist);
  check(
    `the fonts weigh under ${FONTS_MAX_KB} kB together`,
    fontsBytes > 0 && fontsBytes < FONTS_MAX_KB * 1024,
    `${(fontsBytes / 1024).toFixed(1)} kB`,
  );

  const vendorFiles = GROUPS.filter((g) => g.vendor).flatMap((g) =>
    chunksNamed(g.name).map((c) => c.file),
  );
  let groupsGz = 0;
  for (const { name, maxGzKb, vendor, packages, only, holds } of GROUPS) {
    const chunks = chunksNamed(name);
    const files = chunks.map((c) => c.file);
    const gz = gzipBytes(dist, files);
    groupsGz += gz;
    check(
      `the ${name} chunk is named, loaded by the public page, and under ${maxGzKb} kB gzipped`,
      files.length === 1 && commuterFiles.includes(files[0]) && gz < maxGzKb * 1024,
      `${files.join(', ') || `no chunk named ${name}`}: ${(gz / 1024).toFixed(1)} kB`,
    );
    const strays = [
      ...packageModules(files).filter((p) => !packages.includes(p)),
      ...(only ? files.flatMap((f) => modules[f] ?? []).filter((id) => !only.test(id)) : []),
    ];
    const ours = vendor ? sourceModules(files) : [];
    // Rolldown's runtime and Vite's preload helper (vite-preload, which a
    // package's dynamic import would bring) are a few helpers each, the same
    // whatever we write.
    const imports = vendor
      ? chunks
          .flatMap((c) => c.imports ?? [])
          .map((k) => manifest[k].file)
          .filter(
            (f) =>
              !vendorFiles.includes(f) &&
              !/^assets\/(rolldown-runtime|vite-preload)-[\w-]+\.js$/.test(f),
          )
      : [];
    check(
      `the ${name} chunk holds ${holds}`,
      files.length === 1 &&
        packageModules(files).length > 0 &&
        strays.length === 0 &&
        (vendor ? ours.length === 0 && imports.length === 0 : sourceModules(files).length > 0),
      [...strays, ...ours, ...imports].join(', '),
    );
  }
  check(
    `MapLibre, React and the shared code are under ${SHARED_MAX_GZ_KB} kB gzipped together`,
    groupsGz < SHARED_MAX_GZ_KB * 1024,
    `${(groupsGz / 1024).toFixed(1)} kB`,
  );

  const contributeOpening = chunksOf('contribute/index.html', { isStaticOnly: true }).filter(
    (f) => !commuterFiles.includes(f),
  );
  const contributeOnDemand = contributeOnlyFiles.filter((f) => !contributeOpening.includes(f));
  const contributeOwnGz = gzipBytes(dist, contributeOpening);
  check(
    `the contribute page opens with under ${CONTRIBUTE_OWN_MAX_GZ_KB} kB gzipped of its own`,
    contributeOpening.length > 0 && contributeOwnGz < CONTRIBUTE_OWN_MAX_GZ_KB * 1024,
    `${contributeOpening.join(', ')}: ${(contributeOwnGz / 1024).toFixed(1)} kB`,
  );
  // What the upload loads on first need is the database client's chunk and what that chunk imports,
  // not every chunk the page can load later: the sign-in, Profile and History screens are loaded
  // by being opened, so they are not part of an upload.
  const clientFiles = contributeOnDemand.filter((f) =>
    packageModules([f]).some((p) => p.startsWith('@supabase/')),
  );
  const contributeUploadFiles = [
    ...new Set(
      Object.entries(manifest)
        .filter(([, chunk]) => clientFiles.includes(chunk.file))
        .flatMap(([key]) => chunksOf(key, { isStaticOnly: true })),
    ),
  ].filter((f) => !contributeOpening.includes(f) && !commuterFiles.includes(f));
  const contributeUploadGz = gzipBytes(dist, contributeUploadFiles);
  check(
    `the contribute page's upload, loaded on first need, is under ${CONTRIBUTE_UPLOAD_MAX_GZ_KB} kB gzipped and holds the client`,
    clientFiles.length > 0 &&
      !packageModules(contributeOpening).some((p) => p.startsWith('@supabase/')) &&
      contributeUploadGz < CONTRIBUTE_UPLOAD_MAX_GZ_KB * 1024,
    `${contributeUploadFiles.join(', ')}: ${(contributeUploadGz / 1024).toFixed(1)} kB`,
  );
}
