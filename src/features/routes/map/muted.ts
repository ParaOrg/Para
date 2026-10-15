import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';

/*
 * Colour, muted (the owner, 2026-10-15: "I love the colors but can we make it
 * more muted so the route line pops"). Liberty's own colours, each kept to
 * its hue with most of its saturation taken out, and its fills and lines
 * lifted a little toward white, so the routes painted over it carry the
 * strongest colour on the map. Names keep their darkness, so they read as
 * before; the coloured place icons are pictures, not colours, so they are
 * quieted by opacity instead; the shaded relief by its saturation.
 *
 * Nothing here is a colour of its own: every colour drawn is one of Liberty's,
 * muted by the three numbers below.
 */

/** How much of a colour's saturation stays. */
const SATURATION_KEPT = 0.4;
/** How far a fill's or a line's lightness moves toward white. */
const LIGHTER_BY = 0.15;
/** Liberty's place icons, which are coloured pictures. */
const ICON_OPACITY = 0.6;

interface Hsla {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
}

const numbers = (list: string): number[] =>
  list
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((n) => Number.parseFloat(n));

function fromRgb(red: number, green: number, blue: number, alpha: number): Hsla {
  const [r, g, b] = [red / 255, green / 255, blue / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const chroma = max - min;
  if (chroma === 0) return { hue: 0, saturation: 0, lightness: lightness * 100, alpha };
  const saturation = chroma / (1 - Math.abs(2 * lightness - 1));
  const sector =
    max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  return {
    hue: (sector * 60 + 360) % 360,
    saturation: saturation * 100,
    lightness: lightness * 100,
    alpha,
  };
}

/** A CSS colour as MapLibre reads it in Liberty — #hex, rgb(a) or hsl(a) — or null for any other string. */
function parseColour(text: string): Hsla | null {
  const colour = text.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(colour)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    const [r, g, b, a = 255] = (full.match(/../g) ?? []).map((h) => Number.parseInt(h, 16));
    return fromRgb(r, g, b, a / 255);
  }
  const rgb = /^rgba?\((.*)\)$/.exec(colour)?.[1];
  if (rgb) {
    const [r, g, b, a = 1] = numbers(rgb);
    return fromRgb(r, g, b, a);
  }
  const hsl = /^hsla?\((.*)\)$/.exec(colour)?.[1];
  if (hsl) {
    const [hue, saturation, lightness, alpha = 1] = numbers(hsl.replaceAll('%', ''));
    return { hue, saturation, lightness, alpha };
  }
  return null;
}

/** One of Liberty's colours, muted: names keep their lightness, everything else is lifted. */
function mute(text: string, isName: boolean): string {
  const c = parseColour(text);
  if (!c) return text;
  const saturation = c.saturation * SATURATION_KEPT;
  const lightness = isName ? c.lightness : c.lightness + (100 - c.lightness) * LIGHTER_BY;
  return `hsla(${c.hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${lightness.toFixed(1)}%, ${c.alpha})`;
}

/**
 * A paint value with every colour in it muted: a plain colour, or the colours
 * inside an expression (a zoom ramp, a match). JSON's reviver visits every
 * string, and the words of an expression are not colours, so they stay.
 */
function mutedValue<T>(value: T, isName: boolean): T {
  return JSON.parse(JSON.stringify(value), (_key, v: unknown) =>
    typeof v === 'string' ? mute(v, isName) : v,
  );
}

const isColour = (property: string): boolean => property.endsWith('-color');

function mutedLayer(l: LayerSpecification): LayerSpecification {
  if (l.type === 'raster') return { ...l, paint: { ...l.paint, 'raster-saturation': -0.6 } };
  if (!('paint' in l) || !l.paint) return l;
  const paint = Object.fromEntries(
    Object.entries(l.paint).map(([property, value]: [string, unknown]) => [
      property,
      isColour(property) ? mutedValue(value, property === 'text-color') : value,
    ]),
  );
  const hasIcon = l.type === 'symbol' && l.layout?.['icon-image'] !== undefined;
  return { ...l, paint: hasIcon ? { ...paint, 'icon-opacity': ICON_OPACITY } : paint };
}

/** Liberty, muted. Pure: the input is left alone. */
export function mutedStyle(style: StyleSpecification): StyleSpecification {
  return { ...style, layers: style.layers.map(mutedLayer) };
}
