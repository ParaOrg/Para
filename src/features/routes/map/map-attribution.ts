import { OPENFREEMAP_HOST } from '@/shared/config/basemap-host';

const link = (href: string, text: string, after = ''): string =>
  `<a href="${href}" target="_blank" rel="noreferrer">${text}</a>${after}`;

const ROUTE_DATA = link(
  'https://github.com/ParaOrg/Para#data-and-licence',
  'Route data © ParaPo contributors, ODbL',
);
const OSM = link('https://www.openstreetmap.org/copyright', '© OpenStreetMap', ' contributors');
const OSRM = link('http://project-osrm.org/', 'OSRM');

/**
 * The credits in the map's corner. The styles' sources ship none from OpenFreeMap, so
 * MapLibre's default control would render empty; our own tiles server puts
 * "© OpenMapTiles © OpenStreetMap contributors" on its source, which stays beside these.
 * The route data's credit is the ODbL's: every copy has to keep it. With OpenFreeMap's
 * tiles OpenFreeMap is credited; with ours it is not the provider, but the schema and
 * the styles are still OpenMapTiles', so that credit is spelled out here too.
 */
export function mapAttribution(basemapHost: string): string {
  const provider =
    basemapHost === OPENFREEMAP_HOST
      ? link('https://openfreemap.org', 'OpenFreeMap')
      : link('https://openmaptiles.org', '© OpenMapTiles');
  return [ROUTE_DATA, OSM, provider, OSRM].join(' · ');
}
