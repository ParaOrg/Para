// 3. No Supabase client: since step 5 the public page reads the published
//    file (/data/index.v5.json and the lines; the index since 2026-09-29), so
//    no module from @supabase may reach it — 54 kB gzipped a commuter does not
//    download (the shared chunk went 375 → 321 kB), and a database the public
//    never touches. The live-table readers live in src/features/studio/data (live.ts and hotspots-read.ts), which
//    ESLint (import-x/no-restricted-paths) keeps out of the public shell and its features by
//    construction; these two checks are the backstop.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function provePackages(build, check) {
  const { dist, modules, commuterFiles, studioFiles, contributeFiles, packageModules } = build;

  const supabaseInCommuter = packageModules(commuterFiles).filter((p) =>
    p.startsWith('@supabase/'),
  );
  check(
    'public page carries no Supabase client',
    supabaseInCommuter.length === 0,
    supabaseInCommuter.join(', '),
  );
  check(
    'studio chunks carry the Supabase client — the package search works',
    packageModules(studioFiles).some((p) => p.startsWith('@supabase/')),
  );
  // The Android app's build (vite.apk.config.ts) is the only one that carries Capacitor, behind
  // `import.meta.env.MODE === 'apk'` in features/contribute/native-app.ts. No web chunk may hold a
  // Capacitor package, nor the bridge's own name ('androidBridge', which only Capacitor's JavaScript
  // mentions), on any page.
  const allChunks = Object.keys(modules);
  const capacitorPackages = packageModules(allChunks).filter((p) => p.startsWith('@capacitor'));
  check(
    'no web chunk carries a Capacitor package',
    capacitorPackages.length === 0,
    capacitorPackages.join(', '),
  );
  // The app's native modules (src/features/contribute/native/) are reached only behind the same mode
  // check, so none may be in a web chunk, whatever their imports are.
  const nativeModules = allChunks.filter((f) =>
    (modules[f] ?? []).some((id) => id.includes('/src/features/contribute/native/')),
  );
  check(
    "no web chunk holds a module of the app's native folder",
    nativeModules.length === 0,
    nativeModules.join(', '),
  );
  check(
    "the contribute feature's own modules are found by that path search",
    allChunks.some((f) =>
      (modules[f] ?? []).some((id) => id.includes('/src/features/contribute/recording-')),
    ),
  );
  const bridgeMentions = allChunks.filter((f) =>
    readFileSync(join(dist, f), 'utf8').includes('androidBridge'),
  );
  check(
    'no web chunk mentions the Android bridge',
    bridgeMentions.length === 0,
    bridgeMentions.join(', '),
  );

  // The contributor page uploads saved recordings, so it carries the client;
  // the strings below hold it to the contributions alone.
  check(
    'contribute page carries the Supabase client to upload with',
    packageModules(contributeFiles).some((p) => p.startsWith('@supabase/')),
  );
}
