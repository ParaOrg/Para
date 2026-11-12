// How heavy the published index is. A phone downloads the whole index again after every
// publish that changed it, and it grows with every direction drawn, so its weight is reported
// (`npm run health`) and the publish says when it passes a soft maximum. Pure: no files read.
import { gzipSync } from 'node:zlib';

// Gzipped, the index was about 41 kB with 39 directions drawn (2026-11-11). 150 kB is a line
// drawn well before its size is a problem on mobile data: a lighter shape takes weeks to plan
// and release, so the publish warns here, early, and never fails for it.
export const INDEX_SOFT_MAX_GZ_KB = 150;

const bytesOf = (value) => Buffer.byteLength(JSON.stringify(value ?? []));

/**
 * The weight of the index whose file's text is `text`: its bytes raw and gzipped, the gzipped
 * bytes each direction costs, and the directions' (`variants`), the hotspots' (`stops`) and the
 * links' share of the raw bytes, each from 0 to 1.
 */
export function indexWeight(text) {
  const index = JSON.parse(text);
  const rawBytes = Buffer.byteLength(text);
  const gzippedBytes = gzipSync(Buffer.from(text)).length;
  const directions = index.variants?.length ?? 0;
  return {
    rawBytes,
    gzippedBytes,
    directions,
    gzippedBytesPerDirection: directions === 0 ? 0 : gzippedBytes / directions,
    shares: {
      variants: bytesOf(index.variants) / rawBytes,
      stops: bytesOf(index.stops) / rawBytes,
      links: bytesOf(index.links) / rawBytes,
    },
  };
}

/** The workflow warning for an index of `gzippedBytes`, or null at or under the soft maximum. */
export function indexWeightWarning(gzippedBytes) {
  if (gzippedBytes <= INDEX_SOFT_MAX_GZ_KB * 1024) return null;
  const kb = (gzippedBytes / 1024).toFixed(1);
  return `::warning::The published index is ${kb} kB gzipped, over its soft maximum of ${INDEX_SOFT_MAX_GZ_KB} kB. Every phone downloads it again after each publish that changes the map. Nothing failed: tell the owner it is time to plan a lighter index.`;
}
