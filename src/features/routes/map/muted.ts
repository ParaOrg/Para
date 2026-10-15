import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';

import { recolouredLayer, type Recolour } from './recolour';

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

const mute: Recolour = (c, isName) => ({
  ...c,
  saturation: c.saturation * SATURATION_KEPT,
  lightness: isName ? c.lightness : c.lightness + (100 - c.lightness) * LIGHTER_BY,
});

function mutedLayer(l: LayerSpecification): LayerSpecification {
  if (l.type === 'raster') return { ...l, paint: { ...l.paint, 'raster-saturation': -0.6 } };
  const muted = recolouredLayer(l, mute);
  if (muted.type !== 'symbol' || muted.layout?.['icon-image'] === undefined) return muted;
  return { ...muted, paint: { ...muted.paint, 'icon-opacity': ICON_OPACITY } };
}

/** Liberty, muted. Pure: the input is left alone. */
export function mutedStyle(style: StyleSpecification): StyleSpecification {
  return { ...style, layers: style.layers.map(mutedLayer) };
}
