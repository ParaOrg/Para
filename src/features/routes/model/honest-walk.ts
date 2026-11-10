import type { LngLat } from '@/shared/utils/geo';

/**
 * Go here's honest walking (.scratch/go-here, ticket 05): every walk says what Para knows and no
 * more. Para has no walking paths yet (119), so a walk is a straight line, its length rounded so
 * "about" is honest, and the phone's own maps app is offered for a real path.
 */

/** A straight-line walk's metres, to the nearest 10 and never under 10. */
export function roundedWalkM(distanceM: number): number {
  return Math.max(10, Math.round(distanceM / 10) * 10);
}

/** A walk in words: "About 300 m in a straight line". */
export function walkWords(distanceM: number): string {
  return `About ${roundedWalkM(distanceM)} m in a straight line`;
}

/** Where the walk is handed over: Android, an iPhone or iPad, or a computer's browser. */
export type MapsPlatform = 'android' | 'apple' | 'web';

/** Six decimals: about 10 cm, more than a phone's fix. */
const coordinate = (value: number): string => value.toFixed(6);

/**
 * A link that opens a walk from `from` to `to` in the phone's own maps app (the owner's answer to
 * question 4: no Google, no router at runtime).
 * - Android: a `geo:` link to the destination, which lets the commuter choose their app; the app
 *   plans the walk from where they are.
 * - Apple: Apple Maps' walking directions between the two points.
 * - A computer: openstreetmap.org's walking directions.
 */
export function mapsLink(from: LngLat, to: LngLat, label: string, platform: MapsPlatform): string {
  const [fromLng, fromLat] = from.map(coordinate);
  const [toLng, toLat] = to.map(coordinate);
  if (platform === 'android') {
    return `geo:${toLat},${toLng}?q=${toLat},${toLng}(${encodeURIComponent(label)})`;
  }
  if (platform === 'apple') {
    return `maps://?saddr=${fromLat},${fromLng}&daddr=${toLat},${toLng}&dirflg=w`;
  }
  return (
    'https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot' +
    `&route=${fromLat}%2C${fromLng}%3B${toLat}%2C${toLng}`
  );
}

/** The platform a user agent string names, for `mapsLink`: Android, an Apple phone or tablet, else the web. */
export function mapsPlatformOf(userAgent: string): MapsPlatform {
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'apple';
  return 'web';
}
