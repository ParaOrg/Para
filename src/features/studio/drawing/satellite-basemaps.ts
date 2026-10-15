import {
  BASEMAPS,
  DEFAULT_BASEMAP,
  type Basemap,
  type Imagery,
} from '@/features/routes/map/basemap';

/*
 * Satellite is the studio's only (the owner, 2026-10-15): a photo helps
 * trace a route, and commuters keep the drawn maps. Kept here so the photo's
 * host never reaches the public page (scripts/checks/check-build.mjs proves
 * no studio module does).
 *
 * Esri's World Imagery, sharp to z19 over Metro Manila, is the one
 * street-level photo with no key to ask for. Going live needs Esri's free
 * developer key (ArcGIS Location Platform: 2M tiles a month free, checked
 * 2026-10-15), which one editor stays far inside.
 */
const ESRI_WORLD_IMAGERY: Omit<Imagery, 'isLabelled'> = {
  tiles:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
};

/**
 * The public map's designs, then the photo under Positron's street and place
 * names: the one satellite design the owner kept (2026-10-15), the names
 * helping to tell one road from the next while tracing.
 */
export const STUDIO_BASEMAPS: readonly Basemap[] = [
  ...BASEMAPS,
  {
    id: 'satellite',
    label: 'Satellite',
    url: DEFAULT_BASEMAP.url,
    imagery: { ...ESRI_WORLD_IMAGERY, isLabelled: true },
  },
];
