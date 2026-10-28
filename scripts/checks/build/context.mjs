// What every proof reads: the built files, Vite's manifest and the source modules
// in each chunk, the chunks each page loads, and the check that counts failures.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { basemapCacheRules } from '../../node/basemap-offline.ts';
import { mapFileConstants } from '../../node/map-file-constants.ts';
import { parseBasemapHost } from '../../../src/shared/config/basemap-host.ts';
import { chunksNamed as chunksIn } from '../build-weight.mjs';

/** A check that prints PASS or FAIL and counts the failures. */
export function createChecker() {
  let failed = 0;
  const check = (name, ok, detail = '') => {
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  };
  return { check, failedCount: () => failed };
}

/** Reads the build in `root`/dist, or exits naming the manifest it is missing. */
export function readBuild(root) {
  const dist = join(root, 'dist');
  const manifestPath = join(dist, '.vite', 'manifest.json');
  const modulesPath = join(dist, '.vite', 'modules.json');
  // The basemap host this build was made for, read as vite.config.ts reads it.
  const basemapHost = parseBasemapHost(loadEnv('production', root, 'VITE_').VITE_BASEMAP_HOST);
  const basemapRules = basemapCacheRules(basemapHost);

  for (const path of [manifestPath, modulesPath]) {
    if (!existsSync(path)) {
      console.log(`FAIL  missing ${path.slice(root.length + 1)} — run vite build first`);
      process.exit(1);
    }
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const modules = JSON.parse(readFileSync(modulesPath, 'utf8'));

  /** Every JS file an entry loads, following imports and dynamic imports. */
  function chunksOf(entryKey, { isStaticOnly = false } = {}) {
    const seen = new Set();
    const files = new Set();
    const visit = (key) => {
      if (seen.has(key)) return;
      seen.add(key);
      const chunk = manifest[key];
      if (!chunk) throw new Error(`manifest has no entry "${key}"`);
      if (chunk.file.endsWith('.js')) files.add(chunk.file);
      const next = [
        ...(chunk.imports ?? []),
        ...(isStaticOnly ? [] : (chunk.dynamicImports ?? [])),
      ];
      for (const k of next) visit(k);
    };
    visit(entryKey);
    return [...files];
  }

  /** Source modules of ours (under src/) inside the given chunks, relative to the repo. */
  function sourceModules(files) {
    const out = new Set();
    for (const file of files) {
      for (const id of modules[file] ?? []) {
        const at = id.indexOf('/src/');
        if (at >= 0 && !id.includes('/node_modules/'))
          out.add(id.slice(at + 1).replace(/\?.*$/, ''));
      }
    }
    return [...out].sort();
  }

  /** Package modules (under node_modules/) inside the given chunks. */
  function packageModules(files) {
    const out = new Set();
    for (const file of files) {
      for (const id of modules[file] ?? []) {
        const m = /\/node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(id);
        if (m) out.add(m[1]);
      }
    }
    return [...out].sort();
  }

  function* walk(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) yield* walk(path);
      else yield path;
    }
  }

  const text = (files) => files.map((f) => readFileSync(join(dist, f), 'utf8')).join('\n');
  const html = (f) => readFileSync(join(dist, f), 'utf8');

  const commuterFiles = chunksOf('index.html');
  const studioFiles = chunksOf('studio/index.html');
  const contributeFiles = chunksOf('contribute/index.html');

  // Read off the file's text by the reader vite.config.ts uses (scripts/node/
  // map-file-constants.ts), which throws naming what is missing.
  let MAP_FILE_URL = null;
  let EARLY_MAP_FILE = null;
  let constantsError = '';
  try {
    ({ MAP_FILE_URL, EARLY_MAP_FILE } = mapFileConstants(
      readFileSync(join(root, 'src', 'features', 'routes', 'published', 'map-file.ts'), 'utf8'),
    ));
  } catch (e) {
    constantsError = e instanceof Error ? e.message : String(e);
  }

  return {
    root,
    dist,
    manifest,
    modules,
    basemapHost,
    basemapRules,
    chunksOf,
    chunksNamed: (name) => chunksIn(manifest, name),
    sourceModules,
    packageModules,
    walk,
    text,
    html,
    commuterFiles,
    studioFiles,
    contributeFiles,
    contributeOnlyFiles: contributeFiles.filter((f) => !commuterFiles.includes(f)),
    commuterModules: sourceModules(commuterFiles),
    studioModules: sourceModules(studioFiles),
    contributeModules: sourceModules(contributeFiles),
    // The worker too: it runs on every visit, and the database's address in
    // it would be the public page asking the database (2026-10-03).
    commuter: text([...commuterFiles, ...(existsSync(join(dist, 'sw.js')) ? ['sw.js'] : [])]),
    studio: text(studioFiles),
    contribute: text(contributeFiles),
    mapFile: { MAP_FILE_URL, EARLY_MAP_FILE, constantsError },
  };
}
