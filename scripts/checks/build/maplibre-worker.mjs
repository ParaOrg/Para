// 7. MapLibre's worker (the cheap-phone plan, step 14, 2026-10-05) is a
//    chunk of the page's build, a few kB, that imports MapLibre's shared
//    code from the page's own chunk and nothing else but Vite's preload
//    helper and Rolldown's runtime, all of which the public page loads too.
//    Our shared chunk in its imports would run React and the app in the
//    worker, and the map would not draw.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { MAPLIBRE_FILE, WORKER_MAX_GZ_KB } from '../build-weight.mjs';

const WORKER_MAY_IMPORT = [
  MAPLIBRE_FILE('maplibre-gl-shared'),
  /^\0vite\/preload-helper\.js$/,
  /^\0rolldown\/runtime\.js$/,
];

export function proveMaplibreWorker(build, check) {
  const { dist, manifest, modules, chunksNamed, commuterFiles } = build;

  // Its chunk, and every chunk it imports, all the way down, read from Vite's
  // manifest and from what went into each.
  const workerChunks = chunksNamed('maplibre-gl-worker');
  const workerFile = workerChunks[0]?.file;
  const workerGz = workerFile ? gzipSync(readFileSync(join(dist, workerFile))).length : 0;
  check(
    `MapLibre's worker is a chunk of the build, its own file alone, under ${WORKER_MAX_GZ_KB} kB gzipped`,
    workerChunks.length === 1 &&
      /^assets\/maplibre-gl-worker-[\w-]+\.js$/.test(workerFile) &&
      (modules[workerFile] ?? []).length === 1 &&
      MAPLIBRE_FILE('maplibre-gl-worker').test(modules[workerFile][0]) &&
      workerGz < WORKER_MAX_GZ_KB * 1024,
    `${workerFile ?? 'no chunk named maplibre-gl-worker'}: ${(workerGz / 1024).toFixed(1)} kB`,
  );
  const workerImports = new Set();
  const importsOf = (chunk) => {
    for (const key of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) {
      const c = manifest[key];
      if (c && !workerImports.has(c.file)) {
        workerImports.add(c.file);
        importsOf(c);
      }
    }
  };
  workerChunks.forEach(importsOf);
  const strayInWorker = [...workerImports].flatMap((f) =>
    (modules[f] ?? ['(no modules listed)'])
      .filter((id) => !WORKER_MAY_IMPORT.some((re) => re.test(id)))
      .map((id) => `${f}: ${id.replace('\0', '\\0')}`),
  );
  check(
    "the worker imports MapLibre's shared code from the page's own chunk, and nothing else but Vite's preload helper and Rolldown's runtime: no React, none of our code",
    workerImports.has(chunksNamed('maplibre-gl-shared')[0]?.file) && strayInWorker.length === 0,
    strayInWorker.slice(0, 5).join(', ') || [...workerImports].join(', '),
  );
  const unloaded = [...workerImports].filter((f) => !commuterFiles.includes(f));
  check(
    'the public page loads every chunk the worker imports, so the worker finds each one already downloaded',
    workerImports.size > 0 && unloaded.length === 0,
    unloaded.join(', '),
  );
}
