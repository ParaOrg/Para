// The published map read whole, and the grid the scale suites copy it across
// to make a map of about 5,000 directions, whatever today's holds: the
// budgets are set for that many, so the load stays the same as the map grows.
// copiesFor and shift: scale-test and studio-scale-test. readPublished:
// studio-scale-test and lib/save-studio.mjs.
import { readFileSync } from 'node:fs';

/** How many directions a scale suite's map holds, about: what its budgets are set for. */
const SCALE_DIRECTIONS = 5000;

/** How many copies of a map of `directions` a scale suite makes: PARA_SCALE_COPIES, or enough for SCALE_DIRECTIONS. */
export const copiesFor = (directions) =>
  Number(process.env.PARA_SCALE_COPIES ?? Math.ceil(SCALE_DIRECTIONS / Math.max(1, directions)));

/** Where copy `k` goes, in degrees east and north: 25 copies to a row, 0.03° apart. */
export const shift = (k) => [(k % 25) * 0.03, Math.floor(k / 25) * 0.03];

/** The published map with every line in full: the index, each line from lines/<id>.json beside it. */
export const readPublished = () => {
  const at = (name) =>
    JSON.parse(readFileSync(new URL(`../../../public/data/${name}`, import.meta.url), 'utf8'));
  const index = at('index.v5.json');
  return {
    ...index,
    variants: index.variants.map(({ overview, ...v }) => ({
      ...v,
      shape: overview ? at(`lines/${v.id}.json`).shape : null,
    })),
  };
};
