import { OPENFREEMAP_HOST } from '@/shared/config/basemap-host';

/** One line of the map's credits: whose it is, what of the map it is, and where to read more. */
export interface MapCredit {
  title: string;
  /** What of the map it is; none on a link that credits no one (Improve map). */
  description?: string;
  href: string;
  /** A credit the licences ask for, which the map's corner shows too; not a link to act on. */
  isCredit: boolean;
}

/**
 * The map's credits, the one place they are kept: the contributor page's Map
 * Data Source sheet lists them all, and the map's corner elsewhere shows the
 * credits among them (mapAttribution). The route data's credit is the ODbL's:
 * every copy has to keep it. Our tiles server's styles carry none on their
 * sources (workers/tiles), so these are the whole of it. With OpenFreeMap's
 * tiles OpenFreeMap is credited; with ours it is not the provider, but the
 * schema and the styles are still OpenMapTiles', so that credit is spelled out.
 */
export function mapCredits(basemapHost: string): readonly MapCredit[] {
  const isOpenFreeMap = basemapHost === OPENFREEMAP_HOST;
  return [
    {
      title: '© Para contributors · ODbL',
      description: 'Jeepney, bus and train routes, drawn by Para’s riders',
      href: 'https://github.com/ParaOrg/Para#data-and-licence',
      isCredit: true,
    },
    {
      title: '© OpenStreetMap contributors',
      description: 'Streets, places and buildings',
      href: 'https://www.openstreetmap.org/copyright',
      isCredit: true,
    },
    {
      title: isOpenFreeMap ? 'OpenFreeMap' : '© OpenMapTiles',
      description: 'How the map is drawn and styled',
      href: isOpenFreeMap ? 'https://openfreemap.org' : 'https://openmaptiles.org',
      isCredit: true,
    },
    {
      title: 'OSRM',
      description: 'Fits routes onto the roads',
      href: 'https://project-osrm.org',
      isCredit: true,
    },
    {
      title: 'Improve map',
      href: 'https://www.openstreetmap.org/fixthemap',
      isCredit: false,
    },
  ];
}

/** The credits in the map's corner, as MapLibre's attribution control takes them: one line of links. */
export function mapAttribution(basemapHost: string): string {
  return mapCredits(basemapHost)
    .filter((credit) => credit.isCredit)
    .map(({ href, title }) => `<a href="${href}" target="_blank" rel="noreferrer">${title}</a>`)
    .join(' | ');
}
