// Where ticket 02's build puts things in the bucket.
export const CURRENT_KEY = 'tiles/current.json';
export const TILES_PREFIX = 'tiles/';
export const ASSETS_PREFIX = 'assets/';

export const STYLE_NAMES = ['positron', 'liberty', 'fiord'] as const;
export type StyleName = (typeof STYLE_NAMES)[number];

export function styleKey(name: StyleName): string {
  return `${ASSETS_PREFIX}styles/${name}.json`;
}
