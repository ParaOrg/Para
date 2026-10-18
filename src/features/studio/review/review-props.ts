import type { MapLibreMap } from 'maplibre-gl';

export interface StudioReviewProps {
  map: MapLibreMap | null;
  onChanged: () => void;
}
