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
const GLYPHS_TEMPLATE = `${HOST}/fonts/{fontstack}/{range}.pbf`;
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

// What the styles name must be what this script copies, so a style change upstream fails the build
// instead of leaving the map to fetch from OpenFreeMap again.
const spriteBases = new Set();
const fontStacks = new Set();
for (const name of STYLES) {
  const bytes = await download(`${HOST}/styles/${name}`, `styles/${name}.json`);
  const style = JSON.parse(bytes.toString('utf8'));
  spriteBases.add(style.sprite);
  if (style.glyphs !== GLYPHS_TEMPLATE) {
    throw new Error(`${name} names glyphs at ${style.glyphs}, expected ${GLYPHS_TEMPLATE}`);
  }
  for (const layer of style.layers) {
    const font = layer.layout?.['text-font'];
    if (font === undefined) continue;
    if (!Array.isArray(font) || !font.every((f) => typeof f === 'string')) {
      throw new Error(`${name} layer ${layer.id} has a text-font this script cannot read`);
    }
    font.forEach((f) => fontStacks.add(f));
  }
}
const [spriteBase] = spriteBases;
if (spriteBases.size !== 1 || !spriteBase.endsWith('/ofm')) {
  throw new Error(
    `the styles name sprites ${[...spriteBases].join(', ')}; expected one ending /ofm`,
  );
}
const namedFonts = [...fontStacks].sort().join('|');
if (namedFonts !== [...FONTS].sort().join('|')) {
  throw new Error(`the styles name the fonts ${namedFonts}; this script copies ${FONTS.join('|')}`);
}

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
