// Writes the published map into public/data/:
//   index.v5.json      schema 5, what the app reads (MAP_FILE_URL)
//   index.v4.json, index.v3.json, index.json, map.json
//                      the older shapes, for installed apps (publish-map.mjs's header)
//   lines/<id>.json    each direction's full line, with its orange stretches
//   signboards/<name>  each direction's boards
// A line or board is written only when it changed, and the files of directions
// and boards gone are removed, so an unchanged map touches nothing.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { toDirection } from '../../src/features/routes/model/direction-schema.ts';
import { toHotspot } from '../../src/features/routes/model/hotspot-schema.ts';
import { passBoxes } from '../../src/features/routes/model/line-pass.ts';
import { lineFileText } from './line-file.mjs';

/** Where each file goes, under the repository at `root`. */
export function dataPaths(root) {
  const data = join(root, 'public', 'data');
  return {
    map: join(data, 'map.json'),
    v2: join(data, 'index.json'),
    v3: join(data, 'index.v3.json'),
    v4: join(data, 'index.v4.json'),
    v5: join(data, 'index.v5.json'),
    lines: join(data, 'lines'),
    signboards: join(data, 'signboards'),
  };
}

const readJson = (path) => {
  try {
    const text = readFileSync(path, 'utf8');
    return { text, json: JSON.parse(text) };
  } catch {
    return { text: null, json: null };
  }
};

/** The files the last publish wrote, read back: map.json's text, and each shape that has a reader of its own. */
export function readPrevious(paths) {
  const { text: mapText, json: map } = readJson(paths.map);
  return {
    mapText,
    map,
    v3: readJson(paths.v3).json,
    v4: readJson(paths.v4).json,
    v5: readJson(paths.v5).json,
  };
}

/** Writes the five map files, and answers each one's text as it was before, or null. */
export function writeMapFiles(paths, files) {
  mkdirSync(dirname(paths.map), { recursive: true });
  const before = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);
  const previous = {
    v2: before(paths.v2),
    v3: before(paths.v3),
    v4: before(paths.v4),
    v5: before(paths.v5),
  };
  writeFileSync(paths.map, files.map);
  writeFileSync(paths.v2, files.v2);
  writeFileSync(paths.v3, files.v3);
  writeFileSync(paths.v4, files.v4);
  writeFileSync(paths.v5, files.v5);
  return previous;
}

/**
 * A line per drawn direction.
 *
 * With its orange stretches, worked out here once rather than by every
 * phone that lights the line (line-file.mjs): by the app's own rule
 * (src/features/routes/model/line-pass.ts: passBoxes, passBounds,
 * passStretches, hotspotRing, bboxOf, servedBy), on what the app
 * reads — the line as written and the hotspots as rounded in the index,
 * the same stops in every shape, the app reads shape 5 — with the key the app checks them by.
 * The rows are the file's (the database's names); the app's rules read the
 * glossary's, so each is handed over translated (toHotspot, toDirection:
 * the same functions the reader uses).
 */
export function writeLines(paths, variants, stops) {
  const passBoxesOfIndex = passBoxes(stops.map(toHotspot));
  mkdirSync(paths.lines, { recursive: true });
  const lineFiles = new Set();
  let written = 0;
  for (const v of variants) {
    if (!v.shape) continue;
    const path = join(paths.lines, `${v.id}.json`);
    const text = lineFileText(toDirection(v), passBoxesOfIndex);
    lineFiles.add(`${v.id}.json`);
    if (existsSync(path) && readFileSync(path, 'utf8') === text) continue;
    writeFileSync(path, text);
    written++;
  }
  let removed = 0;
  for (const f of readdirSync(paths.lines)) {
    if (f.endsWith('.json') && !lineFiles.has(f)) {
      rmSync(join(paths.lines, f));
      removed++;
    }
  }
  return { files: lineFiles.size, written, removed };
}

/**
 * The boards, beside the lines: written when changed, removed when no
 * direction shows them. Names are uuids, so a board's file never changes
 * under the same name — an edit in the studio is a new one.
 */
export function writeBoards(paths, boardText, boardsOf) {
  mkdirSync(paths.signboards, { recursive: true });
  let written = 0;
  for (const [n, text] of boardText) {
    if (text === null) continue;
    const path = join(paths.signboards, n);
    if (existsSync(path) && readFileSync(path, 'utf8') === text) continue;
    writeFileSync(path, text);
    written++;
  }
  const boardFiles = new Set([...boardsOf.values()].flat());
  let removed = 0;
  for (const f of readdirSync(paths.signboards)) {
    if (f.endsWith('.svg') && !boardFiles.has(f)) {
      rmSync(join(paths.signboards, f));
      removed++;
    }
  }
  return { files: boardFiles.size, written, removed };
}
