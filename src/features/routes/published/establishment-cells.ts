/**
 * The grid the establishment files are cut by (.scratch/establishments, step E3a): cells of
 * ESTABLISHMENT_CELL_DEG degrees, each a file of its own, named by its column and row. One
 * definition for the build (scripts/establishments) and the readers, so the two cannot part.
 * No imports, so the build can load it as it is.
 */
export const ESTABLISHMENT_CELL_DEG = 0.05;

/** The cell a point falls in: its column and row, as the cell's file is named (`2421-292`). */
export function establishmentCellOf(lng: number, lat: number): string {
  const column = Math.floor(lng / ESTABLISHMENT_CELL_DEG);
  const row = Math.floor(lat / ESTABLISHMENT_CELL_DEG);
  return `${column}-${row}`;
}
