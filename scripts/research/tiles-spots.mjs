// The three places the spike measures and draws, and the tile maths for them.
export const SPOTS = [
  { id: 'fairview', name: 'SM Fairview', lng: 121.0577, lat: 14.7343 },
  { id: 'quiapo', name: 'Quiapo', lng: 120.9838, lat: 14.5993 },
  { id: 'bgc', name: 'BGC', lng: 121.0455, lat: 14.5504 },
];
export const DESIGNS = ['positron', 'liberty', 'fiord'];
export const ZOOMS = [12, 14, 16];

export function lngLatToTile(lng, lat, z) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { z, x, y };
}
