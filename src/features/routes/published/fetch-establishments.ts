import {
  establishmentCellSchema,
  establishmentIndexSchema,
  type EstablishmentCell,
  type EstablishmentIndex,
} from './establishment-file-schema';
import {
  overtureCellSchema,
  overtureIndexSchema,
  type OvertureCell,
  type OvertureIndex,
} from './overture-file-schema';

/** Where the establishment files are served (scripts/landmarks/build.sh writes them to public/data/). */
export const ESTABLISHMENT_FILES_URL = '/data/establishments/v1/';
/** Where the Overture place files are served, beside them but never mixed (step E3c). */
export const OVERTURE_FILES_URL = '/data/overture/v1/';

/** One of a folder's files, parsed by `parse`; throws on a failed answer. */
async function readFile<T>(url: string, parse: (raw: unknown) => T): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return parse(await response.json());
}

/** The two reads of one folder of cell files, each kept for the page: what the map's layers call. */
export interface CellFiles<TIndex, TCell> {
  /**
   * The index, read once a page and shared: the cells there are, each with its count, size and
   * hash. Loaded by a layer the first time it is drawn, never by the page itself. A failure is
   * not kept, so the next try asks again.
   */
  fetchIndex: () => Promise<TIndex>;
  /**
   * One cell, read once a page for each hash the index gives it: a cell that changed is read
   * again. The offline worker keeps the files once read. A failure is not kept.
   */
  fetchCell: (cell: string, hash: string) => Promise<TCell>;
}

function cellFiles<TIndex, TCell>(
  folder: string,
  parseIndex: (raw: unknown) => TIndex,
  parseCell: (raw: unknown) => TCell,
): CellFiles<TIndex, TCell> {
  let index: Promise<TIndex> | null = null;
  const cells = new Map<string, { hash: string; read: Promise<TCell> }>();
  return {
    fetchIndex() {
      index ??= readFile(`${folder}index.json`, parseIndex).catch((error: unknown) => {
        index = null;
        throw error;
      });
      return index;
    },
    fetchCell(cell, hash) {
      const kept = cells.get(cell);
      if (kept?.hash === hash) return kept.read;
      const read = readFile(`${folder}${cell}.json`, parseCell).catch((error: unknown) => {
        cells.delete(cell);
        throw error;
      });
      cells.set(cell, { hash, read });
      return read;
    },
  };
}

/** The OSM establishment files (.scratch/establishments, steps E3a and E3b). */
export const establishmentFiles: CellFiles<EstablishmentIndex, EstablishmentCell> = cellFiles(
  ESTABLISHMENT_FILES_URL,
  (raw) => establishmentIndexSchema.parse(raw),
  (raw) => establishmentCellSchema.parse(raw),
);

/** The Overture place files (step E3c). */
export const overtureFiles: CellFiles<OvertureIndex, OvertureCell> = cellFiles(
  OVERTURE_FILES_URL,
  (raw) => overtureIndexSchema.parse(raw),
  (raw) => overtureCellSchema.parse(raw),
);
