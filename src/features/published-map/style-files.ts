import * as z from 'zod/mini';

/**
 * The parts of a basemap style the offline worker warms: each source's
 * TileJSON and the sprite. MapLibre allows the sprite as one address or as a
 * list of named ones.
 */
const styleSchema = z.object({
  sprite: z.optional(z.union([z.string(), z.array(z.object({ id: z.string(), url: z.string() }))])),
  sources: z.optional(z.record(z.string(), z.object({ url: z.optional(z.string()) }))),
});

/**
 * The files a style asks for before its first frame: each source's TileJSON
 * and every sprite's JSON and image at the screen's `scale` ('' or '@2x').
 * None for anything that does not read as a style.
 */
export function styleFiles(style: unknown, scale: string): string[] {
  const parsed = styleSchema.safeParse(style);
  if (!parsed.success) return [];
  const { sprite, sources } = parsed.data;
  const urls: string[] = [];
  for (const source of Object.values(sources ?? {})) if (source.url) urls.push(source.url);
  const sprites = typeof sprite === 'string' ? [sprite] : (sprite ?? []).map((s) => s.url);
  for (const base of sprites.filter(Boolean))
    urls.push(`${base}${scale}.json`, `${base}${scale}.png`);
  return urls;
}
