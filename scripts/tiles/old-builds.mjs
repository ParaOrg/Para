// Which tiles builds the upload deletes from the bucket (scripts/tiles/upload.sh), once
// `current.json` has moved. Never the file just uploaded, the one `current.json` points at, nor
// the one it pointed at before (the Worker may still be serving it); of the rest, the newest fill
// the slots left of the builds kept, and the older ones go. Deleting the file `current.json`
// points at would blank every commuter's map.
//
// Usage: <bucket keys> | node scripts/tiles/old-builds.mjs <uploaded file> <current.json> [previous current.json]
// The keys are the bucket listing's, separated by spaces, tabs or lines. Prints the keys to delete,
// one per line; or, when the previous current.json names no build file, an ::error:: and exits 1.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** How many builds the bucket keeps, the new one included. */
export const KEEP = 3;
/** A build's file name: the build date, then the run id. */
export const BUILD_FILE = /^parapo-(\d{4})-(\d{2})-(\d{2})(?:-(\d+))?\.pmtiles$/;

/** Oldest first: by date, then a name with no run id before one with, then by run id. */
function byAge(a, b) {
  const [, ...x] = BUILD_FILE.exec(a.slice('tiles/'.length));
  const [, ...y] = BUILD_FILE.exec(b.slice('tiles/'.length));
  for (let i = 0; i < 4; i++) {
    const d = Number(x[i] ?? -1) - Number(y[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

/**
 * The keys to delete, oldest first. `keys` is the bucket's listing under tiles/; `kept` the build
 * files never to delete. Anything that is not a build file under tiles/ is never chosen.
 */
export function buildsToDelete(keys, kept, keep = KEEP) {
  const protectedKeys = new Set(kept.map((file) => `tiles/${file}`));
  const slots = keep - protectedKeys.size;
  const candidates = keys
    .filter((key) => key.startsWith('tiles/') && BUILD_FILE.test(key.slice('tiles/'.length)))
    .filter((key) => !protectedKeys.has(key))
    .sort(byAge);
  return candidates.slice(0, Math.max(0, candidates.length - Math.max(0, slots)));
}

/** The build file a current.json names. */
export function pointedAt(pointerText) {
  return String(JSON.parse(pointerText).file);
}

function main([uploaded, pointer, previous]) {
  const kept = [uploaded, pointedAt(readFileSync(pointer, 'utf8'))];
  if (previous) {
    const live = pointedAt(readFileSync(previous, 'utf8'));
    if (!BUILD_FILE.test(live)) {
      console.log(
        `::error::The previous current.json names "${live}", which is not a build file. Nothing was deleted.`,
      );
      process.exitCode = 1;
      return;
    }
    kept.push(live);
  }
  const keys = readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
  for (const key of buildsToDelete(keys, kept)) console.log(key);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
