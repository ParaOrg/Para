// The establishment files' shape (.scratch/establishments, step E3a): establishments.mjs writes
// them with establishmentFiles; establishment-problems.mjs, check.mjs and
// tests/unit/establishment-file-test.mjs read them back.
//
// The places are cut by area into cells (establishment-cells.ts, ESTABLISHMENT_CELL_DEG), each a
// file of its own, so a phone fetches only the cells it looks at. The index carries the landmark
// file's header (JSON has no comments, so the licence and the credit are its first fields) and
// each cell's count, size and hash, so a phone can keep cells and know when one changed. Empty
// cells have no file. A cell holds one establishment per line, so a monthly rebuild reads as a
// diff of the places that changed. A row is an array, not an object, to keep the cells small:
// [id, kind, lng, lat] and, when it has them, its name and its extras.
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ESTABLISHMENT_CELL_DEG,
  establishmentCellOf,
} from '../../src/features/routes/published/establishment-cells.ts';
import { LANDMARK_SOURCE } from '../landmarks/landmark-file.mjs';

export const ESTABLISHMENT_FILE_SCHEMA = 1;
/** The folder the index and the cells are written to, served at /data/establishments/v1/. */
export const ESTABLISHMENT_DIR = 'public/data/establishments/v1';
export const ESTABLISHMENT_INDEX = 'index.json';
/** A cell's ceiling: what a phone fetches for one cell at worst. */
export const ESTABLISHMENT_CELL_MAX_BYTES = 400 * 1024;
/** All cells together: the whole box, were a phone to fetch every cell. */
export const ESTABLISHMENT_TOTAL_MAX_BYTES = 8 * 1024 * 1024;
/**
 * What the owner listed (.scratch/establishments, answer 1), in the order the file keeps them.
 * Schools, hospitals and universities are not here: the landmark file has them.
 */
export const ESTABLISHMENT_KINDS = [
  'atm',
  'bank',
  'pawnshop',
  'remittance',
  'pharmacy',
  'convenience',
  'supermarket',
  'restaurant',
  'fast_food',
  'cafe',
  'fuel',
  'clinic',
  'laundry',
  'toilets',
  'police',
];
export const LICENSE = 'ODbL-1.0';
export const ATTRIBUTION = '© OpenStreetMap contributors';
const LICENSE_NOTE =
  'Derived from OpenStreetMap data, which is available under the Open Database License ' +
  '(https://opendatacommons.org/licenses/odbl/1-0/). Keep the attribution with any copy or ' +
  'anything made from it. Built by scripts/landmarks/build.sh.';
/** Fewer than this many of a kind means the extract or the filter broke. */
export const FEWEST_OF_A_KIND = 20;

/**
 * What a set of establishment files says about itself and what its rows may hold. The OSM files
 * are OSM_FILES; Overture's (scripts/overture/overture-file.mjs, step E3c) are another set in the
 * same shape, in a folder of their own, under their own licence.
 */
export const OSM_FILES = {
  license: LICENSE,
  attribution: ATTRIBUTION,
  licenseNote: LICENSE_NOTE,
  source: LANDMARK_SOURCE,
  /** The header field that names the data's moment. */
  dateKey: 'extract_at',
  kinds: ESTABLISHMENT_KINDS,
  idPattern: /^[nwr]\d+$/,
  idName: 'an OSM id',
  extraKeys: ['brand', 'atm'],
};

/** A row as the file writes it: [id, kind, lng, lat], then the name and the extras when there are any. */
function rowOf({ id, kind, point, name, extras }) {
  const row = [id, kind, point[0], point[1]];
  const hasExtras = extras && Object.keys(extras).length > 0;
  if (name || hasExtras) row.push(name ?? null);
  if (hasExtras) row.push(extras);
  return row;
}

export const sha = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

/** A cell's text: its name, the credit, then one establishment per line. */
function cellText(cell, establishments, attribution) {
  const head = `{\n  "schema": ${ESTABLISHMENT_FILE_SCHEMA},\n  "cell": ${JSON.stringify(cell)},\n  "attribution": ${JSON.stringify(attribution)},\n`;
  const rows = establishments.map((e) => JSON.stringify(rowOf(e)));
  return `${head}  "establishments": [\n    ${rows.join(',\n    ')}\n  ]\n}\n`;
}

/**
 * The files: each cell's text by its name, and the index's text, which lists every cell with its
 * count, size and hash. The establishments keep their order inside each cell; the cells go in
 * name order.
 */
export function establishmentFiles({ extractAt, establishments }, files = OSM_FILES) {
  const byCell = new Map();
  for (const e of establishments) {
    const cell = establishmentCellOf(e.point[0], e.point[1]);
    byCell.set(cell, [...(byCell.get(cell) ?? []), e]);
  }
  const cells = new Map(
    [...byCell.keys()]
      .sort()
      .map((cell) => [cell, cellText(cell, byCell.get(cell), files.attribution)]),
  );
  const header = {
    schema: ESTABLISHMENT_FILE_SCHEMA,
    license: files.license,
    attribution: files.attribution,
    license_note: files.licenseNote,
    source: files.source,
    [files.dateKey]: extractAt,
    cell_deg: ESTABLISHMENT_CELL_DEG,
    kinds: files.kinds,
  };
  const headerLines = Object.entries(header).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  );
  const entries = [...cells].map(([cell, text]) =>
    JSON.stringify({
      cell,
      count: byCell.get(cell).length,
      bytes: Buffer.byteLength(text, 'utf8'),
      hash: sha(text),
    }),
  );
  const index = `{\n${headerLines.join('\n')}\n  "cells": [\n    ${entries.join(',\n    ')}\n  ]\n}\n`;
  return { index, cells };
}

/** The files in `dir` as establishmentFiles makes them: the index's text and each cell's by name. */
export function readEstablishmentFiles(dir) {
  const index = readFileSync(join(dir, ESTABLISHMENT_INDEX), 'utf8');
  const cells = new Map(
    readdirSync(dir)
      .filter((name) => name.endsWith('.json') && name !== ESTABLISHMENT_INDEX)
      .map((name) => [name.slice(0, -'.json'.length), readFileSync(join(dir, name), 'utf8')]),
  );
  return { index, cells };
}

/** Writes the files into `dir`, after removing the files of the build before. */
export function writeEstablishmentFiles(dir, { index, cells }) {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) if (name.endsWith('.json')) rmSync(join(dir, name));
  for (const [cell, text] of cells) writeFileSync(join(dir, `${cell}.json`), text);
  writeFileSync(join(dir, ESTABLISHMENT_INDEX), index);
}
