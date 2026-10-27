// Prints summary.json as Markdown, for $GITHUB_STEP_SUMMARY.
// Usage: node scripts/research/tiles-summary.mjs <summary.json> [heading]
import { readFileSync } from 'node:fs';

const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const kb = (n) => (n === null || n === undefined ? '–' : `${(n / 1024).toFixed(1)} kB`);
const lines = [];

lines.push(`## ${process.argv[3] ?? 'Own tiles spike'}`, '');
lines.push(
  `- **File:** ${s.file.megabytes} MB (${s.file.bytes} bytes), zoom ${s.file.header.minZoom}–${s.file.header.maxZoom}, ${s.file.header.addressedTiles} tiles`,
);
if (s.build)
  lines.push(
    `- **Build:** ${s.build.wallSeconds} s wall clock, peak ${s.build.peakRssMb} MB resident`,
  );
if (s.inputs)
  lines.push(
    `- **Inputs:** Planetiler ${s.inputs.planetiler}, extract ${s.inputs.extract}, box ${s.inputs.bbox}`,
  );
lines.push(
  '',
  '### Tiles per zoom (gzipped)',
  '',
  '| z | tiles | total | median | p95 | largest |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
);
for (const z of s.zooms)
  lines.push(
    `| ${z.z} | ${z.tiles} | ${kb(z.gzippedBytes)} | ${kb(z.medianBytes)} | ${kb(z.p95Bytes)} | ${kb(z.largestBytes)} |`,
  );
lines.push('', '### Same tiles, OpenFreeMap and ours (gzipped)', '');
if (s.openfreemap.reachable) {
  lines.push('| spot | tile | OpenFreeMap | ours |', '| --- | --- | ---: | ---: |');
  for (const t of s.openfreemap.spots)
    lines.push(
      `| ${t.spot} | ${t.z}/${t.x}/${t.y} | ${kb(t.openfreemapBytes)} | ${kb(t.oursBytes)} |`,
    );
} else lines.push(`OpenFreeMap was not reachable: ${s.openfreemap.error ?? ''}`);
if (s.render) {
  lines.push(
    '',
    '### Rendered',
    '',
    `${s.render.shots.length} screenshots, ${s.render.sheets.length} side-by-side sheets (OpenFreeMap left, ours right) in the artifact.`,
  );
  const withErrors = s.render.shots.filter((x) => x.errors.length);
  lines.push(`Map errors: ${withErrors.length} of ${s.render.shots.length} renders.`);
  for (const x of withErrors.slice(0, 12))
    lines.push(`- ${x.name}: ${[...new Set(x.errors)].slice(0, 3).join('; ')}`);
  lines.push(
    '',
    '### Fetched from outside our host',
    '',
    '| kind and URL | requests | seen with |',
    '| --- | ---: | --- |',
  );
  for (const r of s.render.outsideRequests)
    lines.push(`| ${r.url} | ${r.requests} | ${r.seenWith.join(', ')} |`);
}
console.log(lines.join('\n'));
