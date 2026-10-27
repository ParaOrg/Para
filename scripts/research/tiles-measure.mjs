// Measures a built PMTiles file: size, tiles per zoom, the z12-14 tile sizes (gzipped) and the
// same tiles from OpenFreeMap, plus the build's time and memory from `/usr/bin/time -v`.
// Usage: node scripts/research/tiles-measure.mjs <file.pmtiles> <summary.json> [time.log]
import { readFileSync, writeFileSync } from 'node:fs';
import { request } from 'node:https';
import { gzipSync } from 'node:zlib';

import { PmtilesFile, tileIdToZxy } from './tiles-pmtiles.mjs';
import { SPOTS, lngLatToTile } from './tiles-spots.mjs';

const [pmtilesPath, summaryPath, timeLogPath] = process.argv.slice(2);
if (!pmtilesPath || !summaryPath) throw new Error('usage: tiles-measure.mjs <file> <summary.json>');

const COMPRESSION_NONE = 1;
const MEASURED_ZOOMS = [12, 13, 14];

const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

const file = new PmtilesFile(pmtilesPath);
const gzippedSize = (bytes, length) =>
  file.header.tileCompression === COMPRESSION_NONE ? gzipSync(bytes).length : length;

const perZoom = new Map();
for (const entry of file.entries()) {
  const [z] = tileIdToZxy(entry.tileId);
  const row = perZoom.get(z) ?? { z, tiles: 0, bytes: 0, sizes: [] };
  row.tiles += 1;
  row.bytes += entry.length;
  if (MEASURED_ZOOMS.includes(z)) {
    row.sizes.push(
      file.header.tileCompression === COMPRESSION_NONE
        ? gzippedSize(file.tile(...tileIdToZxy(entry.tileId)), entry.length)
        : entry.length,
    );
  }
  perZoom.set(z, row);
}
const zooms = [...perZoom.values()]
  .sort((a, b) => a.z - b.z)
  .map(({ z, tiles, bytes, sizes }) => {
    sizes.sort((a, b) => a - b);
    return {
      z,
      tiles,
      gzippedBytes: bytes,
      ...(sizes.length
        ? {
            medianBytes: percentile(sizes, 0.5),
            p95Bytes: percentile(sizes, 0.95),
            largestBytes: sizes.at(-1),
          }
        : {}),
    };
  });

/** A tile fetched from OpenFreeMap as the wire carries it: gzipped bytes. */
function fetchGzipped(url) {
  return new Promise((resolve, reject) => {
    request(url, { headers: { 'accept-encoding': 'gzip' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        if (res.statusCode !== 200) resolve(null);
        else
          resolve(res.headers['content-encoding'] === 'gzip' ? body.length : gzipSync(body).length);
      });
    })
      .on('error', reject)
      .end();
  });
}

async function openFreeMapTemplate() {
  const res = await fetch('https://tiles.openfreemap.org/planet');
  const json = await res.json();
  return json.tiles[0];
}

let openfreemap = { reachable: false, spots: [] };
try {
  const template = await openFreeMapTemplate();
  const spots = [];
  for (const spot of SPOTS) {
    for (const z of MEASURED_ZOOMS) {
      const { x, y } = lngLatToTile(spot.lng, spot.lat, z);
      const ours = file.tile(z, x, y);
      spots.push({
        spot: spot.name,
        z,
        x,
        y,
        openfreemapBytes: await fetchGzipped(
          template.replace('{z}', z).replace('{x}', x).replace('{y}', y),
        ),
        oursBytes: ours ? gzippedSize(ours, ours.length) : null,
      });
    }
  }
  openfreemap = { reachable: true, template, spots };
} catch (error) {
  openfreemap = { reachable: false, error: String(error), spots: [] };
}

let build = null;
if (timeLogPath) {
  const log = readFileSync(timeLogPath, 'utf8');
  const wall = /Elapsed \(wall clock\) time[^:]*: ([\d:.]+)/.exec(log)?.[1];
  const rss = /Maximum resident set size \(kbytes\): (\d+)/.exec(log)?.[1];
  const seconds = wall?.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
  build = {
    wallSeconds: seconds === undefined ? null : Math.round(seconds),
    peakRssMb: rss ? Math.round(Number(rss) / 1024) : null,
  };
}

const summary = {
  builtAt: new Date().toISOString(),
  inputs: {
    planetiler: process.env.PLANETILER_VERSION ?? null,
    extract: process.env.EXTRACT ?? null,
    bbox: process.env.BBOX ?? null,
  },
  file: { bytes: file.bytes, megabytes: Math.round(file.bytes / 1e4) / 100, header: file.header },
  zooms,
  openfreemap,
  build,
};
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
file.close();
console.log(JSON.stringify({ file: summary.file.megabytes, zooms, build }, null, 2));
