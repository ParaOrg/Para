import { basemapHost } from '@/shared/config/env';

import { mapCredits } from './map-attribution';
import { MapDataSourceSheet } from './map-data-source-sheet';

interface MapDataSourceViewProps {
  /** As the sheet starts down: focus back to the opener. */
  onClose: () => void;
  /** Once the sheet has gone: unmount it. */
  onClosed: () => void;
}

/** The Map Data Source sheet with this build's credits: the basemap host decides the tiles' line. */
export function MapDataSourceView({ onClose, onClosed }: MapDataSourceViewProps) {
  return (
    <MapDataSourceSheet credits={mapCredits(basemapHost)} onClose={onClose} onClosed={onClosed} />
  );
}
