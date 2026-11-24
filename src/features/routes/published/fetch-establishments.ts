import {
  establishmentCellSchema,
  establishmentIndexSchema,
  type EstablishmentCell,
  type EstablishmentIndex,
} from './establishment-file-schema';

/** Where the establishment files are served (scripts/landmarks/build.sh writes them to public/data/). */
export const ESTABLISHMENT_FILES_URL = '/data/establishments/v1/';

let index: Promise<EstablishmentIndex> | null = null;
/** Each cell read this page, by name, with the hash it was read at. */
const cells = new Map<string, { hash: string; read: Promise<EstablishmentCell> }>();

/** One of the files, parsed by `schema`; throws on a failed answer. */
async function readFile<T>(name: string, parse: (raw: unknown) => T): Promise<T> {
  const url = `${ESTABLISHMENT_FILES_URL}${name}.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return parse(await response.json());
}

/**
 * The establishments' index (.scratch/establishments, step E3a), read once a page and shared:
 * the cells there are, each with its count, size and hash. Loaded by the map's establishment
 * layer the first time it is drawn, never by the page itself. A failure is not kept, so the next
 * try asks again.
 */
export function fetchEstablishmentIndex(): Promise<EstablishmentIndex> {
  index ??= readFile('index', (raw) => establishmentIndexSchema.parse(raw)).catch(
    (error: unknown) => {
      index = null;
      throw error;
    },
  );
  return index;
}

/**
 * One cell's establishments, read once a page for each hash the index gives it: a cell that
 * changed is read again. The offline worker keeps the files once read. A failure is not kept.
 */
export function fetchEstablishmentCell(cell: string, hash: string): Promise<EstablishmentCell> {
  const kept = cells.get(cell);
  if (kept?.hash === hash) return kept.read;
  const read = readFile(cell, (raw) => establishmentCellSchema.parse(raw)).catch(
    (error: unknown) => {
      cells.delete(cell);
      throw error;
    },
  );
  cells.set(cell, { hash, read });
  return read;
}
