import { basemapHost } from '@/shared/config/env';

import { useHostDrawing } from './basemap-host-drawing';
import { mapCredits } from './map-attribution';
import { MapDataSourceSheet } from './map-data-source-sheet';

interface MapDataSourceViewProps {
  /** As the sheet starts down: focus back to the opener. */
  onClose: () => void;
  /** Once the sheet has gone: unmount it. */
  onClosed: () => void;
}

/**
 * The Map Data Source sheet with the map's credits: the host that draws the basemap decides the
 * tiles' line, this build's unless the map fell back to OpenFreeMap.
 */
export function MapDataSourceView({ onClose, onClosed }: MapDataSourceViewProps) {
  const host = useHostDrawing(basemapHost);
  return <MapDataSourceSheet credits={mapCredits(host)} onClose={onClose} onClosed={onClosed} />;
}
