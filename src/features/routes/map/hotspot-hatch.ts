import type { HotspotKind } from '../model/hotspots';

export const hatchOf = (kind: HotspotKind) => `hotspot-hatch-${kind}`;

/**
 * The Selected box's stripes (3837:11308): 0.6 px lines of the box's content
 * colour, 16 px apart, rising to the right — a pattern MapLibre repeats in
 * screen pixels, so they keep their spacing at every zoom. Drawn at twice the
 * size for a sharp screen.
 */
export function hatch(hex: string): { width: number; height: number; data: Uint8Array } {
  const size = 32;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Distance, across the line, from the nearest diagonal x + y ≡ 0.
      const along = (x + y + 1) % size;
      const d = Math.min(along, size - along) / Math.SQRT2;
      const a = Math.max(0, Math.min(1, 0.6 + 0.5 - d));
      data.set([r, g, b, Math.round(a * 255)], (y * size + x) * 4);
    }
  }
  return { width: size, height: size, data };
}
