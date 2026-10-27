// Downloads what the three basemap styles still fetch from OpenFreeMap: the styles themselves, the
// sprite and the glyph ranges of the fonts the styles use. Fails on any missing file.
// Layout under <dir>: styles/<name>.json, sprites/<file>, fonts/<font>/<range>.pbf — the
// paths the upload puts under `assets/`. The styles are copied as they are; pointing them at our
// host is the Worker ticket's job.
// Usage: node scripts/tiles/fetch-assets.mjs <dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const HOST = 'https://tiles.openfreemap.org';
const STYLES = ['positron', 'liberty', 'fiord'];
const FONTS = ['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic'];
const SPRITE_FILES = ['.json', '.png', '@2x.json', '@2x.png'];
const GLYPH_RANGES = Array.from({ length: 256 }, (_, i) => `${i * 256}-${i * 256 + 255}`);
const PARALLEL = 16;

const [dir] = process.argv.slice(2);
if (!dir) throw new Error('usage: fetch-assets.mjs <dir>');

/** Saves the file under <dir>/<path> and returns its bytes. */
async function download(url, path) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), bytes);
  return bytes;
}

async function runAll(jobs) {
  const queue = [...jobs];
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await job();
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
}

const spriteBases = new Set();
for (const name of STYLES) {
  const style = await download(`${HOST}/styles/${name}`, `styles/${name}.json`);
  spriteBases.add(JSON.parse(style.toString('utf8')).sprite);
}
if (spriteBases.size !== 1)
  throw new Error(`the styles use ${spriteBases.size} sprites, expected 1`);
const [spriteBase] = spriteBases;

const jobs = [
  ...SPRITE_FILES.map((suffix) => () => download(`${spriteBase}${suffix}`, `sprites/ofm${suffix}`)),
  ...FONTS.flatMap((font) =>
    GLYPH_RANGES.map(
      (range) => () =>
        download(
          `${HOST}/fonts/${encodeURIComponent(font)}/${range}.pbf`,
          `fonts/${font}/${range}.pbf`,
        ),
    ),
  ),
];
await runAll(jobs);
console.log(
  `Fetched ${STYLES.length} styles, ${SPRITE_FILES.length} sprite files and ${FONTS.length * GLYPH_RANGES.length} glyph ranges (sprite ${spriteBase}).`,
);
