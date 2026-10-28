// The contributor page's service worker, built from src/app/contribute/contribute-sw.ts.
// Its precache is cut from Vite's manifest as the public worker's is
// (scripts/node/offline-worker.ts, manifestTransforms): the chunks contribute/index.html loads, statically
// or lazily, with their stylesheets and fonts, and nothing the public page alone loads.
// scripts/checks/check-build.mjs proves the result from the built file.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { transformWithOxc, type Plugin } from 'vite';

interface ManifestChunk {
  file: string;
  css?: string[];
  assets?: string[];
  imports?: string[];
  dynamicImports?: string[];
}

const PAGE_URL = '/contribute/';
const ENTRY_KEY = 'contribute/index.html';
/** The page's icon: linked from its head, so in no chunk's list. */
const ICON_URL = '/icons/favicon.png';
/** MapLibre's tile worker: a chunk no page imports (maplibreWorkerWithThePage in vite-plugins/maplibre-worker.ts). */
const MAP_WORKER = /^assets\/maplibre-gl-worker-[\w-]+\.js$/;

/** The paths the contributor page needs offline: the page first, the rest sorted. */
export function contributePrecache(manifest: Record<string, ManifestChunk>): string[] {
  if (!manifest[ENTRY_KEY]) throw new Error(`the manifest has no entry "${ENTRY_KEY}"`);
  const keep = new Set<string>();
  const seen = new Set<string>();
  const visit = (key: string) => {
    const chunk = manifest[key];
    if (!chunk || seen.has(key)) return;
    seen.add(key);
    keep.add(chunk.file);
    for (const css of chunk.css ?? []) keep.add(css);
    for (const asset of chunk.assets ?? []) keep.add(asset);
    for (const next of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) visit(next);
  };
  visit(ENTRY_KEY);
  for (const chunk of Object.values(manifest))
    if (MAP_WORKER.test(chunk.file)) keep.add(chunk.file);
  return [PAGE_URL, ICON_URL, ...[...keep].sort().map((file) => `/${file}`)];
}

/** Writes dist/contribute/sw.js once the build and its manifest are out. */
export function contributeWorker(): Plugin {
  let root = process.cwd();
  let outDir = 'dist';
  return {
    name: 'para:contribute-worker',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const manifestPath = join(outDir, '.vite', 'manifest.json');
      if (!existsSync(manifestPath)) {
        throw new Error(`${manifestPath} is missing: the contributor worker has no precache`);
      }
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<
        string,
        ManifestChunk
      >;
      const urls = contributePrecache(manifest);
      const version = createHash('sha256')
        .update(urls.join('\n'))
        .update(readFileSync(join(outDir, ENTRY_KEY)))
        .digest('hex')
        .slice(0, 12);
      const sourcePath = join(root, 'src', 'app', 'contribute', 'contribute-sw.ts');
      const { code } = await transformWithOxc(readFileSync(sourcePath, 'utf8'), sourcePath, {
        lang: 'ts',
      });
      const target = join(outDir, 'contribute', 'sw.js');
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(
        target,
        `const PRECACHE_URLS = ${JSON.stringify(urls)};\n` +
          `const CACHE_NAME = ${JSON.stringify(`para-contribute-${version}`)};\n${code}`,
      );
    },
  };
}
