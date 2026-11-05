import type { MapLibreMap } from 'maplibre-gl';

export interface StudioReviewProps {
  map: MapLibreMap | null;
  onChanged: () => void;
  /**
   * Where Drafts stands: the studio's top bar on a computer, clear of the map's own controls.
   * Without one it stands on the map, as on a phone, where the top bar is the map switch's.
   */
  buttonSlot?: HTMLElement | null;
}
