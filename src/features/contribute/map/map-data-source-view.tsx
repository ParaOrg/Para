import { mapCredits } from '@/features/routes/map/map-attribution';
import { basemapHost } from '@/shared/config/env';

import { MapDataSourceSheet } from './map-data-source-sheet';

interface MapDataSourceViewProps {
  onClose: () => void;
}

/** The Map Data Source sheet with this build's credits: the basemap host decides the tiles' line. */
export function MapDataSourceView({ onClose }: MapDataSourceViewProps) {
  return <MapDataSourceSheet credits={mapCredits(basemapHost)} onClose={onClose} />;
}
